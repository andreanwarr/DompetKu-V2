<?php

namespace App\Http\Controllers;

use App\Models\FundSource;
use App\Models\JournalLine;
use App\Models\LoanPayable;
use App\Models\Receivable;
use App\Models\SavingGoal;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    private const RUPIAH = '"Rp"#,##0;[Red]-"Rp"#,##0';

    private const TYPE_LABELS = [
        'income' => 'Pemasukan', 'expense' => 'Pengeluaran', 'transfer' => 'Transfer',
        'savings_deposit' => 'Setor tabungan', 'savings_withdrawal' => 'Tarik tabungan',
        'receivable_issue' => 'Kasbon keluar', 'receivable_payment' => 'Kasbon dibayar',
        'loan_received' => 'Pinjaman masuk', 'loan_payment' => 'Bayar pinjaman',
    ];

    public function __invoke(Request $request): StreamedResponse
    {
        $user = $request->user();
        $userId = (int) $user->id;
        $from = $request->date('from')?->toDateString() ?? now()->startOfYear()->toDateString();
        $to = $request->date('to')?->toDateString() ?? now()->toDateString();
        $today = CarbonImmutable::today($user->timezone ?? 'Asia/Jakarta');

        // satu query: entry + kategori + sumber dana (masuk/keluar) per baris
        $entries = DB::table('journal_entries')
            ->where('journal_entries.user_id', $userId)->where('journal_entries.status', 'posted')
            ->whereBetween('journal_entries.effective_date', [$from, $to])
            ->leftJoin('journal_lines as cl', fn ($join) => $join->on('cl.journal_entry_id', '=', 'journal_entries.id')->whereNotNull('cl.category_id'))
            ->leftJoin('categories', 'categories.id', '=', 'cl.category_id')
            ->leftJoin('journal_lines as fin', fn ($join) => $join->on('fin.journal_entry_id', '=', 'journal_entries.id')->where('fin.account_type', 'fund_source')->where('fin.debit_minor', '>', 0))
            ->leftJoin('fund_sources as fs_in', 'fs_in.id', '=', 'fin.account_id')
            ->leftJoin('journal_lines as fout', fn ($join) => $join->on('fout.journal_entry_id', '=', 'journal_entries.id')->where('fout.account_type', 'fund_source')->where('fout.credit_minor', '>', 0))
            ->leftJoin('fund_sources as fs_out', 'fs_out.id', '=', 'fout.account_id')
            ->orderBy('journal_entries.effective_date')->orderBy('journal_entries.id')
            ->get(['journal_entries.id', 'journal_entries.effective_date', 'journal_entries.type', 'journal_entries.description', 'journal_entries.counterparty', 'journal_entries.amount_minor', 'journal_entries.is_recurring', 'categories.name as category', 'fs_in.name as fund_in', 'fs_out.name as fund_out'])
            ->unique('id')->values();

        $income = (int) $entries->where('type', 'income')->sum('amount_minor');
        $recurring = (int) $entries->where('type', 'income')->filter(fn ($e) => (bool) $e->is_recurring)->sum('amount_minor');
        $expense = (int) $entries->where('type', 'expense')->sum('amount_minor');
        $net = $income - $expense;

        $sources = FundSource::ownedBy($userId)->orderBy('name')->get();
        $movements = JournalLine::query()->select('account_id', DB::raw('SUM(debit_minor - credit_minor) AS movement'))
            ->where('account_type', 'fund_source')->whereIn('account_id', $sources->pluck('id'))
            ->whereHas('entry', fn ($q) => $q->ownedBy($userId)->where('status', 'posted')->whereDate('effective_date', '<=', $today))
            ->groupBy('account_id')->pluck('movement', 'account_id');
        $balanceOf = fn (FundSource $s) => ($s->opening_date->lte($today) ? $s->opening_balance_minor : 0) + (int) ($movements[$s->id] ?? 0);

        $goals = SavingGoal::where('user_id', $userId)->orderBy('name')->get();
        $goalMovements = JournalLine::query()->select('account_id', DB::raw('SUM(debit_minor - credit_minor) AS movement'))
            ->where('account_type', 'saving')->whereIn('account_id', $goals->pluck('id'))
            ->whereHas('entry', fn ($q) => $q->ownedBy($userId)->where('status', 'posted'))
            ->groupBy('account_id')->pluck('movement', 'account_id');
        $goalBalance = fn (SavingGoal $g) => $g->opening_balance_minor + (int) ($goalMovements[$g->id] ?? 0);

        $book = new Spreadsheet;
        $book->getProperties()->setCreator('DompetKu')->setTitle("Laporan keuangan {$from} s/d {$to}");

        // ── Ringkasan ──
        $summary = $book->getActiveSheet()->setTitle('Ringkasan');
        $summary->fromArray([
            ['DompetKu · Laporan Keuangan', ''],
            ['Periode', "{$from} s/d {$to}"],
            ['Pemilik', $user->name],
            ['Diekspor', now($user->timezone ?? 'Asia/Jakarta')->format('Y-m-d H:i')],
            [],
            ['Metrik', 'Nilai'],
            ['Pemasukan', $income],
            ['  Gaji / rutin', $recurring],
            ['  Bonus / tidak rutin', $income - $recurring],
            ['Pengeluaran', $expense],
            ['Arus bersih', $net],
            [],
            ['Posisi saat ini', 'Saldo'],
            ['Total sumber dana', (int) $sources->sum($balanceOf)],
            ['Total tabungan', (int) $goals->sum($goalBalance)],
            ['Kasbon belum kembali', (int) Receivable::where('user_id', $userId)->whereIn('status', ['active', 'partial', 'overdue'])->sum('outstanding_minor')],
            ['Sisa pinjaman', (int) LoanPayable::where('user_id', $userId)->whereIn('status', ['active', 'partial', 'overdue'])->sum('outstanding_minor')],
        ]);
        $summary->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $this->header($summary, 'A6:B6');
        $this->header($summary, 'A13:B13');
        $summary->getStyle('B7:B17')->getNumberFormat()->setFormatCode(self::RUPIAH);
        $summary->getStyle('A7')->getFont()->setBold(true);
        $summary->getStyle('A10:A11')->getFont()->setBold(true);
        $summary->getColumnDimension('A')->setWidth(26);
        $summary->getColumnDimension('B')->setWidth(22);

        // ── Bulanan ──
        $monthly = $book->createSheet()->setTitle('Bulanan');
        $rows = [['Bulan', 'Pemasukan', 'Gaji / rutin', 'Bonus', 'Pengeluaran', 'Arus bersih']];
        foreach ($entries->whereIn('type', ['income', 'expense'])->groupBy(fn ($e) => substr((string) $e->effective_date, 0, 7)) as $month => $items) {
            $in = (int) $items->where('type', 'income')->sum('amount_minor');
            $rec = (int) $items->where('type', 'income')->filter(fn ($e) => (bool) $e->is_recurring)->sum('amount_minor');
            $out = (int) $items->where('type', 'expense')->sum('amount_minor');
            $rows[] = [$month, $in, $rec, $in - $rec, $out, $in - $out];
        }
        $monthly->fromArray($rows);
        $this->table($monthly, count($rows), 6, 'B');

        // ── Transaksi ──
        $transactions = $book->createSheet()->setTitle('Transaksi');
        $rows = [['Tanggal', 'Tipe', 'Kategori', 'Dari', 'Ke', 'Deskripsi', 'Pihak', 'Masuk', 'Keluar']];
        foreach ($entries as $e) {
            $amount = (int) $e->amount_minor;
            $rows[] = [
                ExcelDate::PHPToExcel(substr((string) $e->effective_date, 0, 10)),
                self::TYPE_LABELS[$e->type] ?? $e->type,
                $e->category,
                $e->fund_out,
                $e->fund_in,
                $e->description,
                $e->counterparty,
                // masuk/keluar dari sudut pandang kas; transfer antar dompet tidak dihitung keduanya
                in_array($e->type, ['income', 'receivable_payment', 'loan_received', 'savings_withdrawal'], true) ? $amount : null,
                in_array($e->type, ['expense', 'receivable_issue', 'loan_payment', 'savings_deposit'], true) ? $amount : null,
            ];
        }
        $transactions->fromArray($rows);
        if (count($rows) > 1) {
            $transactions->getStyle('A2:A'.count($rows))->getNumberFormat()->setFormatCode('yyyy-mm-dd');
        }
        $this->table($transactions, count($rows), 9, 'H');

        // ── Analisis (flat key-value, mudah dibaca AI/spreadsheet) ──
        $analisis = $book->createSheet()->setTitle('Analisis');
        $savingsRate = $income > 0 ? round($net / $income * 100, 1) : 0;
        $analisisRows = [
            ['## RINGKASAN CASHFLOW'],
            ['periode_dari', $from],
            ['periode_sampai', $to],
            ['pemasukan_total', $income],
            ['pemasukan_rutin', $recurring],
            ['pengeluaran_total', $expense],
            ['arus_bersih', $net],
            ['rasio_tabungan_persen', $savingsRate],
            ['status', $net >= 0 ? 'surplus' : 'defisit'],
            [],
            ['## PENGELUARAN PER KATEGORI'],
            ['kategori', 'total', 'persen_dari_pengeluaran'],
        ];
        $expenseByCat = $this->categoryTotals($userId, 'expense', $from, $to);
        foreach ($expenseByCat as $cat) {
            $analisisRows[] = [$cat->name, (int) $cat->total, $expense > 0 ? round((int) $cat->total / $expense * 100, 1) : 0];
        }
        $analisisRows[] = [];
        $analisisRows[] = ['## PEMASUKAN PER KATEGORI'];
        $analisisRows[] = ['kategori', 'total', 'persen_dari_pemasukan'];
        foreach ($this->categoryTotals($userId, 'income', $from, $to) as $cat) {
            $analisisRows[] = [$cat->name, (int) $cat->total, $income > 0 ? round((int) $cat->total / $income * 100, 1) : 0];
        }
        $analisisRows[] = [];
        $analisisRows[] = ['## SARAN OTOMATIS'];
        $analisisRows[] = ['prioritas', 'kategori', 'masalah', 'rekomendasi'];
        if ($net < 0) {
            $analisisRows[] = ['tinggi', '-', 'defisit', 'Pengeluaran melebihi pemasukan. Tinjau kategori dengan kontribusi tertinggi.'];
        }
        foreach ($expenseByCat as $cat) {
            $share = $expense > 0 ? round((int) $cat->total / $expense * 100, 1) : 0;
            if ($share >= 30) {
                $analisisRows[] = ['sedang', $cat->name, "{$share}% dari pengeluaran", 'Tekan kategori ini ke bawah 30% dari total pengeluaran.'];
            }
        }
        $analisis->fromArray($analisisRows);
        $analisis->getColumnDimension('A')->setWidth(28);
        $analisis->getColumnDimension('B')->setWidth(18);

        // ── Sumber Dana ──
        $sheet = $book->createSheet()->setTitle('Sumber Dana');
        $rows = [['Nama', 'Tipe', 'Saldo awal', 'Tanggal saldo awal', 'Saldo saat ini', 'Aktif']];
        foreach ($sources as $s) {
            $rows[] = [$s->name, $s->type, $s->opening_balance_minor, $s->opening_date->toDateString(), $balanceOf($s), $s->is_active ? 'Ya' : 'Tidak'];
        }
        $sheet->fromArray($rows);
        $this->table($sheet, count($rows), 6, 'C', ['D', 'F']);

        // ── Tabungan ──
        $sheet = $book->createSheet()->setTitle('Tabungan');
        $rows = [['Nama', 'Target', 'Saldo', 'Progres %', 'Target tanggal', 'Status']];
        foreach ($goals as $g) {
            $rows[] = [$g->name, $g->target_minor, $goalBalance($g), $g->target_minor > 0 ? round($goalBalance($g) / $g->target_minor * 100, 1) : 0, $g->target_date?->toDateString(), $g->status];
        }
        $sheet->fromArray($rows);
        $this->table($sheet, count($rows), 6, 'B', ['D', 'E', 'F']);

        // ── Kasbon & Pinjaman ──
        foreach (['Kasbon' => [Receivable::class, 'issued_at'], 'Pinjaman' => [LoanPayable::class, 'received_at']] as $title => [$model, $dateColumn]) {
            $sheet = $book->createSheet()->setTitle($title);
            $rows = [['Pihak', 'Pokok', 'Sisa', 'Tanggal', 'Jatuh tempo', 'Status', 'Catatan']];
            foreach ($model::where('user_id', $userId)->orderBy($dateColumn)->get() as $item) {
                $rows[] = [$item->counterparty, $item->principal_minor, $item->outstanding_minor, $item->{$dateColumn}->toDateString(), $item->due_date?->toDateString(), $item->status, $item->notes];
            }
            $sheet->fromArray($rows);
            $this->table($sheet, count($rows), 7, 'B', ['D', 'E', 'F', 'G']);
        }

        $book->setActiveSheetIndex(0);
        $filename = "dompetku-{$from}-{$to}.xlsx";

        return response()->streamDownload(function () use ($book) {
            (new Xlsx($book))->save('php://output');
            $book->disconnectWorksheets();
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    private function header(Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle($range)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF0F1222');
    }

    /** Header berwarna, freeze baris 1, autofilter, format rupiah mulai kolom $moneyFrom (kecuali $notMoney). */
    private function table(Worksheet $sheet, int $rows, int $columns, string $moneyFrom, array $notMoney = []): void
    {
        $last = Coordinate::stringFromColumnIndex($columns);
        $this->header($sheet, "A1:{$last}1");
        $sheet->freezePane('A2');
        $sheet->setAutoFilter("A1:{$last}{$rows}");
        for ($i = Coordinate::columnIndexFromString($moneyFrom); $i <= $columns && $rows > 1; $i++) {
            $column = Coordinate::stringFromColumnIndex($i);
            if (! in_array($column, $notMoney, true)) {
                $sheet->getStyle("{$column}2:{$column}{$rows}")->getNumberFormat()->setFormatCode(self::RUPIAH);
            }
        }
        for ($i = 1; $i <= $columns; $i++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setAutoSize(true);
        }
    }

    private function categoryTotals(int $userId, string $type, string $from, string $to)
    {
        $minor = $type === 'expense' ? 'debit' : 'credit';
        $fallback = $type === 'expense' ? 'Lainnya' : 'Pemasukan lain';

        return DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')->leftJoin('categories', 'categories.id', '=', 'journal_lines.category_id')
            ->where('journal_entries.user_id', $userId)->where('journal_entries.status', 'posted')->where('journal_entries.type', $type)->where('journal_lines.account_type', $type)->whereBetween('journal_entries.effective_date', [$from, $to])
            ->groupBy('categories.id', 'categories.name', 'categories.color')->selectRaw("COALESCE(categories.id, 0) AS id, COALESCE(categories.name, '{$fallback}') AS name, COALESCE(categories.color, '#64748b') AS color, SUM(journal_lines.{$minor}_minor) AS total")->orderByDesc('total')->get();
    }
}
