<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\FundSource;
use App\Models\JournalEntry;
use App\Models\LoanPayable;
use App\Models\LoanPayment;
use App\Models\Receivable;
use App\Models\ReceivablePayment;
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

class TransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = (int) $request->user()->id;
        // default: bulan berjalan; ?month=YYYY-MM; ?from/&to untuk rentang custom; ?category= & ?type= untuk filter
        $month = (string) $request->query('month', now($request->user()->timezone ?? 'Asia/Jakarta')->format('Y-m'));
        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            $month = now()->format('Y-m');
        }
        [$year, $mon] = array_map('intval', explode('-', $month));
        $from = $request->string('from')->isNotEmpty() && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('from'))
            ? (string) $request->query('from')
            : sprintf('%04d-%02d-01', $year, $mon);
        $to = $request->string('to')->isNotEmpty() && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('to'))
            ? (string) $request->query('to')
            : sprintf('%04d-%02d-%02d', $year, $mon, now()->create(sprintf('%04d-%02d-01', $year, $mon))->daysInMonth);
        $type = in_array($request->query('type'), ['income', 'expense', 'transfer'], true) ? $request->query('type') : null;
        $category = (int) $request->query('category', 0);

        $query = JournalEntry::ownedBy($userId)->with('lines')->where('status', 'posted')
            ->whereBetween('effective_date', [$from, $to]);
        if ($type) {
            $query->where('type', $type);
        }
        if ($category > 0) {
            $query->whereHas('lines', fn ($q) => $q->where('category_id', $category));
        }
        // total sesuai filter (bukan cuma halaman ini), satu query agregat
        $totals = (clone $query)->reorder()->toBase()->selectRaw(implode(', ', [
            "COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS income",
            "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expense",
        ]))->first();
        $entries = $query->latest('effective_date')->latest('id')->paginate(100)->withQueryString()->through(fn (JournalEntry $entry) => [
            'id' => $entry->public_id,
            'type' => $entry->type,
            'amount' => $entry->amount_minor,
            'date' => $entry->effective_date->toDateString(),
            'description' => $entry->description,
            'counterparty' => $entry->counterparty,
            'fund_source_id' => $entry->lines->firstWhere('account_type', 'fund_source')?->account_id,
            // transfer: line fund_source yang di-kredit = sumber asal
            'from_fund_source_id' => $entry->type === 'transfer' ? $entry->lines->where('account_type', 'fund_source')->firstWhere('credit_minor', '>', 0)?->account_id : null,
            'category_id' => $entry->lines->firstWhere('account_type', $entry->type)?->category_id,
            'is_recurring' => (bool) $entry->is_recurring,
        ]);

        return Inertia::render('transactions/index', [
            'transactions' => $entries,
            'totals' => ['income' => (int) $totals->income, 'expense' => (int) $totals->expense],
            'filters' => ['month' => $month, 'from' => $from, 'to' => $to, 'type' => $type, 'category' => $category],
            'fundSources' => FundSource::ownedBy($userId)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type', 'color']),
            'categories' => Category::ownedBy($userId)->where('is_archived', false)->orderBy('name')->get(['id', 'name', 'type', 'color', 'bucket']),
        ]);
    }

    public function store(Request $request, LedgerService $ledger): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['income', 'expense'])],
            'amount_minor' => ['required', 'integer', 'min:1'],
            'fund_source_id' => ['required', 'integer'],
            'category_id' => ['required', 'integer'],
            'effective_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'counterparty' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'uuid'],
            'is_recurring' => ['nullable', 'boolean'],
        ]);

        // idempotensi: key duplikat = request ulang, anggap sukses
        try {
            $ledger->postIncomeOrExpense((int) $request->user()->id, $data);
        } catch (UniqueConstraintViolationException) {
        }

        return back()->with('success', __('Transaksi berhasil dicatat.'));
    }

    public function update(Request $request, LedgerService $ledger, string $id): RedirectResponse
    {
        $entry = JournalEntry::ownedBy((int) $request->user()->id)->where('public_id', $id)->firstOrFail();
        // hanya income/expense yang boleh diedit; entry lain (transfer, tabungan, kasbon) punya line & record turunan sendiri
        abort_unless(in_array($entry->type, ['income', 'expense'], true), 422, __('Transaksi ini tidak bisa diedit. Hapus lalu catat ulang.'));
        $data = $request->validate([
            'type' => ['required', Rule::in(['income', 'expense'])],
            'amount_minor' => ['required', 'integer', 'min:1'],
            'fund_source_id' => ['required', 'integer'],
            'category_id' => ['required', 'integer'],
            'effective_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'counterparty' => ['nullable', 'string', 'max:1000'],
            'is_recurring' => ['nullable', 'boolean'],
        ]);

        // hapus line lama + repost dengan nilai baru dalam satu transaksi; key baru supaya tidak nabrak unique constraint
        DB::transaction(function () use ($entry, $data, $ledger) {
            $entry->lines()->delete();
            $entry->update([
                'type' => $data['type'], 'amount_minor' => $data['amount_minor'], 'effective_date' => $data['effective_date'],
                'description' => $data['description'], 'counterparty' => $data['counterparty'] ?? null,
                'idempotency_key' => (string) Str::uuid(),
                'is_recurring' => $data['is_recurring'] ?? true,
            ]);
            $ledger->postLines($entry, $data);
            $ledger->assertBalanced($entry);
        });

        return back()->with('success', __('Transaksi berhasil diubah.'));
    }

    public function destroy(Request $request, string $id): RedirectResponse
    {
        $entry = JournalEntry::ownedBy((int) $request->user()->id)->where('public_id', $id)->firstOrFail();
        // kasbon/pinjaman yang sudah ada cicilannya: hapus cicilannya dulu, kalau tidak uang cicilan jadi yatim di sumber dana
        $hasPayments = match ($entry->type) {
            'receivable_issue' => ReceivablePayment::whereIn('receivable_id', Receivable::where('journal_entry_id', $entry->id)->select('id'))->exists(),
            'loan_received' => LoanPayment::whereIn('loan_payable_id', LoanPayable::where('journal_entry_id', $entry->id)->select('id'))->exists(),
            default => false,
        };
        if ($hasPayments) {
            throw ValidationException::withMessages(['transaction' => __('Hapus dulu pembayaran/cicilan yang terkait sebelum menghapus transaksi ini.')]);
        }

        DB::transaction(function () use ($entry) {
            // pembayaran dihapus: kembalikan sisa pokok kasbon/pinjaman
            foreach (ReceivablePayment::where('journal_entry_id', $entry->id)->get() as $payment) {
                $receivable = Receivable::lockForUpdate()->find($payment->receivable_id);
                $remaining = $receivable->outstanding_minor + $payment->principal_minor;
                $receivable->update(['outstanding_minor' => $remaining, 'status' => $remaining >= $receivable->principal_minor ? 'active' : 'partial']);
                $payment->delete();
            }
            foreach (LoanPayment::where('journal_entry_id', $entry->id)->get() as $payment) {
                $loan = LoanPayable::lockForUpdate()->find($payment->loan_payable_id);
                $remaining = $loan->outstanding_minor + $payment->principal_minor;
                $loan->update(['outstanding_minor' => $remaining, 'status' => $remaining >= $loan->principal_minor ? 'active' : 'partial']);
                $payment->delete();
            }
            Receivable::where('journal_entry_id', $entry->id)->delete();
            LoanPayable::where('journal_entry_id', $entry->id)->delete();
            $entry->lines()->delete();
            $entry->delete();
        });

        return back()->with('success', __('Transaksi berhasil dihapus.'));
    }

    public function transfer(Request $request, LedgerService $ledger): RedirectResponse
    {
        $data = $request->validate([
            'from_fund_source_id' => ['required', 'integer'],
            'to_fund_source_id' => ['required', 'integer'],
            'amount_minor' => ['required', 'integer', 'min:1'],
            'effective_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'uuid'],
        ]);
        // idempotensi: key duplikat = request ulang (double tap), anggap sukses
        try {
            $ledger->transfer((int) $request->user()->id, $data);
        } catch (UniqueConstraintViolationException) {
        }

        return back()->with('success', __('Transfer berhasil dicatat.'));
    }
}
