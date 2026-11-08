<?php

namespace App\Services;

use App\Models\JournalEntry;
use Illuminate\Support\Facades\DB;

/**
 * Saran otomatis berbasis patokan 50/30/20 (Warren & Tyagi, All Your Worth, 2005):
 * tabungan >=20% pemasukan, kebutuhan wajib +-50%, gaya hidup +-30%.
 * Dana darurat 3-6x pengeluaran bulanan (patokan umum perencana keuangan/CFP Board).
 */
class InsightService
{
    public static function build(int $userId, ?string $month, ?int $savings = null): array
    {
        if (! $month) {
            return [];
        }
        $mFrom = $month.'-01';
        $mTo = date('Y-m-t', strtotime($mFrom));
        $rp = fn (int $n) => 'Rp'.number_format($n, 0, ',', '.');
        $bln = ['01' => 'Januari', '02' => 'Februari', '03' => 'Maret', '04' => 'April', '05' => 'Mei', '06' => 'Juni', '07' => 'Juli', '08' => 'Agustus', '09' => 'September', '10' => 'Oktober', '11' => 'November', '12' => 'Desember'];
        $monthLabel = ($bln[substr($month, 5, 2)] ?? $month).' '.substr($month, 0, 4);

        // satu query agregat untuk pemasukan, gaji rutin, pengeluaran, dan setoran tabungan bulan ini
        $totals = JournalEntry::ownedBy($userId)->where('status', 'posted')->whereBetween('effective_date', [$mFrom, $mTo])
            ->selectRaw(implode(', ', [
                "COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS income",
                "COALESCE(SUM(CASE WHEN type = 'income' AND is_recurring = ? THEN amount_minor ELSE 0 END), 0) AS base_income",
                "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expense",
                "COALESCE(SUM(CASE WHEN type = 'savings_deposit' THEN amount_minor ELSE 0 END), 0) AS dep",
            ]), [true])->toBase()->first();
        $income = (int) $totals->income;
        // patokan persentase = pemasukan rutin (gaji); bonus/thr (is_recurring=false) tidak menggelembungkan denominator
        $baseIncome = (int) $totals->base_income;
        $bonus = max($income - $baseIncome, 0);
        $expense = (int) $totals->expense;
        // nabung bulan ini: setor dari kas + setoran dari luar (mis. istri)
        $dep = (int) $totals->dep;
        $depExternal = (int) DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_entries.user_id', $userId)->where('journal_entries.status', 'posted')
            ->where('journal_entries.type', 'savings_deposit')->where('journal_lines.account_type', 'external_contribution')
            ->whereBetween('journal_entries.effective_date', [$mFrom, $mTo])->sum('journal_lines.credit_minor');
        if ($income === 0 && $expense === 0) {
            return [];
        }

        $cats = self::categoryTotals($userId, $mFrom, $mTo);
        $bucketOf = fn (object $c) => $c->bucket ?? 'lifestyle';
        $essentials = (int) $cats->filter(fn ($c) => $bucketOf($c) === 'essential')->sum('total');
        $lifestyle = (int) $cats->filter(fn ($c) => $bucketOf($c) === 'lifestyle')->sum('total');
        $savingCat = (int) $cats->filter(fn ($c) => $bucketOf($c) === 'saving')->sum('total');

        $insights = [];
        $net = $income - $expense;
        $budgetNet = $baseIncome - $expense;

        // 1. sisa uang / hemat — patokan: gaji rutin
        if ($baseIncome > 0) {
            $denom = $baseIncome;
            $rate = round($budgetNet / $denom * 100, 1);
            $bonusNote = $bonus > 0 ? " Bonus {$rp($bonus)} tercatat terpisah dan tidak dihitung sebagai anggaran bulanan." : '';
            if ($budgetNet >= 0) {
                $insights[] = [
                    'type' => $rate >= 20 ? 'positive' : 'warning',
                    'text' => "Dari gaji rutin {$rp($baseIncome)}, sisa anggaran {$rp($budgetNet)} (hemat {$rate}%). Patokan sehat: mampu menyisakan 20% — ".($rate >= 20 ? 'sudah lolos.' : 'belum tercapai.').$bonusNote,
                ];
            } else {
                $insights[] = ['type' => 'warning', 'text' => "Bulan ini uang keluar {$rp($expense)}, lebih besar dari uang masuk {$rp($income)} — jebol {$rp(abs($net))}. Cek pos fleksibel dulu sebelum kebutuhan wajib.".$bonusNote];
            }
            // nabung bulan ini (dari saldo + dari luar)
            if ($dep > 0) {
                $fromOwn = $dep - $depExternal;
                $detail = $depExternal > 0
                    ? " ({$rp($fromOwn)} dari saldo lo + {$rp($depExternal)} dari luar)"
                    : '';
                $insights[] = ['type' => 'positive', 'text' => "Bulan ini lo nabung {$rp($dep)}{$detail}."];
            }
        }

        // 2. kebutuhan wajib — patokan: gaji rutin
        if ($baseIncome > 0 && ($essentials > 0 || $lifestyle > 0)) {
            $shareE = round($essentials / $baseIncome * 100, 1);
            $insights[] = $shareE > 50
                ? ['type' => 'warning', 'text' => "Kebutuhan wajib (keluarga, rumah tangga, makan, transport) pakai {$rp($essentials)} = {$shareE}% uang masuk — sedikit di atas batas wajar 50%. Ini kewajiban, bukan boros: solusinya efisiensi harga atau tambah pemasukan, bukan memangkasnya."]
                : ['type' => 'positive', 'text' => "Kebutuhan wajib (keluarga, rumah tangga, makan, transport) pakai {$rp($essentials)} = {$shareE}% uang masuk — wajar (patokan maksimal 50%)."];
            $shareL = round($lifestyle / $baseIncome * 100, 1);
            if ($lifestyle > 0 && $shareL > 30) {
                $over = $lifestyle - (int) round($baseIncome * 0.3);
                $insights[] = ['type' => 'warning', 'text' => "Pos santai (belanja, olahraga, lain-lain) {$rp($lifestyle)} = {$shareL}% uang masuk — lewat batas wajar 30%. Kalau mau hemat, tekan sekitar {$rp($over)}/bulan dari sini dulu."];
            } elseif ($lifestyle > 0) {
                $insights[] = ['type' => 'positive', 'text' => "Pos santai cuma {$rp($lifestyle)} = {$shareL}% uang masuk — jauh di bawah batas 30%. Aman."];
            }
        }

        // 3. pos terbesar
        $top = $cats->first();
        if ($top && $expense > 0) {
            $shareE = round((int) $top->total / $expense * 100, 1);
            $shareI = $baseIncome > 0 ? round((int) $top->total / $baseIncome * 100, 1) : 0;
            $isEssential = $bucketOf($top) === 'essential';
            $hint = $isEssential
                ? 'Ini kewajiban rutin — hematnya lewat harga/langganan yang lebih murah, bukan dikurangi porsinya'
                : 'Ini pos fleksibel — target pertama kalau mau menekan pengeluaran';
            $insights[] = [
                'type' => $isEssential ? 'positive' : 'warning',
                'text' => "Pos terbesar bulan {$monthLabel}: {$top->name} {$rp((int) $top->total)} ({$shareE}% dari total pengeluaran, {$shareI}% dari uang masuk). {$hint}.",
            ];
        }

        // 4. spike vs rata-rata 5 bulan sebelumnya
        $prev = JournalEntry::ownedBy($userId)->where('status', 'posted')->whereIn('type', ['income', 'expense'])
            ->whereBetween('effective_date', [date('Y-m-01', strtotime("$mFrom -5 months")), date('Y-m-t', strtotime("$mFrom -1 month"))])
            ->selectRaw((DB::getDriverName() === 'pgsql' ? "to_char(effective_date, 'YYYY-MM')" : "strftime('%Y-%m', effective_date)").' AS m, type, SUM(amount_minor) AS s')
            ->groupBy('m', 'type')->get();
        $prevExpense = $prev->where('type', 'expense');
        $avgPrevExpense = $prevExpense->count() > 0 ? (int) round($prevExpense->sum('s') / $prevExpense->count()) : 0;
        if ($avgPrevExpense > 0 && $expense > $avgPrevExpense * 1.5) {
            $insights[] = ['type' => 'warning', 'text' => 'Pengeluaran bulan ini naik '.round(($expense / $avgPrevExpense - 1) * 100)."% dari biasanya (rata-rata 5 bulan terakhir {$rp($avgPrevExpense)}/bulan). Ada pengeluaran tak terduga?"];
        }

        // 5. dana darurat (hanya kalau caller kasih saldo tabungan)
        if ($savings !== null && $savings > 0) {
            $avgExpense = $avgPrevExpense > 0 ? $avgPrevExpense : $expense;
            if ($avgExpense > 0) {
                $months = round($savings / $avgExpense, 1);
                $insights[] = $months < 3
                    ? ['type' => 'warning', 'text' => "Kalau seandainya gaji berhenti, tabungan lo ({$rp($savings)}) sanggup hidup {$months} bulan. Target aman: 3–6 bulan — masih kurang {$rp(max($avgExpense * 3 - $savings, 0))}."]
                    : ['type' => 'positive', 'text' => "Tabungan lo ({$rp($savings)}) setara {$months} bulan biaya hidup — sudah masuk rentang aman dana darurat (3–6 bulan)."];
            }
        }

        // 6. kategori Tabungan yang dicatat sebagai pengeluaran
        if ($savingCat > 0) {
            $insights[] = ['type' => 'positive', 'text' => "Lo nyatat {$rp($savingCat)} dengan kategori Tabungan sebagai pengeluaran. Supaya saldo tujuan tabungan ikut nambah dan nggak dihitung sebagai konsumsi, lebih baik pakai menu Tabungan untuk mencatat setoran."];
        }

        return $insights;
    }

    private static function categoryTotals(int $userId, string $from, string $to)
    {
        // semua debit ke kategori (apapun tipe entry-nya) = uang yang keluar ke pos itu; bucket dari kolom categories.bucket
        return DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->leftJoin('categories', 'categories.id', '=', 'journal_lines.category_id')
            ->where('journal_entries.user_id', $userId)
            ->where('journal_entries.status', 'posted')
            ->where('journal_lines.account_type', 'expense')
            ->whereBetween('journal_entries.effective_date', [$from, $to])
            ->groupBy('categories.id', 'categories.name', 'categories.bucket')
            ->selectRaw("COALESCE(categories.id, 0) AS id, COALESCE(categories.name, 'Lainnya') AS name, COALESCE(categories.bucket, 'lifestyle') AS bucket, SUM(journal_lines.debit_minor) AS total")
            ->orderByDesc('total')->get();
    }
}
