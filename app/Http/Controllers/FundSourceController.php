<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\FundSource;
use App\Models\JournalLine;
use App\Services\LedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FundSourceController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = (int) $request->user()->id;
        $today = CarbonImmutable::today($request->user()->timezone ?? 'Asia/Jakarta');
        $sources = FundSource::ownedBy($userId)->orderBy('name')->get();
        $movements = JournalLine::query()
            ->select('account_id', DB::raw('SUM(debit_minor - credit_minor) AS movement'))
            ->where('account_type', 'fund_source')
            ->whereIn('account_id', $sources->pluck('id'))
            ->whereHas('entry', fn ($query) => $query->ownedBy($userId)->where('status', 'posted')->whereDate('effective_date', '<=', $today))
            ->groupBy('account_id')
            ->pluck('movement', 'account_id');

        return Inertia::render('fund-sources/index', [
            'fundSources' => $sources->map(fn (FundSource $source) => [
                ...$source->toArray(),
                'current_balance_minor' => ($source->opening_date->lte($today) ? $source->opening_balance_minor : 0)
                    + (int) ($movements[$source->id] ?? 0),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', Rule::in(['cash', 'bank', 'ewallet', 'prepaid', 'other'])],
            'opening_balance_minor' => ['required', 'integer', 'min:0'],
            'opening_date' => ['required', 'date'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);
        $request->user()->fundSources()->create($data);

        return back()->with('success', __('Sumber dana berhasil ditambahkan.'));
    }

    public function update(Request $request, FundSource $fundSource): RedirectResponse
    {
        abort_unless($fundSource->user_id === $request->user()->id, 404);
        // saldo awal & tanggalnya sengaja tidak bisa diubah: itu mengubah riwayat saldo
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', Rule::in(['cash', 'bank', 'ewallet', 'prepaid', 'other'])],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'is_active' => ['required', 'boolean'],
        ]);
        $fundSource->update($data);

        return back()->with('success', __('Sumber dana berhasil diperbarui.'));
    }

    /** Samakan saldo dompet dengan uang asli: selisihnya dicatat sebagai pengeluaran/pemasukan "Selisih / Lupa". */
    public function adjust(Request $request, FundSource $fundSource, LedgerService $ledger): RedirectResponse
    {
        abort_unless($fundSource->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'actual_balance_minor' => ['required', 'integer', 'min:0'],
            'idempotency_key' => ['nullable', 'uuid'],
        ]);
        $userId = (int) $request->user()->id;
        $today = CarbonImmutable::today($request->user()->timezone ?? 'Asia/Jakarta');
        $movement = (int) JournalLine::where('account_type', 'fund_source')->where('account_id', $fundSource->id)
            ->whereHas('entry', fn ($query) => $query->ownedBy($userId)->where('status', 'posted')->whereDate('effective_date', '<=', $today))
            ->sum(DB::raw('debit_minor - credit_minor'));
        $current = ($fundSource->opening_date->lte($today) ? $fundSource->opening_balance_minor : 0) + $movement;
        $diff = (int) $data['actual_balance_minor'] - $current;

        if ($diff === 0) {
            throw ValidationException::withMessages(['actual_balance_minor' => __('Saldonya udah sama, nggak ada selisih.')]);
        }

        $type = $diff < 0 ? 'expense' : 'income';
        $category = Category::firstOrCreate(
            ['user_id' => $userId, 'type' => $type, 'name' => 'Selisih / Lupa'],
            ['color' => '#64748b', 'bucket' => $type === 'income' ? 'income' : 'lifestyle'],
        );
        if ($category->is_archived) {
            $category->update(['is_archived' => false]);
        }

        // idempotensi: key duplikat = request ulang (double tap), anggap sukses
        try {
            $ledger->postIncomeOrExpense($userId, [
                'type' => $type,
                'amount_minor' => abs($diff),
                'fund_source_id' => $fundSource->id,
                'category_id' => $category->id,
                'effective_date' => $today->toDateString(),
                'description' => 'Penyesuaian saldo',
                'idempotency_key' => $data['idempotency_key'] ?? null,
                // selisih bukan gaji rutin, jadi tidak ikut hitungan "sisa gaji"
                'is_recurring' => false,
            ]);
        } catch (UniqueConstraintViolationException) {
        }

        return back()->with('success', __('Saldo disesuaikan.'));
    }
}
