<?php

namespace App\Http\Controllers;

use App\Models\FundSource;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\LoanPayable;
use App\Models\Receivable;
use App\Models\SavingGoal;
use App\Models\User;
use App\Services\LedgerService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PlanningController extends Controller
{
    public function index(): RedirectResponse
    {
        // halaman gabungan lama dipecah ke /tabungan dan /kasbon (pinjaman ikut di /kasbon)
        return redirect()->route('kasbon.index');
    }

    public function savings(Request $request): Response
    {
        [$fundSources, $savingGoals] = $this->savingsData($request->user());

        return Inertia::render('tabungan/index', [
            'fundSources' => $fundSources,
            'savingGoals' => $savingGoals,
        ]);
    }

    public function kasbon(Request $request): Response
    {
        $userId = (int) $request->user()->id;

        return Inertia::render('kasbon/index', [
            'fundSources' => FundSource::ownedBy($userId)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type', 'color']),
            'receivables' => Receivable::where('user_id', $userId)->with('payments')->latest('issued_at')->get(),
            'loans' => LoanPayable::where('user_id', $userId)->with('payments')->latest('received_at')->get(),
        ]);
    }

    private function savingsData(User $user): array
    {
        $userId = (int) $user->id;
        $goals = SavingGoal::where('user_id', $userId)->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")->get();
        $goalIds = $goals->pluck('id');
        $movements = JournalLine::query()
            ->select('account_id', DB::raw('SUM(debit_minor - credit_minor) AS movement'))
            ->where('account_type', 'saving')->whereIn('account_id', $goalIds)
            ->whereHas('entry', fn ($query) => $query->ownedBy($userId)->where('status', 'posted'))
            ->groupBy('account_id')->pluck('movement', 'account_id');

        $history = JournalEntry::ownedBy($userId)->with('lines:id,journal_entry_id,account_type,account_id')->where('status', 'posted')
            ->whereIn('type', ['savings_deposit', 'savings_withdrawal'])->latest('effective_date')->latest('id')->get()
            ->map(fn (JournalEntry $entry) => [
                'goal_id' => $entry->lines->firstWhere('account_type', 'saving')?->account_id,
                'type' => $entry->type,
                'amount' => $entry->amount_minor,
                'date' => $entry->effective_date->toDateString(),
                'person' => $entry->counterparty ?: $user->name,
                'source' => $entry->lines->firstWhere('account_type', 'external_contribution') ? 'Dari luar' : 'Sumber dana',
                'description' => $entry->description,
            ])->groupBy('goal_id');

        return [
            FundSource::ownedBy($userId)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type', 'color']),
            $goals->map(fn (SavingGoal $goal) => [
                ...$goal->only(['id', 'name', 'target_minor', 'target_date', 'color', 'status']),
                'balance' => $goal->opening_balance_minor + (int) ($movements[$goal->id] ?? 0),
                'history' => $history->get($goal->id, collect())->values(),
            ]),
        ];
    }

    public function storeSaving(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'target_minor' => ['required', 'integer', 'min:1'],
            'opening_balance_minor' => ['nullable', 'integer', 'min:0'],
            'target_date' => ['nullable', 'date'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);
        SavingGoal::create([...$data, 'opening_balance_minor' => $data['opening_balance_minor'] ?? 0, 'user_id' => $request->user()->id]);

        return back()->with('success', __('Target tabungan berhasil dibuat.'));
    }

    public function moveSaving(Request $request, SavingGoal $savingGoal, LedgerService $ledger): RedirectResponse
    {
        abort_unless($savingGoal->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'direction' => ['required', Rule::in(['deposit', 'withdrawal'])],
            'fund_source_id' => ['nullable', 'integer'],
            'external' => ['nullable', 'boolean'],
            'counterparty' => ['nullable', 'string', 'max:100'],
            'amount_minor' => ['required', 'integer', 'min:1'],
            'effective_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'uuid'],
        ]);
        $external = (bool) ($data['external'] ?? false);
        $source = $external ? null : FundSource::ownedBy((int) $request->user()->id)->findOrFail((int) $data['fund_source_id']);

        // idempotensi: key duplikat = request ulang (double tap), anggap sukses
        try {
            DB::transaction(function () use ($request, $data, $savingGoal, $source, $external, $ledger) {
                // lock goal supaya dua penarikan bersamaan tidak lolos cek saldo
                SavingGoal::whereKey($savingGoal->id)->lockForUpdate()->first();
                if ($data['direction'] === 'withdrawal') {
                    $movement = JournalLine::where('account_type', 'saving')->where('account_id', $savingGoal->id)
                        ->whereHas('entry', fn ($query) => $query->where('user_id', $request->user()->id)->where('status', 'posted'))
                        ->sum(DB::raw('debit_minor - credit_minor'));
                    if ($savingGoal->opening_balance_minor + (int) $movement < (int) $data['amount_minor']) {
                        throw ValidationException::withMessages(['amount_minor' => __('Saldo tabungan tidak mencukupi.')]);
                    }
                }
                $amount = (int) $data['amount_minor'];
                $entry = JournalEntry::create([
                    'user_id' => $request->user()->id,
                    'public_id' => (string) Str::uuid(),
                    'type' => 'savings_'.$data['direction'],
                    'status' => 'posted',
                    'amount_minor' => $amount,
                    'effective_date' => $data['effective_date'],
                    'description' => $data['description'] ?? $savingGoal->name,
                    'counterparty' => $data['counterparty'] ?? null,
                    'idempotency_key' => $data['idempotency_key'] ?? null,
                ]);
                // external (mis. setoran istri): uang masuk dari luar sistem, saldo sumber dana tidak tersentuh
                $creditAccount = $external
                    ? ['account_type' => 'external_contribution', 'account_id' => null, 'credit_minor' => $amount]
                    : ['account_type' => 'fund_source', 'account_id' => $source->id, 'credit_minor' => $amount];
                if ($data['direction'] === 'deposit') {
                    $entry->lines()->create(['account_type' => 'saving', 'account_id' => $savingGoal->id, 'debit_minor' => $amount]);
                    $entry->lines()->create($creditAccount);
                } else {
                    $entry->lines()->create($external
                        ? ['account_type' => 'external_contribution', 'account_id' => null, 'debit_minor' => $amount]
                        : ['account_type' => 'fund_source', 'account_id' => $source->id, 'debit_minor' => $amount]);
                    $entry->lines()->create(['account_type' => 'saving', 'account_id' => $savingGoal->id, 'credit_minor' => $amount]);
                }
                $ledger->assertBalanced($entry);
            });
        } catch (UniqueConstraintViolationException) {
        }

        return back()->with('success', __('Mutasi tabungan berhasil dicatat.'));
    }

    public function storeReceivable(Request $request, LedgerService $ledger): RedirectResponse
    {
        $data = $request->validate([
            'counterparty' => ['required', 'string', 'max:255'],
            'fund_source_id' => ['required', 'integer'],
            'principal_minor' => ['required', 'integer', 'min:1'],
            'issued_at' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:issued_at'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $source = FundSource::ownedBy((int) $request->user()->id)->findOrFail($data['fund_source_id']);

        DB::transaction(function () use ($request, $data, $source, $ledger) {
            $entry = JournalEntry::create([
                'user_id' => $request->user()->id, 'public_id' => (string) Str::uuid(), 'type' => 'receivable_issue',
                'status' => 'posted', 'amount_minor' => $data['principal_minor'], 'effective_date' => $data['issued_at'],
                'counterparty' => $data['counterparty'], 'description' => $data['notes'] ?? null,
            ]);
            $receivable = Receivable::create([
                'user_id' => $request->user()->id, 'journal_entry_id' => $entry->id, 'counterparty' => $data['counterparty'],
                'principal_minor' => $data['principal_minor'], 'outstanding_minor' => $data['principal_minor'],
                'issued_at' => $data['issued_at'], 'due_date' => $data['due_date'] ?? null, 'notes' => $data['notes'] ?? null,
            ]);
            $entry->lines()->create(['account_type' => 'receivable', 'account_id' => $receivable->id, 'debit_minor' => $data['principal_minor']]);
            $entry->lines()->create(['account_type' => 'fund_source', 'account_id' => $source->id, 'credit_minor' => $data['principal_minor']]);
            $ledger->assertBalanced($entry);
        });

        return back()->with('success', __('Kasbon berhasil dicatat.'));
    }

    public function payReceivable(Request $request, Receivable $receivable, LedgerService $ledger): RedirectResponse
    {
        abort_unless($receivable->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'fund_source_id' => ['required', 'integer'], 'principal_minor' => ['required', 'integer', 'min:1'],
            'interest_minor' => ['nullable', 'integer', 'min:0'], 'penalty_minor' => ['nullable', 'integer', 'min:0'],
            'paid_at' => ['required', 'date'],
        ]);
        $source = FundSource::ownedBy((int) $request->user()->id)->findOrFail($data['fund_source_id']);

        DB::transaction(function () use ($request, $data, $receivable, $source, $ledger) {
            // lock + baca ulang sisa: double tap tidak boleh bayar melebihi sisa
            $receivable = Receivable::lockForUpdate()->findOrFail($receivable->id);
            if ((int) $data['principal_minor'] > $receivable->outstanding_minor) {
                throw ValidationException::withMessages(['principal_minor' => __('Pokok melebihi sisa kasbon.')]);
            }
            $interest = (int) ($data['interest_minor'] ?? 0) + (int) ($data['penalty_minor'] ?? 0);
            $total = (int) $data['principal_minor'] + $interest;
            $entry = JournalEntry::create([
                'user_id' => $request->user()->id, 'public_id' => (string) Str::uuid(), 'type' => 'receivable_payment',
                'status' => 'posted', 'amount_minor' => $total, 'effective_date' => $data['paid_at'], 'counterparty' => $receivable->counterparty,
            ]);
            $entry->lines()->create(['account_type' => 'fund_source', 'account_id' => $source->id, 'debit_minor' => $total]);
            $entry->lines()->create(['account_type' => 'receivable', 'account_id' => $receivable->id, 'credit_minor' => $data['principal_minor']]);
            if ($interest > 0) {
                $entry->lines()->create(['account_type' => 'income', 'credit_minor' => $interest]);
            }
            $receivable->payments()->create([...$data, 'interest_minor' => $data['interest_minor'] ?? 0, 'penalty_minor' => $data['penalty_minor'] ?? 0, 'journal_entry_id' => $entry->id]);
            $remaining = $receivable->outstanding_minor - (int) $data['principal_minor'];
            $receivable->update(['outstanding_minor' => $remaining, 'status' => $remaining === 0 ? 'paid' : 'partial']);
            $ledger->assertBalanced($entry);
        });

        return back()->with('success', __('Pembayaran kasbon berhasil dicatat.'));
    }

    public function storeLoan(Request $request, LedgerService $ledger): RedirectResponse
    {
        $data = $request->validate([
            'counterparty' => ['required', 'string', 'max:255'], 'fund_source_id' => ['required', 'integer'],
            'principal_minor' => ['required', 'integer', 'min:1'], 'received_at' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:received_at'], 'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $source = FundSource::ownedBy((int) $request->user()->id)->findOrFail($data['fund_source_id']);
        DB::transaction(function () use ($request, $data, $source, $ledger) {
            $entry = JournalEntry::create([
                'user_id' => $request->user()->id, 'public_id' => (string) Str::uuid(), 'type' => 'loan_received',
                'status' => 'posted', 'amount_minor' => $data['principal_minor'], 'effective_date' => $data['received_at'],
                'counterparty' => $data['counterparty'], 'description' => $data['notes'] ?? null,
            ]);
            $loan = LoanPayable::create([
                'user_id' => $request->user()->id, 'journal_entry_id' => $entry->id, 'counterparty' => $data['counterparty'],
                'principal_minor' => $data['principal_minor'], 'outstanding_minor' => $data['principal_minor'],
                'received_at' => $data['received_at'], 'due_date' => $data['due_date'] ?? null, 'notes' => $data['notes'] ?? null,
            ]);
            $entry->lines()->create(['account_type' => 'fund_source', 'account_id' => $source->id, 'debit_minor' => $data['principal_minor']]);
            $entry->lines()->create(['account_type' => 'loan', 'account_id' => $loan->id, 'credit_minor' => $data['principal_minor']]);
            $ledger->assertBalanced($entry);
        });

        return back()->with('success', __('Pinjaman berhasil dicatat.'));
    }

    public function payLoan(Request $request, LoanPayable $loan, LedgerService $ledger): RedirectResponse
    {
        abort_unless($loan->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'fund_source_id' => ['required', 'integer'], 'principal_minor' => ['required', 'integer', 'min:1'],
            'interest_minor' => ['nullable', 'integer', 'min:0'], 'penalty_minor' => ['nullable', 'integer', 'min:0'],
            'paid_at' => ['required', 'date'],
        ]);
        $source = FundSource::ownedBy((int) $request->user()->id)->findOrFail($data['fund_source_id']);
        DB::transaction(function () use ($request, $data, $loan, $source, $ledger) {
            // lock + baca ulang sisa: double tap tidak boleh bayar melebihi sisa
            $loan = LoanPayable::lockForUpdate()->findOrFail($loan->id);
            if ((int) $data['principal_minor'] > $loan->outstanding_minor) {
                throw ValidationException::withMessages(['principal_minor' => __('Pokok melebihi sisa pinjaman.')]);
            }
            $cost = (int) ($data['interest_minor'] ?? 0) + (int) ($data['penalty_minor'] ?? 0);
            $total = (int) $data['principal_minor'] + $cost;
            $entry = JournalEntry::create([
                'user_id' => $request->user()->id, 'public_id' => (string) Str::uuid(), 'type' => 'loan_payment',
                'status' => 'posted', 'amount_minor' => $total, 'effective_date' => $data['paid_at'], 'counterparty' => $loan->counterparty,
            ]);
            $entry->lines()->create(['account_type' => 'loan', 'account_id' => $loan->id, 'debit_minor' => $data['principal_minor']]);
            if ($cost > 0) {
                $entry->lines()->create(['account_type' => 'expense', 'debit_minor' => $cost]);
            }
            $entry->lines()->create(['account_type' => 'fund_source', 'account_id' => $source->id, 'credit_minor' => $total]);
            $loan->payments()->create([...$data, 'interest_minor' => $data['interest_minor'] ?? 0, 'penalty_minor' => $data['penalty_minor'] ?? 0, 'journal_entry_id' => $entry->id]);
            $remaining = $loan->outstanding_minor - (int) $data['principal_minor'];
            $loan->update(['outstanding_minor' => $remaining, 'status' => $remaining === 0 ? 'paid' : 'partial']);
            $ledger->assertBalanced($entry);
        });

        return back()->with('success', __('Pembayaran pinjaman berhasil dicatat.'));
    }
}
