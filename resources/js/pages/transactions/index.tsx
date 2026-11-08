import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Plus, ReceiptText, SearchX, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, Page, PageHeader, Panel } from '@/components/finance/kit';
import { Money } from '@/components/finance/money';
import { useQuickEntry } from '@/components/quick-entry';
import { dayLabel, monthLabel, rupiah, shiftMonth, shortDate } from '@/lib/format';
import { entryType, flowClass, flowSign, type Category, type FundSource } from '@/lib/finance';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Entry = {
    id: string;
    type: string;
    amount: number;
    date: string;
    description?: string | null;
    counterparty?: string | null;
    fund_source_id?: number | null;
    from_fund_source_id?: number | null;
    category_id?: number | null;
    is_recurring?: boolean;
};
type Props = {
    transactions: {
        data: Entry[];
        total: number;
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    totals: { income: number; expense: number };
    filters: { month: string; from: string; to: string; type: string | null; category: number };
    fundSources: FundSource[];
    categories: Category[];
};

export default function Transactions({ transactions, totals, filters, fundSources, categories }: Props) {
    const openEntry = useQuickEntry();
    const [detail, setDetail] = useState<Entry | null>(null);
    const [confirm, setConfirm] = useState(false);
    const sourceName = useMemo(() => new Map(fundSources.map((s) => [s.id, s.name])), [fundSources]);
    const categoryOf = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

    const monthStart = `${filters.month}-01`;
    const customRange = filters.from !== monthStart || filters.to.slice(0, 7) !== filters.month;
    const query = (patch: Record<string, string | number | null>) => {
        const params = new URLSearchParams();
        const merged = { month: filters.month, type: filters.type, category: filters.category || null, ...patch };
        Object.entries(merged).forEach(([k, v]) => v !== null && v !== '' && params.set(k, String(v)));
        return `/transactions?${params.toString()}`;
    };

    const groups = useMemo(() => {
        const map = new Map<string, Entry[]>();
        for (const entry of transactions.data) map.set(entry.date, [...(map.get(entry.date) ?? []), entry]);
        return [...map.entries()];
    }, [transactions.data]);

    const open = (entry: Entry) => {
        if (entry.type === 'income' || entry.type === 'expense') {
            openEntry({ entry });
        } else {
            setConfirm(false);
            setDetail(entry);
        }
    };

    const subtitle = (entry: Entry) => {
        if (entry.type === 'transfer') {
            return `${sourceName.get(entry.from_fund_source_id ?? 0) ?? '?'} → ${sourceName.get(entry.fund_source_id ?? 0) ?? '?'}`;
        }
        const parts = [categoryOf.get(entry.category_id ?? 0)?.name ?? entryType(entry.type).label, sourceName.get(entry.fund_source_id ?? 0)];
        if (entry.type === 'income' && entry.is_recurring === false) parts.push(t('bonus'));
        return parts.filter(Boolean).join(' · ');
    };

    return (
        <>
            <Head title={t('Transaksi')} />
            <Page>
                <PageHeader
                    title={t('Transaksi')}
                    actions={
                        <button type="button" onClick={() => openEntry()} className="btn-kuning hidden min-h-11 items-center gap-2 rounded-xl px-4 text-sm lg:inline-flex">
                            <Plus className="size-4" strokeWidth={2.5} /> {t('Catat')}
                        </button>
                    }
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-1">
                            <Link href={query({ month: shiftMonth(filters.month, -1) })} prefetch preserveScroll aria-label={t('Bulan sebelumnya')} className="hover:bg-sunken grid size-10 place-items-center rounded-full">
                                <ChevronLeft className="size-5" />
                            </Link>
                            <span className="font-display min-w-40 text-center text-xl font-bold capitalize">
                                {customRange ? `${shortDate(filters.from)} – ${shortDate(filters.to)}` : monthLabel(filters.month)}
                            </span>
                            <Link href={query({ month: shiftMonth(filters.month, 1) })} prefetch preserveScroll aria-label={t('Bulan berikutnya')} className="hover:bg-sunken grid size-10 place-items-center rounded-full">
                                <ChevronRight className="size-5" />
                            </Link>
                        </div>
                        <div className="scroll-x -mx-4 gap-1.5 px-4 sm:mx-0 sm:px-0">
                            {(
                                [
                                    [null, t('Semua')],
                                    ['expense', t('Keluar')],
                                    ['income', t('Masuk')],
                                    ['transfer', t('Pindah')],
                                ] as const
                            ).map(([value, label]) => (
                                <Link key={label} href={query({ type: value })} prefetch preserveScroll preserveState aria-current={filters.type === value ? 'true' : undefined} className="chip">
                                    {label}
                                </Link>
                            ))}
                            <select
                                aria-label={t('Kategori')}
                                value={String(filters.category || '')}
                                onChange={(e) => router.get(query({ category: e.target.value || null }), {}, { preserveScroll: true, preserveState: true })}
                                className={cn('chip appearance-none pr-3', filters.category ? 'border-foreground bg-foreground text-background' : '')}
                            >
                                <option value="">{t('Semua kategori')}</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </PageHeader>

                <dl className="plank grid grid-cols-3 divide-x divide-[var(--border)]">
                    {[
                        { label: t('Masuk'), value: totals.income, sign: '+' as const, tone: 'text-masuk' },
                        { label: t('Keluar'), value: totals.expense, sign: '−' as const, tone: 'text-keluar' },
                        { label: t('Selisih'), value: totals.income - totals.expense, sign: undefined, tone: '' },
                    ].map((stat) => (
                        <div key={stat.label} className="min-w-0 px-3 py-3.5 sm:px-5 sm:py-4">
                            <dt className="label-caps">{stat.label}</dt>
                            <dd className="mt-1.5 truncate">
                                <Money value={stat.value} sign={stat.sign} className={cn('text-base sm:text-2xl', stat.tone)} />
                            </dd>
                        </div>
                    ))}
                </dl>

                {transactions.data.length === 0 ? (
                    filters.type || filters.category ? (
                        <EmptyState
                            icon={SearchX}
                            title={t('Nggak ada yang cocok')}
                            text={t('Coba ganti filter atau bulan.')}
                            action={
                                <Link href={query({ type: null, category: null })} className="chip">
                                    {t('Hapus filter')}
                                </Link>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={ReceiptText}
                            title={t('Bulan ini masih kosong')}
                            text={t('Catat pengeluaran pertama, cuma butuh beberapa detik.')}
                            action={
                                <button type="button" onClick={() => openEntry()} className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm">
                                    <Plus className="size-4" /> {t('Catat transaksi')}
                                </button>
                            }
                        />
                    )
                ) : (
                    <div className="flex flex-col gap-5">
                        {groups.map(([date, entries]) => {
                            const net = entries.reduce((sum, e) => {
                                const flow = entryType(e.type).flow;
                                return sum + (flow === 'in' ? e.amount : flow === 'out' ? -e.amount : 0);
                            }, 0);
                            return (
                                <section key={date} aria-label={dayLabel(date)}>
                                    <div className="bg-background/95 sticky top-0 z-10 flex items-baseline justify-between px-1 py-2 backdrop-blur-sm">
                                        <h2 className="text-sm font-semibold capitalize">{dayLabel(date)}</h2>
                                        {net !== 0 && <span className={cn('text-xs font-semibold tabular-nums', net > 0 ? 'text-masuk' : 'text-muted-foreground')}>{`${net > 0 ? '+' : '−'}${rupiah(Math.abs(net))}`}</span>}
                                    </div>
                                    <ul className="plank divide-border divide-y overflow-hidden">
                                        {entries.map((entry) => {
                                            const meta = entryType(entry.type);
                                            const category = categoryOf.get(entry.category_id ?? 0);
                                            return (
                                                <li key={entry.id}>
                                                    <button type="button" onClick={() => open(entry)} className="row-press flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
                                                        {category ? (
                                                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: category.color }} aria-hidden="true" />
                                                        ) : (
                                                            <meta.icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                                                        )}
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[0.95rem] font-medium">{entry.description || entry.counterparty || meta.label}</span>
                                                            <span className="text-muted-foreground block truncate text-xs">{subtitle(entry)}</span>
                                                        </span>
                                                        <Money value={entry.amount} sign={flowSign(meta.flow) as '+' | '−' | ''} className={cn('text-lg', flowClass(meta.flow))} />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            );
                        })}
                        {transactions.last_page > 1 && (
                            <nav aria-label={t('Halaman')} className="flex items-center justify-between gap-3">
                                {transactions.prev_page_url ? (
                                    <Link href={transactions.prev_page_url} preserveScroll={false} className="chip">
                                        <ChevronLeft className="size-4" /> {t('Sebelumnya')}
                                    </Link>
                                ) : (
                                    <span />
                                )}
                                <span className="text-muted-foreground text-sm tabular-nums">
                                    {transactions.current_page} / {transactions.last_page}
                                </span>
                                {transactions.next_page_url ? (
                                    <Link href={transactions.next_page_url} preserveScroll={false} className="chip">
                                        {t('Berikutnya')} <ChevronRight className="size-4" />
                                    </Link>
                                ) : (
                                    <span />
                                )}
                            </nav>
                        )}
                    </div>
                )}
            </Page>

            <Panel open={detail !== null} onOpenChange={(o) => !o && setDetail(null)} title={detail ? detail.description || entryType(detail.type).label : ''} description={detail ? shortDate(detail.date) : undefined}
                footer={
                    detail && (
                        <button
                            type="button"
                            onClick={() =>
                                confirm
                                    ? router.delete(`/transactions/${detail.id}`, { preserveScroll: true, onSuccess: () => setDetail(null) })
                                    : setConfirm(true)
                            }
                            className={cn('inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold', confirm ? 'border-keluar bg-keluar text-white' : 'text-keluar hover:bg-keluar-wash')}
                        >
                            <Trash2 className="size-4" /> {confirm ? t('Yakin hapus? Tidak bisa dibatalkan') : t('Hapus transaksi')}
                        </button>
                    )
                }
            >
                {detail && (
                    <>
                        <Money value={detail.amount} sign={flowSign(entryType(detail.type).flow) as '+' | '−' | ''} className={cn('block text-4xl', flowClass(entryType(detail.type).flow))} />
                        <dl className="plank divide-border mt-5 divide-y">
                            {[
                                [t('Jenis'), entryType(detail.type).label],
                                [t('Tanggal'), shortDate(detail.date)],
                                ...(detail.type === 'transfer'
                                    ? [
                                          [t('Dari'), sourceName.get(detail.from_fund_source_id ?? 0) ?? '—'],
                                          [t('Ke'), sourceName.get(detail.fund_source_id ?? 0) ?? '—'],
                                      ]
                                    : [[t('Dompet'), sourceName.get(detail.fund_source_id ?? 0) ?? '—']]),
                                ...(detail.counterparty ? [[t('Pihak / catatan'), detail.counterparty]] : []),
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                                    <dt className="text-muted-foreground">{label}</dt>
                                    <dd className="text-right font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        {detail.type !== 'transfer' && (
                            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                                {t('Transaksi ini dicatat dari menu Tabungan atau Kasbon & Pinjaman. Menghapusnya membatalkan efeknya ke saldo.')}
                            </p>
                        )}
                    </>
                )}
            </Panel>
        </>
    );
}

Transactions.layout = {
    breadcrumbs: [{ title: t('Transaksi'), href: '/transactions' }],
};
