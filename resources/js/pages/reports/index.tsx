import { Head, Link, router } from '@inertiajs/react';
import { CalendarRange, CircleAlert, CircleCheck, Download, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, Field, Page, PageHeader, Panel, Section, Segmented } from '@/components/finance/kit';
import { Money } from '@/components/finance/money';
import { dayLabel, localDate, monthLabel, rupiah, shortDate, shiftMonth } from '@/lib/format';
import { locale, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Month = { month: string; income: number; expense: number };
type CategoryTotal = { id: number; name: string; color: string; total: number };
type CategoryTx = { type?: string; category_id?: number | null; title: string; amount: number; date: string };
type Kind = 'expense' | 'income';

type Props = {
    filters: { from: string; to: string };
    summary: { income: number; expense: number; recurringIncome: number; bonusIncome: number };
    monthly: Month[];
    expenseByCategory: CategoryTotal[];
    incomeByCategory: CategoryTotal[];
    insights: { type: 'positive' | 'warning'; text: string }[];
    categoryTransactions: Record<string, CategoryTx[]>;
};

/** First day of the month `back` months ago, as YYYY-MM-DD in local time. */
const monthStart = (back: number) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const shortMonth = (month: string) =>
    new Intl.DateTimeFormat(locale() === 'en' ? 'en-US' : 'id-ID', { month: 'short' }).format(new Date(`${month}-01T12:00:00`));

export default function Reports({ filters, summary, monthly, expenseByCategory, incomeByCategory, insights, categoryTransactions }: Props) {
    const today = localDate();
    const presets = [
        { label: t('Bulan ini'), from: monthStart(0) },
        { label: t('3 bulan'), from: monthStart(2) },
        { label: t('6 bulan'), from: monthStart(5) },
        { label: t('Tahun ini'), from: `${today.slice(0, 4)}-01-01` },
    ];
    const activePreset = filters.to === today ? presets.find((p) => p.from === filters.from) : undefined;
    const [customOpen, setCustomOpen] = useState(!activePreset);
    const [kind, setKind] = useState<Kind>('expense');
    const [category, setCategory] = useState<CategoryTotal | null>(null);
    const [month, setMonth] = useState<Month | null>(null);

    const income = Number(summary.income) || 0;
    const expense = Number(summary.expense) || 0;
    const net = income - expense;
    const list = kind === 'expense' ? expenseByCategory : incomeByCategory;
    const listTotal = list.reduce((sum, c) => sum + Number(c.total), 0);
    // every month in range gets a slot; months with no entries show as zero ticks
    const trend: Month[] = (() => {
        const filled: Month[] = [];
        const byMonth = new Map(monthly.map((m) => [m.month, m]));
        for (let m = filters.from.slice(0, 7); m <= filters.to.slice(0, 7); m = shiftMonth(m, 1)) {
            filled.push(byMonth.get(m) ?? ({ month: m, income: 0, expense: 0 } as Month));
        }
        return filled;
    })();
    const insightMonth = monthly.at(-1)?.month;
    const max = Math.max(...trend.flatMap((m) => [Number(m.income), Number(m.expense)]), 1);
    const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
    // uncategorised totals come back as id 0; their transactions are grouped under the null key ''
    const txFor = (cat: CategoryTotal) =>
        (categoryTransactions[cat.id === 0 ? '' : String(cat.id)] ?? []).filter((tx) => !tx.type || tx.type === kind);

    const applyCustom = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        router.get('/reports', { from: String(data.get('from') ?? ''), to: String(data.get('to') ?? '') }, { preserveState: true, preserveScroll: true });
    };

    const exportLink = (className: string) => (
        <a href={`/exports/finance.xlsx?from=${filters.from}&to=${filters.to}`} download className={className}>
            <Download className="size-4" /> {t('Export Excel')}
        </a>
    );

    return (
        <>
            <Head title={t('Laporan')} />
            <Page>
                <PageHeader
                    title={t('Laporan')}
                    description={`${shortDate(filters.from)} – ${shortDate(filters.to)}`}
                    actions={exportLink('btn-kuning hidden min-h-11 items-center gap-2 rounded-xl px-4 text-sm lg:inline-flex')}
                >
                    <div className="flex flex-col gap-3">
                        <nav aria-label={t('Rentang waktu')} className="scroll-x -mx-4 gap-1.5 px-4 sm:mx-0 sm:px-0">
                            {presets.map((p) => (
                                <Link
                                    key={p.label}
                                    href={`/reports?from=${p.from}&to=${today}`}
                                    prefetch={['hover']}
                                    preserveScroll
                                    onClick={() => setCustomOpen(false)}
                                    aria-current={activePreset === p && !customOpen ? 'true' : undefined}
                                    className="chip"
                                >
                                    {p.label}
                                </Link>
                            ))}
                            <button
                                type="button"
                                aria-pressed={customOpen}
                                aria-expanded={customOpen}
                                onClick={() => setCustomOpen((v) => !v)}
                                className="chip gap-1.5"
                            >
                                <CalendarRange className="size-4" /> {t('Pilih tanggal')}
                            </button>
                        </nav>
                        {customOpen && (
                            <form key={`${filters.from}-${filters.to}`} onSubmit={applyCustom} className="grid grid-cols-2 items-end gap-3 sm:flex">
                                <Field label={t('Dari')} htmlFor="rp-from" className="sm:w-44">
                                    <input id="rp-from" name="from" type="date" defaultValue={filters.from} required className="field" />
                                </Field>
                                <Field label={t('Sampai')} htmlFor="rp-to" className="sm:w-44">
                                    <input id="rp-to" name="to" type="date" defaultValue={filters.to} required className="field" />
                                </Field>
                                <button type="submit" className="chip col-span-2 min-h-11 justify-center sm:col-span-1">
                                    {t('Terapkan')}
                                </button>
                            </form>
                        )}
                    </div>
                </PageHeader>

                <section aria-label={t('Ringkasan rentang')} className="plank-papan flex flex-col gap-6 p-5 sm:p-7">
                    <div>
                        <p className="label-caps">{t('Arus kas bersih')}</p>
                        <Money value={net} sign={net > 0 ? '+' : undefined} className="mt-3 block text-[clamp(2.5rem,10.5vw,3.75rem)]" />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-4">
                        <div>
                            <dt className="label-caps">{t('Masuk')}</dt>
                            <dd className="mt-1.5">
                                <Money value={income} sign="+" className="text-xl sm:text-2xl" />
                            </dd>
                        </div>
                        <div>
                            <dt className="label-caps">{t('Keluar')}</dt>
                            <dd className="mt-1.5">
                                <Money value={expense} sign="−" className="text-xl sm:text-2xl" />
                            </dd>
                        </div>
                        <div>
                            <dt className="label-caps">{t('Gaji rutin')}</dt>
                            <dd className="mt-1.5">
                                <Money value={summary.recurringIncome} sign="+" className="text-xl" />
                                {summary.bonusIncome > 0 && (
                                    <span className="text-papan-soft mt-1 block text-xs">
                                        {t('Bonus (di luar patokan)')} {rupiah(summary.bonusIncome)}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="label-caps">{t('Sisa berdasarkan gaji')}</dt>
                            <dd className="mt-1.5">
                                <Money value={summary.recurringIncome - expense} className="text-xl" />
                            </dd>
                        </div>
                    </dl>
                </section>

                <Section title={t('Tren bulanan')}>
                    {trend.length === 0 || monthly.length === 0 ? (
                        <EmptyState icon={ReceiptText} title={t('Belum ada data di rentang ini.')} text={t('Coba rentang lain, atau catat transaksi dulu.')} />
                    ) : (
                        <div className="plank p-4 sm:p-5">
                            <div className="text-muted-foreground mb-3 flex gap-4 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <span className="bg-masuk size-2.5 rounded-sm" /> + {t('Masuk')}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="bg-keluar size-2.5 rounded-sm" /> − {t('Keluar')}
                                </span>
                            </div>
                            <ul
                                aria-label={t('Tren bulanan')}
                                className="scroll-x -mx-1 gap-1 px-1"
                                // phones: open on the latest month, older ones scroll in from the left
                                ref={(el) => {
                                    if (el) el.scrollLeft = el.scrollWidth;
                                }}
                            >
                                {trend.map((m) => (
                                    <li key={m.month} className="flex min-w-14 max-w-24 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => setMonth(m)}
                                            aria-label={`${monthLabel(m.month)}: ${t('Masuk')} +${rupiah(Number(m.income))}, ${t('Keluar')} −${rupiah(Number(m.expense))}`}
                                            className="row-press flex w-full flex-col items-center gap-2 rounded-lg px-1 pt-2 pb-1"
                                        >
                                            <span className="flex h-44 items-end gap-1" aria-hidden="true">
                                                <span className="bg-masuk w-4 rounded-t-sm sm:w-5" style={{ height: `${Number(m.income) ? Math.max((Number(m.income) / max) * 100, 2) : 0}%` }} />
                                                <span className="bg-keluar w-4 rounded-t-sm sm:w-5" style={{ height: `${Number(m.expense) ? Math.max((Number(m.expense) / max) * 100, 2) : 0}%` }} />
                                            </span>
                                            <span className="text-muted-foreground text-xs capitalize" aria-hidden="true">
                                                {shortMonth(m.month)}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Section>

                <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
                    <Section title={kind === 'expense' ? t('Ke mana uangnya') : t('Dari mana uangnya')} className="lg:col-span-7">
                        <Segmented<Kind>
                            label={t('Jenis kategori')}
                            value={kind}
                            onChange={setKind}
                            options={[
                                { value: 'expense', label: t('Pengeluaran') },
                                { value: 'income', label: t('Pemasukan') },
                            ]}
                        />
                        {kind === 'expense' && income > 0 && expense > 0 && (
                            <p className="text-muted-foreground text-sm">
                                {t('Keluar')} {pct(expense, income)}% {t('dari pemasukan')} · {net >= 0 ? t('sisa') : t('tekor')}{' '}
                                <span className={cn('font-semibold', net >= 0 ? 'text-masuk' : 'text-keluar')}>
                                    {net >= 0 ? '+' : '−'}
                                    {rupiah(Math.abs(net))}
                                </span>
                            </p>
                        )}
                        <div className="plank p-2 sm:p-3">
                            {list.length === 0 ? (
                                <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                                    {kind === 'expense' ? t('Belum ada pengeluaran di rentang ini.') : t('Belum ada pemasukan di rentang ini.')}
                                </p>
                            ) : (
                                <ul className="flex flex-col">
                                    {list.map((cat) => {
                                        const share = listTotal > 0 ? (Number(cat.total) / listTotal) * 100 : 0;
                                        return (
                                            <li key={cat.id}>
                                                <button type="button" onClick={() => setCategory(cat)} className="row-press flex w-full flex-col gap-2 rounded-lg px-3 py-3 text-left">
                                                    <span className="flex w-full items-baseline gap-3">
                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{cat.name}</span>
                                                        <span className="text-muted-foreground text-xs tabular-nums">{Math.round(share)}%</span>
                                                        <Money value={Number(cat.total)} className="text-lg" />
                                                    </span>
                                                    <span className="bg-sunken block h-2.5 w-full overflow-hidden rounded-full">
                                                        <span className="block h-full rounded-full" style={{ width: `${Math.max(share, 1.5)}%`, background: cat.color }} />
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </Section>

                    <Section title={t('Kata DompetKu')} className="lg:col-span-5">
                        {insightMonth && (
                            <p className="text-muted-foreground -mt-1 text-sm">
                                {t('Berdasarkan bulan')} <span className="text-foreground font-medium capitalize">{monthLabel(insightMonth)}</span>
                            </p>
                        )}
                        {insights.length === 0 ? (
                            <p className="plank text-muted-foreground p-4 text-sm">{t('Belum ada saran buat rentang ini.')}</p>
                        ) : (
                            <ul className="bg-sunken divide-border flex flex-col divide-y rounded-[var(--radius)]">
                                {insights.map((insight, i) => (
                                    <li key={i} className="flex items-start gap-3 p-4 text-sm leading-relaxed">
                                        {insight.type === 'positive' ? (
                                            <CircleCheck className="text-masuk mt-0.5 size-4 shrink-0" aria-label={t('Aman')} />
                                        ) : (
                                            <CircleAlert className="dark:text-kuning mt-0.5 size-4 shrink-0 text-[#a16207]" aria-label={t('Perhatian')} />
                                        )}
                                        <span>{insight.text}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            {t(
                                'Patokan: aturan 50/30/20 — Warren & Tyagi, All Your Worth (2005): tabungan ≥20% pemasukan; satu kategori idealnya <50% pemasukan; dana darurat ideal 3–6× pengeluaran bulanan.',
                            )}
                        </p>
                        {exportLink('btn-kuning inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm lg:hidden')}
                    </Section>
                </div>
            </Page>

            <Panel
                open={category !== null}
                onOpenChange={(open) => !open && setCategory(null)}
                title={category?.name ?? ''}
                description={
                    category
                        ? [
                              rupiah(Number(category.total)),
                              `${pct(Number(category.total), listTotal)}% ${kind === 'expense' ? t('dari pengeluaran') : t('dari pemasukan')}`,
                              ...(kind === 'expense' && income > 0 ? [`${pct(Number(category.total), income)}% ${t('dari pemasukan')}`] : []),
                              `#${list.indexOf(category) + 1}`,
                          ].join(' · ')
                        : undefined
                }
            >
                {category && <TxList items={txFor(category)} kind={kind} />}
            </Panel>

            <Panel open={month !== null} onOpenChange={(open) => !open && setMonth(null)} title={month ? monthLabel(month.month) : ''}>
                {month && (
                    <dl className="plank divide-border divide-y">
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                            <dt className="text-sm">{t('Masuk')}</dt>
                            <dd>
                                <Money value={Number(month.income)} sign="+" className="text-masuk text-lg" />
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                            <dt className="text-sm">{t('Keluar')}</dt>
                            <dd>
                                <Money value={Number(month.expense)} sign="−" className="text-keluar text-lg" />
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                            <dt className="text-sm font-semibold">{t('Arus bersih')}</dt>
                            <dd>
                                <Money value={month.income - month.expense} sign={month.income - month.expense > 0 ? '+' : undefined} className="text-2xl" />
                            </dd>
                        </div>
                    </dl>
                )}
            </Panel>
        </>
    );
}

function TxList({ items, kind }: { items: CategoryTx[]; kind: Kind }) {
    if (items.length === 0) return <p className="text-muted-foreground py-6 text-center text-sm">{t('Belum ada transaksi.')}</p>;
    return (
        <ul className="plank divide-border divide-y">
            {items.map((tx, i) => (
                <li key={`${tx.date}-${i}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{tx.title}</span>
                        <span className="text-muted-foreground text-xs">{dayLabel(tx.date)}</span>
                    </span>
                    <Money value={tx.amount} sign={kind === 'income' ? '+' : '−'} className={cn('text-lg', kind === 'income' ? 'text-masuk' : 'text-keluar')} />
                </li>
            ))}
        </ul>
    );
}

Reports.layout = { breadcrumbs: [{ title: t('Laporan'), href: '/reports' }] };
