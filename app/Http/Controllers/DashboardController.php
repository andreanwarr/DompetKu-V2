<?php

namespace App\Http\Controllers;

use App\Models\FundSource;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\LoanPayable;
use App\Models\Receivable;
use App\Models\SavingGoal;
use App\Services\InsightService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $userId = (int) $request->user()->id;
        $period = in_array($request->string('period')->value(), ['current', 'previous', 'three_months'], true)
            ? $request->string('period')->value()
            : 'current';
        $today = CarbonImmutable::today($request->user()->timezone ?? 'Asia/Jakarta');
        [$start, $end] = match ($period) {
            'previous' => [$today->subMonthNoOverflow()->startOfMonth(), $today->subMonthNoOverflow()->endOfMonth()],
            'three_months' => [$today->subMonthsNoOverflow(2)->startOfMonth(), $today],
            default => [$today->startOfMonth(), $today],
        };

        $sources = FundSource::ownedBy($userId)->orderBy('name')->get();
        $sourceIds = $sources->pluck('id');
        $mutations = JournalLine::query()
            ->select('account_id', DB::raw('SUM(debit_minor - credit_minor) AS movement'))
            ->where('account_type', 'fund_source')
            ->whereIn('account_id', $sourceIds)
            ->whereHas('entry', fn ($query) => $query->ownedBy($userId)->where('status', 'posted')->whereDate('effective_date', '<=', $today))
            ->groupBy('account_id')
            ->pluck('movement', 'account_id');

        $sourceBalances = $sources->map(fn (FundSource $source) => [
            'id' => $source->id,
            'name' => $source->name,
            'type' => $source->type,
            'color' => $source->color,
            'balance' => ($source->opening_date->lte($today) ? $source->opening_balance_minor : 0) + (int) ($mutations[$source->id] ?? 0),
        ]);
        $available = (int) $sourceBalances->sum('balance');

        $periodEntries = JournalEntry::ownedBy($userId)
            ->where('status', 'posted')
            ->whereBetween('effective_date', [$start->toDateString(), $end->toDateString()]);
        // satu query agregat (dulu 5 query SUM terpisah); setoran/penarikan tabungan hanya yang menyentuh fund source
        $touchesFund = "EXISTS (SELECT 1 FROM journal_lines fl WHERE fl.journal_entry_id = journal_entries.id AND fl.account_type = 'fund_source')";
        $totals = $periodEntries->selectRaw(implode(', ', [
            "COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS income",
            "COALESCE(SUM(CASE WHEN type = 'income' AND is_recurring = ? THEN amount_minor ELSE 0 END), 0) AS recurring_income",
            "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expense",
            "COALESCE(SUM(CASE WHEN type = 'savings_deposit' AND {$touchesFund} THEN amount_minor ELSE 0 END), 0) AS saving_deposits",
            "COALESCE(SUM(CASE WHEN type = 'savings_withdrawal' AND {$touchesFund} THEN amount_minor ELSE 0 END), 0) AS saving_withdrawals",
        ]), [true])->toBase()->first();
        $income = (int) $totals->income;
        $recurringIncome = (int) $totals->recurring_income;
        $expense = (int) $totals->expense;
        $savingDeposits = (int) $totals->saving_deposits;
        $savingWithdrawals = (int) $totals->saving_withdrawals;

        $savingGoals = SavingGoal::where('user_id', $userId)->where('status', 'active')->get();
        $savingIds = $savingGoals->pluck('id');
        $savingMutations = JournalLine::query()
            ->select('account_id', DB::raw('SUM(debit_minor - credit_minor) AS movement'))
            ->where('account_type', 'saving')
            ->whereIn('account_id', $savingIds)
            ->whereHas('entry', fn ($query) => $query->ownedBy($userId)->where('status', 'posted')->whereDate('effective_date', '<=', $today))
            ->groupBy('account_id')->pluck('movement', 'account_id');
        $savings = (int) $savingGoals->sum(fn (SavingGoal $goal) => $goal->opening_balance_minor + (int) ($savingMutations[$goal->id] ?? 0));
        // 6 bulan terakhir (termasuk bulan berjalan) untuk sparkline masuk/keluar; satu query agregat
        $trendStart = $end->subMonthsNoOverflow(5)->startOfMonth();
        $monthExpr = DB::getDriverName() === 'pgsql' ? "to_char(effective_date, 'YYYY-MM')" : "strftime('%Y-%m', effective_date)";
        $trendRows = JournalEntry::ownedBy($userId)->where('status', 'posted')->whereIn('type', ['income', 'expense'])
            ->whereBetween('effective_date', [$trendStart->toDateString(), $end->toDateString()])
            ->selectRaw("{$monthExpr} AS m, type, SUM(amount_minor) AS total")
            ->groupBy('m', 'type')->toBase()->get();
        $trend = collect(range(5, 0))->map(function (int $back) use ($end, $trendRows) {
            $month = $end->subMonthsNoOverflow($back)->format('Y-m');

            return [
                'month' => $month,
                'income' => (int) ($trendRows->first(fn ($r) => $r->m === $month && $r->type === 'income')->total ?? 0),
                'expense' => (int) ($trendRows->first(fn ($r) => $r->m === $month && $r->type === 'expense')->total ?? 0),
            ];
        })->values();

        // pemasukan periode ini untuk detail kartu "Masuk"
        $incomeDetails = JournalEntry::ownedBy($userId)->where('status', 'posted')->where('type', 'income')
            ->whereBetween('effective_date', [$start->toDateString(), $end->toDateString()])
            ->orderByDesc('effective_date')->orderByDesc('id')
            ->get(['description', 'amount_minor', 'effective_date', 'is_recurring', 'type'])
            ->map(fn (JournalEntry $entry) => [
                'title' => $entry->description ?: ucfirst(str_replace('_', ' ', $entry->type)),
                'amount' => $entry->amount_minor,
                'date' => $entry->effective_date->toDateString(),
                'recurring' => (bool) $entry->is_recurring,
            ]);

        $receivables = (int) Receivable::where('user_id', $userId)->whereIn('status', ['active', 'partial', 'overdue'])->sum('outstanding_minor');
        $loans = (int) LoanPayable::where('user_id', $userId)->whereIn('status', ['active', 'partial', 'overdue'])->sum('outstanding_minor');

        $expenseByCategory = DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->leftJoin('categories', 'categories.id', '=', 'journal_lines.category_id')
            ->where('journal_entries.user_id', $userId)
            ->where('journal_entries.status', 'posted')
            ->where('journal_lines.account_type', 'expense')
            ->whereBetween('journal_entries.effective_date', [$start->toDateString(), $end->toDateString()])
            ->groupBy('categories.id', 'categories.name', 'categories.color')
            ->selectRaw("COALESCE(categories.id, 0) AS id, COALESCE(categories.name, 'Lainnya') AS name, COALESCE(categories.color, '#64748b') AS color, SUM(journal_lines.debit_minor) AS total")
            ->orderByDesc('total')->limit(6)->get();

        // drilldown per kategori: query ringan tanpa hidrasi model + relasi lines
        $categoryDetails = DB::table('journal_entries')
            ->join('journal_lines', fn ($join) => $join->on('journal_lines.journal_entry_id', '=', 'journal_entries.id')->where('journal_lines.account_type', 'expense'))
            ->where('journal_entries.user_id', $userId)->where('journal_entries.status', 'posted')->where('journal_entries.type', 'expense')
            ->whereBetween('journal_entries.effective_date', [$start->toDateString(), $end->toDateString()])
            ->orderByDesc('journal_entries.effective_date')->orderByDesc('journal_entries.id')
            ->get(['journal_entries.id', 'journal_entries.type', 'journal_entries.description', 'journal_entries.amount_minor', 'journal_entries.effective_date', 'journal_lines.category_id'])
            ->unique('id')
            ->map(fn (object $entry) => [
                'category_id' => $entry->category_id,
                'title' => $entry->description ?: ucfirst(str_replace('_', ' ', $entry->type)),
                'amount' => (int) $entry->amount_minor,
                'date' => substr((string) $entry->effective_date, 0, 10),
            ])
            ->groupBy('category_id');

        $recent = JournalEntry::ownedBy($userId)->with('lines:id,journal_entry_id,account_type,account_id,category_id')->where('status', 'posted')
            ->latest('effective_date')->latest('id')->limit(8)->get()->map(fn (JournalEntry $entry) => [
                'id' => $entry->public_id,
                'type' => $entry->type,
                'amount' => $entry->amount_minor,
                'date' => $entry->effective_date->toDateString(),
                'description' => $entry->description ?: $entry->counterparty ?: ucfirst(str_replace('_', ' ', $entry->type)),
                // untuk buka sheet edit langsung dari beranda
                'title' => $entry->description,
                'counterparty' => $entry->counterparty,
                'fund_source_id' => $entry->lines->firstWhere('account_type', 'fund_source')?->account_id,
                'category_id' => $entry->lines->firstWhere('account_type', $entry->type)?->category_id,
                'is_recurring' => (bool) $entry->is_recurring,
            ]);

        return Inertia::render('dashboard', [
            'period' => $period,
            'range' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'summary' => [
                'netWorth' => $available + $receivables,
                // saldo bulan ini = gaji rutin - konsumsi - setor tabungan; bonus tidak masuk anggaran bulanan
                'periodBalance' => (int) $recurringIncome - (int) $expense - (int) $savingDeposits + (int) $savingWithdrawals,
                'availableBalance' => $available,
                'income' => (int) $income,
                'recurringIncome' => (int) $recurringIncome,
                'bonusIncome' => (int) $income - (int) $recurringIncome,
                'expense' => (int) $expense,
                'savingDeposits' => (int) $savingDeposits,
                'savingWithdrawals' => (int) $savingWithdrawals,
                'savings' => $savings,
                'receivables' => $receivables,
                'loans' => $loans,
            ],
            'sourceBalances' => $sourceBalances,
            'expenseByCategory' => $expenseByCategory,
            'categoryTransactions' => $categoryDetails,
            'insights' => InsightService::build($userId, $end->format('Y-m'), $savings),
            'recentTransactions' => $recent,
            'trend' => $trend,
            'incomeTransactions' => $incomeDetails,
            'savingGoals' => $savingGoals->map(fn (SavingGoal $goal) => [
                'id' => $goal->id,
                'name' => $goal->name,
                'color' => $goal->color,
                'target' => $goal->target_minor,
                'balance' => $goal->opening_balance_minor + (int) ($savingMutations[$goal->id] ?? 0),
            ])->values(),
        ]);
    }
}
