<?php

namespace App\Http\Controllers;

use App\Models\JournalEntry;
use App\Services\InsightService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = (int) $request->user()->id;
        $from = $request->date('from')?->toDateString() ?? now()->startOfYear()->toDateString();
        $to = $request->date('to')?->toDateString() ?? now()->toDateString();
        $entries = JournalEntry::ownedBy($userId)->where('status', 'posted')->whereIn('type', ['income', 'expense'])
            ->whereBetween('effective_date', [$from, $to])->orderBy('effective_date')->get(['type', 'amount_minor', 'effective_date', 'is_recurring']);
        $income = (int) $entries->where('type', 'income')->sum('amount_minor');
        $expense = (int) $entries->where('type', 'expense')->sum('amount_minor');
        $monthly = $entries->groupBy(fn (JournalEntry $entry) => $entry->effective_date->format('Y-m'))
            ->map(fn ($items, string $month) => ['month' => $month, 'income' => (int) $items->where('type', 'income')->sum('amount_minor'), 'expense' => (int) $items->where('type', 'expense')->sum('amount_minor')])->values();
        $expenseByCategory = $this->categoryTotals($userId, 'expense', $from, $to);
        $incomeByCategory = $this->categoryTotals($userId, 'income', $from, $to);
        // saran otomatis via InsightService: basis bulan terakhir dalam rentang filter
        $insights = InsightService::build($userId, $monthly->last()['month'] ?? null);
        // drilldown: query ringan join line kategori, tanpa hidrasi model + relasi lines
        $categoryDetails = DB::table('journal_entries')
            ->join('journal_lines', fn ($join) => $join->on('journal_lines.journal_entry_id', '=', 'journal_entries.id')->whereColumn('journal_lines.account_type', 'journal_entries.type'))
            ->where('journal_entries.user_id', $userId)->where('journal_entries.status', 'posted')->whereIn('journal_entries.type', ['income', 'expense'])
            ->whereBetween('journal_entries.effective_date', [$from, $to])
            ->orderByDesc('journal_entries.effective_date')->orderByDesc('journal_entries.id')
            ->get(['journal_entries.id', 'journal_entries.type', 'journal_entries.description', 'journal_entries.amount_minor', 'journal_entries.effective_date', 'journal_lines.category_id'])
            ->unique('id')
            ->map(fn (object $entry) => [
                'type' => $entry->type,
                'category_id' => $entry->category_id,
                'title' => $entry->description ?: ucfirst(str_replace('_', ' ', $entry->type)), 'amount' => (int) $entry->amount_minor, 'date' => substr((string) $entry->effective_date, 0, 10),
            ])->groupBy('category_id');
        // pisahkan gaji rutin dan bonus: patokan budget = pemasukan rutin saja
        $recurringIncome = (int) $entries->where('type', 'income')->where('is_recurring', true)->sum('amount_minor');
        $bonusIncome = $income - $recurringIncome;

        return Inertia::render('reports/index', [
            'filters' => compact('from', 'to'),
            'summary' => compact('income', 'expense') + ['recurringIncome' => $recurringIncome, 'bonusIncome' => $bonusIncome],
            'monthly' => $monthly,
            'expenseByCategory' => $expenseByCategory,
            'incomeByCategory' => $incomeByCategory,
            'insights' => $insights,
            'categoryTransactions' => $categoryDetails,
        ]);
    }

    private function categoryTotals(int $userId, string $type, string $from, string $to)
    {
        $minor = $type === 'expense' ? 'debit' : 'credit';
        $fallback = $type === 'expense' ? 'Lainnya' : 'Pemasukan lain';

        // hanya entry bertipe sama (income/expense) supaya total per kategori = total di ringkasan
        return DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')->leftJoin('categories', 'categories.id', '=', 'journal_lines.category_id')
            ->where('journal_entries.user_id', $userId)->where('journal_entries.status', 'posted')->where('journal_lines.account_type', $type)->where('journal_entries.type', $type)->whereBetween('journal_entries.effective_date', [$from, $to])
            ->groupBy('categories.id', 'categories.name', 'categories.color')->selectRaw("COALESCE(categories.id, 0) AS id, COALESCE(categories.name, '{$fallback}') AS name, COALESCE(categories.color, '#64748b') AS color, SUM(journal_lines.{$minor}_minor) AS total")->orderByDesc('total')->get();
    }
}
