import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, CircleAlert, CircleCheck, Minus, Plus, ReceiptText } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState, Page, Panel } from '@/components/finance/kit';
import { Money } from '@/components/finance/money';
import { useQuickEntry } from '@/components/quick-entry';
import { compactRupiah, dayLabel, inkOn, monthLabel, rupiah } from '@/lib/format';
import { entryType, flowClass, flowSign, sourceIcon, sourceTypeLabel } from '@/lib/finance';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Period = 'current' | 'previous' | 'three_months';
type Summary = {
    netWorth: number;
    periodBalance: number;
    availableBalance: number;
    income: number;
    recurringIncome: number;
    bonusIncome: number;
    expense: number;
    savingDeposits: number;
    savingWithdrawals: number;
    savings: number;
    receivables: number;
    loans: number;
};
type SourceBalance = { id: number; name: string; type: string; color: string; balance: number };
type CategoryExpense = { id: number; name: string; color: string; total: number };
type Tx = { title: string; amount: number; date: string; category_id?: number | null; recurring?: boolean };
type Recent = {
    id: string;
    type: string;
    amount: number;
    date: string;
    description: string;
    title: string | null;
    counterparty: string | null;
    fund_source_id: number | null;
    category_id: number | null;
    is_recurring: boolean;
};
type Insight = { type: 'positive' | 'warning'; text: string };
type Goal = { id: number; name: string; color: string; target: number; balance: number };
type Trend = { month: string; income: number; expense: number };

type Props = {
    period: Period;
    range: { start: string; end: string };
    summary: Summary;
    sourceBalances: SourceBalance[];
    expenseByCategory: CategoryExpense[];
    categoryTransactions: Record<string, Tx[]>;
    recentTransactions: Recent[];
    insights: Insight[];
    trend: Trend[];
    incomeTransactions: Tx[];
    savingGoals: Goal[];
};

type Detail =
    | { kind: 'balance' }
    | { kind: 'income' }
    | { kind: 'expense' }
    | { kind: 'assets' }
    | { kind: 'category'; category: CategoryExpense }
    | { kind: 'day'; date: string }
    | { kind: 'insight'; insight: Insight }
    | { kind: 'insights' };

// fixed heat ramp: a colour step means the same amount every month
const heatLevel = (amount: number) => (amount <= 0 ? 0 : amount <= 50_000 ? 1 : amount <= 150_000 ? 2 : amount <= 500_000 ? 3 : 4);
const HEAT = ['bg-heat-0 text-muted-foreground', 'bg-heat-1 text-foreground', 'bg-heat-2 text-foreground', 'bg-heat-3 text-[#0f1222] dark:text-white', 'bg-heat-4 text-white dark:text-[#0b0a14]'];

/** Pull the headline figure out of an insight sentence ("7.3%", "2.9 bulan"). */
const headline = (text: string) => {
    const pct = text.match(/(\d+(?:[.,]\d+)?)\s?%/);
    if (pct) return `${pct[1].replace('.', ',')}%`;
    const months = text.match(/(\d+(?:[.,]\d+)?)\s?bulan/);
    if (months) return `${months[1].replace('.', ',')} ${t('bln')}`;
    return null;
};

