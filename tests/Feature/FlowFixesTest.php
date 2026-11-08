<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\FundSource;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Receivable;
use App\Models\SavingGoal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class FlowFixesTest extends TestCase
{
    use RefreshDatabase;

    private function setUpUser(): array
    {
        $user = User::factory()->create(['name' => 'Sinta']);
        $cash = FundSource::create(['user_id' => $user->id, 'name' => 'Cash', 'type' => 'cash', 'opening_balance_minor' => 1_000_000, 'opening_date' => '2026-01-01']);
        $bank = FundSource::create(['user_id' => $user->id, 'name' => 'Bank', 'type' => 'bank', 'opening_balance_minor' => 0, 'opening_date' => '2026-01-01']);

        return [$user, $cash, $bank];
    }

    private function balance(FundSource $source): int
    {
        return $source->opening_balance_minor + (int) JournalLine::where('account_type', 'fund_source')->where('account_id', $source->id)->sum(\DB::raw('debit_minor - credit_minor'));
    }

    public function test_transfer_cannot_be_edited_into_an_expense(): void
    {
        [$user, $cash, $bank] = $this->setUpUser();
        $category = Category::create(['user_id' => $user->id, 'type' => 'expense', 'name' => 'Makan', 'bucket' => 'essential']);
        $this->actingAs($user)->post('/transfers', ['from_fund_source_id' => $cash->id, 'to_fund_source_id' => $bank->id, 'amount_minor' => 200_000, 'effective_date' => '2026-10-01']);
        $entry = JournalEntry::where('type', 'transfer')->firstOrFail();

        $this->actingAs($user)->put("/transactions/{$entry->public_id}", [
            'type' => 'expense', 'amount_minor' => 200_000, 'fund_source_id' => $cash->id, 'category_id' => $category->id,
            'effective_date' => '2026-10-01', 'description' => 'x',
        ])->assertStatus(422);

        $this->assertSame('transfer', $entry->fresh()->type);
        $this->assertSame(800_000, $this->balance($cash));
        $this->assertSame(200_000, $this->balance($bank));
    }

    public function test_deleting_a_receivable_payment_restores_outstanding(): void
    {
        [$user, $cash] = $this->setUpUser();
        $this->actingAs($user)->post('/receivables', ['counterparty' => 'Budi', 'fund_source_id' => $cash->id, 'principal_minor' => 300_000, 'issued_at' => '2026-10-01']);
        $receivable = Receivable::firstOrFail();
        $this->actingAs($user)->post("/receivables/{$receivable->id}/payments", ['fund_source_id' => $cash->id, 'principal_minor' => 300_000, 'paid_at' => '2026-10-05']);
        $this->assertSame('paid', $receivable->fresh()->status);

        $payment = JournalEntry::where('type', 'receivable_payment')->firstOrFail();
        $this->actingAs($user)->delete("/transactions/{$payment->public_id}")->assertSessionHasNoErrors();

        $receivable->refresh();
        $this->assertSame(300_000, $receivable->outstanding_minor);
        $this->assertSame('active', $receivable->status);
        $this->assertSame(700_000, $this->balance($cash));
    }

    public function test_receivable_with_payments_cannot_be_deleted_from_its_issue_entry(): void
    {
        [$user, $cash] = $this->setUpUser();
        $this->actingAs($user)->post('/receivables', ['counterparty' => 'Budi', 'fund_source_id' => $cash->id, 'principal_minor' => 300_000, 'issued_at' => '2026-10-01']);
        $receivable = Receivable::firstOrFail();
        $this->actingAs($user)->post("/receivables/{$receivable->id}/payments", ['fund_source_id' => $cash->id, 'principal_minor' => 100_000, 'paid_at' => '2026-10-05']);

        $issue = JournalEntry::where('type', 'receivable_issue')->firstOrFail();
        $this->actingAs($user)->delete("/transactions/{$issue->public_id}")->assertSessionHasErrors('transaction');

        $this->assertDatabaseHas('receivables', ['id' => $receivable->id, 'outstanding_minor' => 200_000]);
        $this->assertSame(800_000, $this->balance($cash));
    }

    public function test_receivable_cannot_be_overpaid(): void
    {
        [$user, $cash] = $this->setUpUser();
        $this->actingAs($user)->post('/receivables', ['counterparty' => 'Budi', 'fund_source_id' => $cash->id, 'principal_minor' => 100_000, 'issued_at' => '2026-10-01']);
        $receivable = Receivable::firstOrFail();
        $pay = ['fund_source_id' => $cash->id, 'principal_minor' => 100_000, 'paid_at' => '2026-10-05'];

        $this->actingAs($user)->post("/receivables/{$receivable->id}/payments", $pay)->assertSessionHasNoErrors();
        $this->actingAs($user)->post("/receivables/{$receivable->id}/payments", $pay)->assertSessionHasErrors('principal_minor');

        $this->assertSame(0, $receivable->fresh()->outstanding_minor);
        $this->assertSame(1, JournalEntry::where('type', 'receivable_payment')->count());
    }

    public function test_duplicate_transfer_submit_is_idempotent(): void
    {
        [$user, $cash, $bank] = $this->setUpUser();
        $payload = ['from_fund_source_id' => $cash->id, 'to_fund_source_id' => $bank->id, 'amount_minor' => 50_000, 'effective_date' => '2026-10-01', 'idempotency_key' => '6f1c3f8e-3b1a-4c33-9b51-0a8e2f9a7c11'];

        $this->actingAs($user)->post('/transfers', $payload)->assertRedirect();
        $this->actingAs($user)->post('/transfers', $payload)->assertRedirect();

        $this->assertSame(1, JournalEntry::where('type', 'transfer')->count());
    }

    public function test_duplicate_savings_deposit_submit_is_idempotent(): void
    {
        [$user, $cash] = $this->setUpUser();
        $goal = SavingGoal::create(['user_id' => $user->id, 'name' => 'Darurat', 'target_minor' => 1_000_000]);
        $payload = ['direction' => 'deposit', 'fund_source_id' => $cash->id, 'amount_minor' => 100_000, 'effective_date' => '2026-10-01', 'idempotency_key' => '0b6f9c2e-7d4a-4f1e-9c3b-5a2d8e1f4c77'];

        $this->actingAs($user)->post("/savings/{$goal->id}/movements", $payload)->assertSessionHasNoErrors();
        $this->actingAs($user)->post("/savings/{$goal->id}/movements", $payload)->assertSessionHasNoErrors();
        $this->actingAs($user)->post("/savings/{$goal->id}/movements", [...$payload, 'idempotency_key' => null])->assertSessionHasNoErrors();

        $this->assertSame(2, JournalEntry::where('type', 'savings_deposit')->count());
        $this->assertSame(800_000, $this->balance($cash));
    }

    public function test_adjust_balance_posts_the_difference_as_selisih(): void
    {
        [$user, $cash] = $this->setUpUser();

        // saldo app 1.000.000, uang asli 970.000 -> pengeluaran 30.000
        $this->actingAs($user)->post("/fund-sources/{$cash->id}/adjust", ['actual_balance_minor' => 970_000])->assertSessionHasNoErrors();
        $this->assertSame(970_000, $this->balance($cash));
        $expense = JournalEntry::where('type', 'expense')->firstOrFail();
        $this->assertSame(30_000, $expense->amount_minor);
        $this->assertFalse($expense->is_recurring);
        $this->assertDatabaseHas('categories', ['user_id' => $user->id, 'type' => 'expense', 'name' => 'Selisih / Lupa']);

        // uang asli ternyata 1.000.000 -> pemasukan 30.000, bukan gaji rutin
        $this->actingAs($user)->post("/fund-sources/{$cash->id}/adjust", ['actual_balance_minor' => 1_000_000])->assertSessionHasNoErrors();
        $this->assertSame(1_000_000, $this->balance($cash));
        $this->assertFalse(JournalEntry::where('type', 'income')->firstOrFail()->is_recurring);

        // sudah sama -> ditolak, tidak ada entry baru
        $this->actingAs($user)->post("/fund-sources/{$cash->id}/adjust", ['actual_balance_minor' => 1_000_000])->assertSessionHasErrors('actual_balance_minor');
        $this->assertSame(2, JournalEntry::count());

        // dompet orang lain -> 404
        $other = User::factory()->create();
        $this->actingAs($other)->post("/fund-sources/{$cash->id}/adjust", ['actual_balance_minor' => 5])->assertNotFound();
    }

    public function test_savings_history_uses_owner_name_instead_of_hardcoded_person(): void
    {
        [$user, $cash] = $this->setUpUser();
        $goal = SavingGoal::create(['user_id' => $user->id, 'name' => 'Darurat', 'target_minor' => 1_000_000]);
        $this->actingAs($user)->post("/savings/{$goal->id}/movements", ['direction' => 'deposit', 'fund_source_id' => $cash->id, 'amount_minor' => 100_000, 'effective_date' => '2026-10-01']);

        $this->actingAs($user)->get('/tabungan')->assertInertia(fn (Assert $page) => $page
            ->where('savingGoals.0.history.0.person', 'Sinta'));
    }

    public function test_fund_source_can_be_renamed_and_archived_without_touching_opening_balance(): void
    {
        [$user, $cash] = $this->setUpUser();
        $this->actingAs($user)->put("/fund-sources/{$cash->id}", ['name' => 'Dompet', 'type' => 'cash', 'is_active' => false, 'opening_balance_minor' => 5])->assertSessionHasNoErrors();

        $cash->refresh();
        $this->assertSame('Dompet', $cash->name);
        $this->assertFalse($cash->is_active);
        $this->assertSame(1_000_000, $cash->opening_balance_minor);
    }

    public function test_report_income_categories_add_up_to_income_summary(): void
    {
        [$user, $cash] = $this->setUpUser();
        $salary = Category::create(['user_id' => $user->id, 'type' => 'income', 'name' => 'Gaji', 'bucket' => 'income']);
        $this->actingAs($user)->post('/transactions', ['type' => 'income', 'amount_minor' => 5_000_000, 'fund_source_id' => $cash->id, 'category_id' => $salary->id, 'effective_date' => '2026-10-01', 'description' => 'Gaji']);
        $this->actingAs($user)->post('/receivables', ['counterparty' => 'Budi', 'fund_source_id' => $cash->id, 'principal_minor' => 100_000, 'issued_at' => '2026-10-02']);
        $receivable = Receivable::firstOrFail();
        // bunga kasbon: bukan pemasukan rutin, tidak boleh muncul di kategori tanpa ikut di total
        $this->actingAs($user)->post("/receivables/{$receivable->id}/payments", ['fund_source_id' => $cash->id, 'principal_minor' => 100_000, 'interest_minor' => 10_000, 'paid_at' => '2026-10-03']);

        $this->actingAs($user)->get('/reports?from=2026-10-01&to=2026-10-31')->assertInertia(function (Assert $page) {
            $props = $page->toArray()['props'];
            $this->assertSame($props['summary']['income'], (int) collect($props['incomeByCategory'])->sum('total'));
        });
    }

    public function test_excel_export_contains_every_sheet(): void
    {
        [$user, $cash] = $this->setUpUser();
        $food = Category::create(['user_id' => $user->id, 'type' => 'expense', 'name' => 'Makan', 'bucket' => 'essential']);
        $this->actingAs($user)->post('/transactions', ['type' => 'expense', 'amount_minor' => 25_000, 'fund_source_id' => $cash->id, 'category_id' => $food->id, 'effective_date' => '2026-10-10', 'description' => 'Nasi padang']);

        $response = $this->actingAs($user)->get('/exports/finance.xlsx?from=2026-10-01&to=2026-10-31')->assertOk();
        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $response->streamedContent());
        $book = IOFactory::load($path);

        $this->assertSame(['Ringkasan', 'Bulanan', 'Transaksi', 'Analisis', 'Sumber Dana', 'Tabungan', 'Kasbon', 'Pinjaman'], $book->getSheetNames());
        $row = $book->getSheetByName('Transaksi')->rangeToArray('B2:I2', null, true, false)[0];
        $this->assertSame(['Pengeluaran', 'Makan', 'Cash', null, 'Nasi padang', null, null, 25000], array_map(fn ($v) => is_numeric($v) ? (int) $v : $v, $row));
        $this->assertSame(975000, (int) $book->getSheetByName('Sumber Dana')->getCell('E3')->getValue());
        @unlink($path);
    }
}