export default function Dashboard(props: Props) {
    const { period, range, summary, sourceBalances, expenseByCategory, categoryTransactions, recentTransactions, insights, trend, savingGoals } = props;
    const { auth } = usePage().props;
    const openEntry = useQuickEntry();
    const [detail, setDetail] = useState<Detail | null>(null);

    const expenses = useMemo(() => Object.values(categoryTransactions).flat().sort((a, b) => b.date.localeCompare(a.date)), [categoryTransactions]);
    const firstName = auth.user.name.split(' ')[0];
    const rangeLabel =
        range.start.slice(0, 7) === range.end.slice(0, 7)
            ? monthLabel(range.start.slice(0, 7))
            : `${monthLabel(range.start.slice(0, 7)).split(' ')[0]} – ${monthLabel(range.end.slice(0, 7))}`;
    const periodLabel = { current: t('Sisa bulan ini'), previous: t('Sisa bulan lalu'), three_months: t('Sisa 3 bulan') }[period];
    const used = summary.recurringIncome > 0 ? Math.min(summary.expense / summary.recurringIncome, 1.2) : null;
    const saved = summary.savingDeposits - summary.savingWithdrawals;
    const totalAssets = summary.availableBalance + summary.savings + summary.receivables;
    const today = new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const monthParam = range.end.slice(0, 7);

    const periods = (full: boolean) => (
        <nav aria-label={t('Periode')} className={cn('bg-card border-border gap-1 border p-1', full ? 'grid grid-cols-3 rounded-2xl' : 'flex rounded-full')}>
            {(
                [
                    ['current', t('Bulan ini')],
                    ['previous', t('Bulan lalu')],
                    ['three_months', t('3 bulan')],
                ] as const
            ).map(([value, label]) => (
                <Link
                    key={value}
                    href={value === 'current' ? '/dashboard' : `/dashboard?period=${value}`}
                    prefetch={['mount', 'hover']}
                    preserveScroll
                    aria-current={period === value ? 'true' : undefined}
                    className={cn(
                        'grid min-h-10 place-items-center px-4 text-[0.8125rem] font-bold whitespace-nowrap transition-colors',
                        full ? 'rounded-xl' : 'rounded-full',
                        period === value ? 'bg-foreground text-background dark:text-foreground dark:bg-[#2a2a36]' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {label}
                </Link>
            ))}
        </nav>
    );

    return (
        <>
            <Head title={t('Beranda')} />
            <Page className="lg:gap-5 lg:pt-5">
                <header className="flex items-center justify-between gap-4 px-1">
                    <div>
                        <h1 className="text-[1.375rem] font-extrabold tracking-[-0.04em] lg:text-[1.875rem]">
                            {t('Halo')}, {firstName}
                        </h1>
                        <p className="text-muted-foreground mt-0.5 text-[0.8125rem] capitalize lg:text-sm">{today}</p>
                    </div>
                    <div className="hidden lg:block">{periods(false)}</div>
                </header>
                <div className="-mt-2 lg:hidden">{periods(true)}</div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-12 lg:gap-5">
                    {/* hero: what's left */}
                    <Tile as="button" onClick={() => setDetail({ kind: 'balance' })} className="plank-papan col-span-2 min-h-[13rem] border-transparent p-5 text-left sm:p-6 lg:col-span-5 lg:min-h-[12.5rem]">
                        <span className="text-papan-soft flex items-center justify-between text-[0.8125rem] font-semibold">
                            {periodLabel}
                            <span className="capitalize">{rangeLabel}</span>
                        </span>
                        <Money value={summary.periodBalance} className="mt-4 block text-[clamp(2.5rem,11vw,3.6rem)]" />
                        {used !== null && (
                            <span className="mt-5 inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                                <span className={cn('size-1.5 rounded-full', used > 0.9 ? 'bg-[#ffb547]' : 'bg-masuk')} />
                                {Math.round(used * 100)}% {t('gaji udah kepakai')}
                            </span>
                        )}
                        {used !== null && (
                            <svg viewBox="0 0 200 110" className="absolute -right-8 -bottom-16 w-[180px] sm:w-[240px]" aria-hidden="true">
                                <path d="M20 100a80 80 0 0 1 160 0" stroke="currentColor" strokeOpacity=".1" strokeWidth="18" fill="none" strokeLinecap="round" />
                                <path d="M20 100a80 80 0 0 1 160 0" className="stroke-kuning" strokeWidth="18" fill="none" strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.min(used, 1) * 100} 100`} />
                            </svg>
                        )}
                    </Tile>

                    {/* in / out with 6-month bars */}
                    <FlowTile
                        label={t('Masuk')}
                        value={summary.income}
                        sign="+"
                        tone="masuk"
                        icon={ArrowDownLeft}
                        note={summary.bonusIncome > 0 ? `${t('Gaji')} ${compactRupiah(summary.recurringIncome)} · ${t('bonus')} ${compactRupiah(summary.bonusIncome)}` : t('Semua gaji rutin')}
                        bars={trend.map((m) => m.income)}
                        onClick={() => setDetail({ kind: 'income' })}
                    />
                    <FlowTile label={t('Keluar')} value={summary.expense} sign="−" tone="keluar" icon={ArrowUpRight} note={`${expenses.length} ${t('transaksi')}`} bars={trend.map((m) => m.expense)} onClick={() => setDetail({ kind: 'expense' })} />

                    {/* phones: one-tap capture */}
                    <div className="col-span-2 grid grid-cols-3 gap-2.5 lg:hidden">
                        {(
                            [
                                ['expense', t('Keluar'), Minus, 'bg-keluar-wash text-keluar'],
                                ['income', t('Masuk'), Plus, 'bg-masuk-wash text-masuk'],
                                ['transfer', t('Pindah'), ArrowLeftRight, 'bg-accent text-accent-foreground'],
                            ] as const
                        ).map(([mode, label, Icon, tone]) => (
                            <button key={mode} type="button" onClick={() => openEntry({ mode })} className="plank flex min-h-14 items-center justify-center gap-2 text-[0.8125rem] font-bold active:scale-[0.97]">
                                <span className={cn('grid size-7 place-items-center rounded-lg', tone)}>
                                    <Icon className="size-4" strokeWidth={2.6} />
                                </span>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* total assets */}
                    <Tile as="button" onClick={() => setDetail({ kind: 'assets' })} className="col-span-2 p-5 text-left sm:p-6 lg:col-span-3">
                        <TileCap label={t('Total aset')} />
                        <Money value={totalAssets} className="mt-2.5 mb-3.5 block text-[2rem]" />
                        <span className="mb-1.5 flex h-2 w-full gap-[3px] overflow-hidden rounded-full" aria-hidden="true">
                            <span className="bg-chart-1 rounded-full" style={{ flex: Math.max(summary.availableBalance, 0) || 0.0001 }} />
                            <span className="bg-chart-4 rounded-full" style={{ flex: summary.savings || 0.0001 }} />
                            {summary.receivables > 0 && <span className="bg-chart-5 rounded-full" style={{ flex: summary.receivables }} />}
                        </span>
                        {(
                            [
                                [t('Dompet'), rupiah(summary.availableBalance).replace(/^Rp\s?/, ''), 'bg-chart-1'],
                                [t('Tabungan'), rupiah(summary.savings).replace(/^Rp\s?/, ''), 'bg-chart-4'],
                                [t('Kasbon · Pinjaman'), `${compactRupiah(summary.receivables)} · ${compactRupiah(summary.loans)}`, 'bg-chart-5'],
                            ] as const
                        ).map(([label, value, dot]) => (
                            <span key={label} className="border-border flex w-full items-center justify-between gap-3 border-t py-2.5 text-sm lg:py-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <span className={cn('size-2 rounded-[3px]', dot)} />
                                    {label}
                                </span>
                                <b className="font-bold tabular-nums">{value}</b>
                            </span>
                        ))}
                    </Tile>

                    {/* where it went */}
                    <Donut categories={expenseByCategory} total={summary.expense} onPick={(category) => setDetail({ kind: 'category', category })} />

                    {/* advice */}
                    {insights.length > 0 && (
                        <section aria-label={t('Saran otomatis')} className="plank col-span-2 flex flex-col p-5 sm:p-6 lg:col-span-7">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-[-0.03em]">
                                    {t('Saran buat lo')}
                                    <span className="bg-accent text-accent-foreground rounded-full px-2.5 py-1 text-[0.68rem] font-bold">50/30/20</span>
                                </h2>
                                {insights.length > 3 && (
                                    <button type="button" onClick={() => setDetail({ kind: 'insights' })} className="text-accent-foreground inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-bold hover:underline">
                                        {t('Semua')} ({insights.length}) <ArrowRight className="size-4" />
                                    </button>
                                )}
                            </div>
                            <ul className="mt-4 grid flex-1 gap-2.5 sm:grid-cols-3">
                                {insights.slice(0, 3).map((insight, i) => {
                                    const big = headline(insight.text);
                                    return (
                                        <li key={i}>
                                            <button
                                                type="button"
                                                onClick={() => setDetail({ kind: 'insight', insight })}
                                                className={cn(
                                                    'flex h-full w-full items-center gap-3 rounded-[1.25rem] p-4 text-left text-[0.8125rem] leading-relaxed transition-transform active:scale-[0.98] sm:flex-col sm:items-start',
                                                    insight.type === 'positive' ? 'bg-masuk-wash' : 'bg-warn-wash',
                                                )}
                                            >
                                                <b className={cn('w-[4.5rem] shrink-0 text-[1.375rem] font-extrabold tracking-[-0.04em] sm:w-auto sm:text-2xl', insight.type === 'positive' ? 'text-masuk' : 'text-warn')}>
                                                    {big ?? (insight.type === 'positive' ? <CircleCheck className="size-6" /> : <CircleAlert className="size-6" />)}
                                                </b>
                                                <span className="line-clamp-3 lg:line-clamp-5">{insight.text}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    {/* spending heatmap */}
                    <section aria-label={t('Kalender belanja')} className="plank col-span-2 p-5 sm:p-6 lg:col-span-4">
                        <TileCap label={t('Kalender belanja')} right={<span className="capitalize">{monthLabel(range.end.slice(0, 7)).split(' ')[0]}</span>} />
                        <Heatmap range={range} expenses={expenses} onPick={(date) => setDetail({ kind: 'day', date })} />
                    </section>

                    {/* recent */}
                    <section aria-label={t('Terakhir dicatat')} className="plank col-span-2 p-5 sm:p-6 lg:col-span-5">
                        <TileCap
                            label={t('Terakhir dicatat')}
                            right={
                                <Link href="/transactions" prefetch className="hover:text-foreground inline-flex items-center gap-1">
                                    {t('Semua')} <ArrowRight className="size-3.5" />
                                </Link>
                            }
                        />
                        {recentTransactions.length === 0 ? (
                            <EmptyState
                                className="mt-4"
                                icon={ReceiptText}
                                title={t('Belum ada transaksi')}
                                text={t('Mulai dari pemasukan pertama lo.')}
                                action={
                                    <button type="button" onClick={() => openEntry({ mode: 'income' })} className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm">
                                        <Plus className="size-4" /> {t('Catat pemasukan')}
                                    </button>
                                }
                            />
                        ) : (
                            <ul className="mt-2">
                                {recentTransactions.slice(0, 6).map((tx) => {
                                    const meta = entryType(tx.type);
                                    const editable = tx.type === 'income' || tx.type === 'expense';
                                    const cls = 'row-press -mx-2 flex min-h-[3.75rem] w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left';
                                    const row = (
                                        <>
                                            <span className="bg-sunken text-muted-foreground grid size-10 shrink-0 place-items-center rounded-[14px]">
                                                <meta.icon className="size-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold">{tx.description || meta.label}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {meta.label} · {dayLabel(tx.date)}
                                                </span>
                                            </span>
                                            <Money value={tx.amount} sign={flowSign(meta.flow) as '+' | '−' | ''} className={cn('text-[0.95rem]', flowClass(meta.flow))} />
                                        </>
                                    );
                                    return (
                                        <li key={tx.id} className="border-border border-t first:border-t-0">
                                            {editable ? (
                                                <button
                                                    type="button"
                                                    className={cls}
                                                    onClick={() =>
                                                        openEntry({
                                                            entry: {
                                                                id: tx.id,
                                                                type: tx.type,
                                                                amount: tx.amount,
                                                                date: tx.date,
                                                                description: tx.title,
                                                                counterparty: tx.counterparty,
                                                                fund_source_id: tx.fund_source_id,
                                                                category_id: tx.category_id,
                                                                is_recurring: tx.is_recurring,
                                                            },
                                                        })
                                                    }
                                                >
                                                    {row}
                                                </button>
                                            ) : (
                                                <Link href={`/transactions?month=${tx.date.slice(0, 7)}`} prefetch className={cls}>
                                                    {row}
                                                </Link>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* savings rings + wallets */}
                    <section aria-label={t('Tabungan')} className="plank col-span-2 p-5 sm:p-6 lg:col-span-3">
                        <TileCap label={t('Tabungan')} right={<span>{`${savingGoals.length} ${t('target')}`}</span>} />
                        {savingGoals.length === 0 ? (
                            <Link href="/tabungan" className="text-muted-foreground hover:text-foreground mt-4 block text-sm">
                                {t('Belum ada target. Bikin satu →')}
                            </Link>
                        ) : (
                            <ul className="mt-1">
                                {savingGoals.map((goal) => {
                                    const pct = goal.target > 0 ? Math.min(goal.balance / goal.target, 1) : 0;
                                    return (
                                        <li key={goal.id}>
                                            <Link href="/tabungan" prefetch className="row-press -mx-2 flex items-center gap-3.5 rounded-xl px-2 py-2.5">
                                                <svg viewBox="0 0 36 36" className="size-12 shrink-0 -rotate-90" aria-hidden="true">
                                                    <circle cx="18" cy="18" r="15" fill="none" className="stroke-sunken" strokeWidth="4" />
                                                    <circle cx="18" cy="18" r="15" fill="none" stroke={goal.color} strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct * 100} 100`} />
                                                </svg>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-bold">{goal.name}</span>
                                                    <span className="text-muted-foreground text-xs">
                                                        {compactRupiah(goal.balance)} · {pct >= 1 ? t('tercapai') : `${Math.round(pct * 100)}%`}
                                                    </span>
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <div className="border-border mt-3 border-t pt-3">
                            <p className="text-muted-foreground mb-1 text-xs font-semibold">{t('Dompet')}</p>
                            {sourceBalances.length === 0 ? (
                                <Link href="/fund-sources" className="text-sm font-semibold underline">
                                    {t('Tambah sumber dana')}
                                </Link>
                            ) : (
                                sourceBalances.map((source) => {
                                    const Icon = sourceIcon(source.type);
                                    return (
                                        <Link key={source.id} href="/fund-sources" prefetch className="row-press -mx-2 flex items-center gap-3 rounded-xl px-2 py-2">
                                            <span className="grid size-8 shrink-0 place-items-center rounded-[10px]" style={{ background: source.color, color: inkOn(source.color) }}>
                                                <Icon className="size-3.5" />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{source.name}</span>
                                            <span className="text-sm font-bold tabular-nums">{compactRupiah(source.balance)}</span>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </div>
            </Page>

            <DetailPanel detail={detail} onClose={() => setDetail(null)} props={props} expenses={expenses} periodLabel={periodLabel} saved={saved} monthParam={monthParam} />
        </>
    );
}

function Tile({ as = 'div', className, children, onClick }: { as?: 'div' | 'button'; className?: string; children: ReactNode; onClick?: () => void }) {
    const cls = cn('plank relative flex flex-col overflow-hidden transition-[transform,border-color] duration-200', as === 'button' && 'hover:border-[var(--input)] active:scale-[0.99]', className);
    return as === 'button' ? (
        <button type="button" onClick={onClick} className={cls}>
            {children}
        </button>
    ) : (
        <div className={cls}>{children}</div>
    );
}

function TileCap({ label, right }: { label: string; right?: ReactNode }) {
    return (
        <span className="text-muted-foreground flex w-full items-center justify-between gap-2 text-[0.8125rem] font-semibold">
            <span>{label}</span>
            {right ?? <ArrowUpRight className="size-3.5" />}
        </span>
    );
}

function FlowTile({
    label,
    value,
    sign,
    tone,
    icon: Icon,
    note,
    bars,
    onClick,
}: {
    label: string;
    value: number;
    sign: '+' | '−';
    tone: 'masuk' | 'keluar';
    icon: typeof ArrowUpRight;
    note: string;
    bars: number[];
    onClick: () => void;
}) {
    const max = Math.max(...bars, 1);
    return (
        <Tile as="button" onClick={onClick} className="col-span-1 justify-between gap-4 p-4 text-left sm:p-5 lg:col-span-2">
            <span className="text-muted-foreground flex w-full items-center justify-between text-[0.8125rem] font-semibold">
                {label}
                <span className={cn('grid size-9 place-items-center rounded-xl', tone === 'masuk' ? 'bg-masuk-wash text-masuk' : 'bg-keluar-wash text-keluar')}>
                    <Icon className="size-4" strokeWidth={2.4} />
                </span>
            </span>
            <span>
                <span className={cn('papan-num block text-[1.3rem] sm:text-2xl', tone === 'masuk' ? 'text-masuk' : 'text-keluar')}>
                    {sign}
                    {compactRupiah(value)}
                </span>
                <span className="text-muted-foreground mt-1 line-clamp-2 block text-[0.72rem] font-medium">{note}</span>
            </span>
            <span className="flex h-10 w-full items-end gap-[5px] sm:h-11" aria-hidden="true">
                {bars.map((v, i) => (
                    <span key={i} className={cn('flex-1 rounded-md', i === bars.length - 1 ? (tone === 'masuk' ? 'bg-masuk' : 'bg-keluar') : 'bg-sunken')} style={{ height: `${Math.max((v / max) * 100, 12)}%` }} />
                ))}
            </span>
        </Tile>
    );
}

function Donut({ categories, total, onPick }: { categories: CategoryExpense[]; total: number; onPick: (c: CategoryExpense) => void }) {
    const top = categories.slice(0, 5);
    const shown = top.reduce((s, c) => s + Number(c.total), 0);
    const rest = Math.max(total - shown, 0);
    const slices = [...top.map((c) => ({ ...c, total: Number(c.total) })), ...(rest > 0 ? [{ id: -1, name: t('Sisanya'), color: '#9aa0b8', total: rest }] : [])];
    let offset = 25;

    return (
        <section aria-label={t('Ke mana uangnya')} className="plank col-span-2 p-5 sm:p-6 lg:col-span-5">
            <TileCap label={t('Ke mana uangnya')} right={<span />} />
            {total <= 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">{t('Belum ada pengeluaran di periode ini.')}</p>
            ) : (
                <div className="mt-3 grid items-center gap-5 sm:grid-cols-[176px_minmax(0,1fr)]">
                    <svg viewBox="0 0 42 42" className="mx-auto w-[168px]" role="img" aria-label={`${t('Total keluar')} ${rupiah(total)}`}>
                        <circle cx="21" cy="21" r="15.9" fill="none" className="stroke-sunken" strokeWidth="5" />
                        {slices.map((s) => {
                            const pct = (s.total / total) * 100;
                            const len = Math.max(pct - 0.6, 0.4);
                            const el = <circle key={s.id} cx="21" cy="21" r="15.9" fill="none" stroke={s.color} strokeWidth="5" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={offset} />;
                            offset -= pct;
                            return el;
                        })}
                        <text x="21" y="19.8" textAnchor="middle" fontSize="3.1" className="fill-muted-foreground">
                            {t('keluar')}
                        </text>
                        <text x="21" y="25" textAnchor="middle" fontSize="5" fontWeight="800" className="fill-foreground">
                            {compactRupiah(total)}
                        </text>
                    </svg>
                    <ul className="flex min-w-0 flex-col">
                        {slices.map((s) => (
                            <li key={s.id}>
                                <button
                                    type="button"
                                    disabled={s.id === -1}
                                    onClick={() => onPick(s)}
                                    className="row-press -mx-2 grid w-[calc(100%+1rem)] grid-cols-[10px_minmax(0,1fr)_auto_2.25rem] items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm"
                                >
                                    <span className="size-2.5 rounded-[4px]" style={{ background: s.color }} />
                                    <span className="truncate">{s.name}</span>
                                    <b className="font-bold tabular-nums">{rupiah(s.total).replace(/^Rp\s?/, '')}</b>
                                    <span className="text-muted-foreground text-right text-xs">{Math.round((s.total / total) * 100)}%</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

function Heatmap({ range, expenses, onPick }: { range: { start: string; end: string }; expenses: Tx[]; onPick: (date: string) => void }) {
    const end = new Date(`${range.end}T00:00:00`);
    const year = end.getFullYear();
    const month = end.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const totals = useMemo(() => {
        const map = new Map<string, number>();
        for (const e of expenses) map.set(e.date, (map.get(e.date) ?? 0) + e.amount);
        return map;
    }, [expenses]);

    return (
        <>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
                {['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'].map((d) => (
                    <span key={d} className="text-muted-foreground pb-0.5 text-center text-[0.68rem] font-bold">
                        {t(d)}
                    </span>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                    <span key={`p${i}`} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                    const date = `${year}-${pad(month + 1)}-${pad(i + 1)}`;
                    const amount = totals.get(date) ?? 0;
                    return (
                        <button
                            key={date}
                            type="button"
                            disabled={amount === 0}
                            onClick={() => onPick(date)}
                            aria-label={`${dayLabel(date)}: ${amount ? rupiah(amount) : t('tidak ada pengeluaran')}`}
                            className={cn(
                                'grid aspect-square place-items-center rounded-[9px] text-[0.7rem] font-bold transition-transform enabled:hover:scale-105',
                                HEAT[heatLevel(amount)],
                                date === todayStr && 'outline-foreground outline-2 outline-offset-1',
                                date > range.end && 'opacity-40',
                            )}
                        >
                            {i + 1}
                        </button>
                    );
                })}
            </div>
            <div className="text-muted-foreground mt-3 flex items-center gap-1.5 text-[0.68rem]">
                {t('sedikit')}
                {HEAT.map((cls, i) => (
                    <span key={i} className={cn('size-3 rounded-[4px]', cls)} />
                ))}
                {t('banyak')}
            </div>
        </>
    );
}

function TxList({ items, sign }: { items: Tx[]; sign: '+' | '−' }) {
    if (items.length === 0) return <p className="text-muted-foreground py-6 text-center text-sm">{t('Belum ada transaksi.')}</p>;
    return (
        <ul className="plank divide-border divide-y overflow-hidden">
            {items.map((tx, i) => (
                <li key={`${tx.date}-${i}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{tx.title}</span>
                        <span className="text-muted-foreground text-xs">
                            {dayLabel(tx.date)}
                            {tx.recurring === false && ` · ${t('bonus')}`}
                        </span>
                    </span>
                    <Money value={tx.amount} sign={sign} className={cn('text-base', sign === '+' ? 'text-masuk' : 'text-keluar')} />
                </li>
            ))}
        </ul>
    );
}

function DetailPanel({
    detail,
    onClose,
    props,
    expenses,
    periodLabel,
    saved,
    monthParam,
}: {
    detail: Detail | null;
    onClose: () => void;
    props: Props;
    expenses: Tx[];
    periodLabel: string;
    saved: number;
    monthParam: string;
}) {
    const { summary, categoryTransactions, incomeTransactions, sourceBalances, savingGoals, insights } = props;
    const seeAll = (type: string) => (
        <Link href={`/transactions?month=${monthParam}&type=${type}`} prefetch onClick={onClose} className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm">
            {t('Lihat di Transaksi')} <ArrowRight className="size-4" />
        </Link>
    );
    let title = '';
    let description: string | undefined;
    let body: ReactNode = null;
    let footer: ReactNode = undefined;

    if (detail?.kind === 'balance') {
        title = periodLabel;
        description = t('Gaji rutin dikurangi pengeluaran dan setoran tabungan. Bonus dicatat terpisah.');
        const rows: [string, number, '+' | '−'][] = [
            [t('Gaji rutin'), summary.recurringIncome, '+'],
            [t('Pengeluaran'), summary.expense, '−'],
            ...(saved !== 0 ? [[t('Setoran tabungan (bersih)'), Math.abs(saved), saved > 0 ? '−' : '+'] as [string, number, '+' | '−']] : []),
        ];
        body = (
            <dl className="plank divide-border divide-y">
                {rows.map(([label, value, sign]) => (
                    <div key={label} className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <dt className="text-sm">{label}</dt>
                        <dd>
                            <Money value={value} sign={sign} className="text-lg" />
                        </dd>
                    </div>
                ))}
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <dt className="text-sm font-bold">{periodLabel}</dt>
                    <dd>
                        <Money value={summary.periodBalance} className="text-2xl" />
                    </dd>
                </div>
                {summary.bonusIncome > 0 && (
                    <div className="text-muted-foreground px-4 py-3.5 text-sm">
                        {t('Bonus / pemasukan tidak rutin')}: <b className="text-foreground">{rupiah(summary.bonusIncome)}</b> — {t('nggak dihitung ke anggaran bulanan.')}
                    </div>
                )}
            </dl>
        );
    } else if (detail?.kind === 'income') {
        title = t('Pemasukan');
        description = rupiah(summary.income);
        body = <TxList items={incomeTransactions} sign="+" />;
        footer = seeAll('income');
    } else if (detail?.kind === 'expense') {
        title = t('Pengeluaran');
        description = rupiah(summary.expense);
        body = <TxList items={expenses} sign="−" />;
        footer = seeAll('expense');
    } else if (detail?.kind === 'assets') {
        title = t('Total aset');
        description = rupiah(summary.availableBalance + summary.savings + summary.receivables);
        body = (
            <div className="flex flex-col gap-4">
                <Group label={t('Dompet')} rows={sourceBalances.map((s) => [s.name, s.balance, sourceTypeLabel(s.type)])} href="/fund-sources" onClose={onClose} />
                <Group label={t('Tabungan')} rows={savingGoals.map((g) => [g.name, g.balance, g.target > 0 ? `${Math.round((g.balance / g.target) * 100)}% ${t('dari target')}` : ''])} href="/tabungan" onClose={onClose} />
                <Group
                    label={t('Kasbon & Pinjaman')}
                    rows={[
                        [t('Kasbon belum kembali'), summary.receivables, ''],
                        [t('Sisa pinjaman'), -summary.loans, ''],
                    ]}
                    href="/kasbon"
                    onClose={onClose}
                />
            </div>
        );
    } else if (detail?.kind === 'category') {
        title = detail.category.name;
        description = `${rupiah(Number(detail.category.total))} · ${summary.expense > 0 ? Math.round((Number(detail.category.total) / summary.expense) * 100) : 0}% ${t('dari pengeluaran')}`;
        // uncategorised totals arrive as id 0; their rows are grouped under the null key ''
        body = <TxList items={categoryTransactions[String(detail.category.id)] ?? (detail.category.id === 0 ? categoryTransactions[''] : undefined) ?? []} sign="−" />;
    } else if (detail?.kind === 'day') {
        const items = expenses.filter((e) => e.date === detail.date);
        title = dayLabel(detail.date);
        description = `${t('Total keluar')} ${rupiah(items.reduce((s, e) => s + e.amount, 0))}`;
        body = <TxList items={items} sign="−" />;
    } else if (detail?.kind === 'insights') {
        title = t('Saran buat lo');
        body = (
            <ul className="flex flex-col gap-2.5">
                {insights.map((insight, i) => {
                    const big = headline(insight.text);
                    return (
                        <li key={i} className={cn('rounded-[1.25rem] p-4 text-[0.875rem] leading-relaxed', insight.type === 'positive' ? 'bg-masuk-wash' : 'bg-warn-wash')}>
                            {big && <b className={cn('mb-1 block text-2xl font-extrabold tracking-[-0.04em]', insight.type === 'positive' ? 'text-masuk' : 'text-warn')}>{big}</b>}
                            {insight.text}
                        </li>
                    );
                })}
            </ul>
        );
        footer = (
            <Link href="/reports" prefetch onClick={onClose} className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm">
                {t('Laporan lengkap')} <ArrowRight className="size-4" />
            </Link>
        );
    } else if (detail?.kind === 'insight') {
        const big = headline(detail.insight.text);
        title = detail.insight.type === 'positive' ? t('Aman') : t('Perhatian');
        body = (
            <div className={cn('rounded-[1.25rem] p-5 text-[0.95rem] leading-relaxed', detail.insight.type === 'positive' ? 'bg-masuk-wash' : 'bg-warn-wash')}>
                {big && <b className={cn('mb-2 block text-4xl font-extrabold tracking-[-0.04em]', detail.insight.type === 'positive' ? 'text-masuk' : 'text-warn')}>{big}</b>}
                {detail.insight.text}
                <p className="text-muted-foreground mt-4 text-xs">{t('Patokan 50/30/20: tabungan ≥20% gaji, kebutuhan wajib ±50%, gaya hidup ±30%. Dana darurat 3–6× pengeluaran bulanan.')}</p>
            </div>
        );
        footer = (
            <Link href="/reports" prefetch onClick={onClose} className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm">
                {t('Laporan lengkap')} <ArrowRight className="size-4" />
            </Link>
        );
    }

    return (
        <Panel open={detail !== null} onOpenChange={(open) => !open && onClose()} title={title} description={description} footer={footer}>
            {body}
        </Panel>
    );
}

function Group({ label, rows, href, onClose }: { label: string; rows: [string, number, string][]; href: string; onClose: () => void }) {
    return (
        <div>
            <Link href={href} prefetch onClick={onClose} className="text-muted-foreground hover:text-foreground mb-2 flex items-center justify-between text-xs font-bold">
                {label} <ArrowRight className="size-3.5" />
            </Link>
            <ul className="plank divide-border divide-y">
                {rows.length === 0 && <li className="text-muted-foreground px-4 py-3 text-sm">—</li>}
                {rows.map(([name, value, note]) => (
                    <li key={name} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{name}</span>
                            {note && <span className="text-muted-foreground text-xs">{note}</span>}
                        </span>
                        <Money value={value} className={cn('text-base', value < 0 && 'text-keluar')} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: t('Beranda'), href: '/dashboard' }],
};
