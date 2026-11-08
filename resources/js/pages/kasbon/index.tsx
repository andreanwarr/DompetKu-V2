import { Head, useForm, usePage } from '@inertiajs/react';
import { CalendarClock, Check, ChevronDown, HandCoins, Plus, Search, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, Field, Page, PageHeader, Panel, Section, Segmented } from '@/components/finance/kit';
import { Money } from '@/components/finance/money';
import { inkOn, localDate, rupiah, shortDate } from '@/lib/format';
import type { FundSource } from '@/lib/finance';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Kind = 'receivables' | 'loans';
type Payment = {
    id: number;
    principal_minor: number;
    interest_minor: number;
    penalty_minor: number;
    paid_at: string;
};
type Debt = {
    id: number;
    counterparty: string;
    principal_minor: number;
    outstanding_minor: number;
    issued_at?: string;
    received_at?: string;
    due_date?: string | null;
    status: string;
    notes?: string | null;
    payments: Payment[];
};

const digits = (value: string) => value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
const isOverdue = (item: Debt) =>
    item.outstanding_minor > 0 && !!item.due_date && item.due_date.slice(0, 10) < localDate();
const statusLabel = (item: Debt) =>
    isOverdue(item)
        ? t('terlambat')
        : t(item.status === 'paid' ? 'lunas' : item.status === 'partial' ? 'sebagian' : 'aktif');

export default function Kasbon({
    fundSources,
    receivables,
    loans = [],
}: {
    fundSources: FundSource[];
    receivables: Debt[];
    loans?: Debt[];
}) {
    const { url } = usePage();
    const [kind, setKind] = useState<Kind>(
        new URLSearchParams(url.split('?')[1] ?? '').get('tab') === 'loans' ? 'loans' : 'receivables',
    );
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);

    const switchKind = (next: Kind) => {
        setKind(next);
        setOpenId(null);
        const params = new URLSearchParams(window.location.search);
        if (next === 'loans') params.set('tab', 'loans');
        else params.delete('tab');
        const query = params.toString();
        window.history.replaceState(window.history.state, '', window.location.pathname + (query ? `?${query}` : ''));
    };

    const lend = kind === 'receivables';
    const items = lend ? receivables : loans;
    const filtered = items.filter((item) => item.counterparty.toLowerCase().includes(search.trim().toLowerCase()));
    const open = filtered.filter((item) => item.outstanding_minor > 0);
    const paid = filtered.filter((item) => item.outstanding_minor <= 0);
    const outstanding = items.reduce((sum, item) => sum + Math.max(0, item.outstanding_minor), 0);
    const overdue = items.filter(isOverdue);
    const opened = items.find((item) => item.id === openId) ?? null;

    return (
        <>
            <Head title={t('Kasbon & Pinjaman')} />
            <Page>
                <PageHeader
                    title={t('Kasbon & Pinjaman')}
                    actions={
                        // empty list already offers the same action in its empty state
                        items.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                {lend ? t('Catat kasbon keluar') : t('Catat pinjaman masuk')}
                            </button>
                        )
                    }
                >
                    <Segmented<Kind>
                        label={t('Jenis')}
                        value={kind}
                        onChange={switchKind}
                        className="sm:max-w-lg"
                        options={[
                            { value: 'receivables', label: t('Kasbon') },
                            { value: 'loans', label: t('Pinjaman') },
                        ]}
                    />
                </PageHeader>

                <section aria-label={lend ? t('Belum balik ke lo') : t('Sisa utang lo')} className="plank-papan flex flex-col gap-5 p-5 sm:p-7">
                    <div className="min-w-0">
                        <p className="label-caps">{lend ? t('Belum balik ke lo') : t('Sisa utang lo')}</p>
                        <Money value={outstanding} className="mt-3 block text-[clamp(2.5rem,10.5vw,3.75rem)]" />
                    </div>
                    <dl className="grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-3">
                        <div>
                            <dt className="label-caps">{t('Belum lunas')}</dt>
                            <dd className="papan-num mt-1.5 text-2xl">{items.filter((i) => i.outstanding_minor > 0).length}</dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="label-caps">{t('Lewat jatuh tempo')}</dt>
                            <dd className={cn('mt-1.5 truncate', overdue.length > 0 && 'text-kuning')}>
                                <Money value={overdue.reduce((sum, i) => sum + i.outstanding_minor, 0)} className="text-2xl" />
                            </dd>
                        </div>
                    </dl>
                </section>

                <Section title={lend ? t('Yang ngutang ke lo') : t('Yang lo utangin')}>
                    {items.length > 0 && (
                        <div className="relative">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                            <input
                                type="search"
                                aria-label={t('Cari nama...')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Cari nama...')}
                                className="field pl-10"
                            />
                        </div>
                    )}

                    {items.length === 0 ? (
                        <EmptyState
                            icon={lend ? HandCoins : WalletCards}
                            title={lend ? t('Belum ada kasbon') : t('Belum ada pinjaman tercatat.')}
                            text={
                                lend
                                    ? t('Kalau ada temen minjem duit, catat di sini biar nggak lupa nagih.')
                                    : t('Pinjam duit ke orang atau bank? Catat biar cicilannya kepantau.')
                            }
                            action={
                                <button
                                    type="button"
                                    onClick={() => setCreating(true)}
                                    className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm"
                                >
                                    <Plus className="size-4" /> {lend ? t('Catat kasbon keluar') : t('Catat pinjaman masuk')}
                                </button>
                            }
                        />
                    ) : filtered.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">{t('Belum ada kasbon yang cocok.')}</p>
                    ) : (
                        <>
                            {open.length > 0 && (
                                <ul className="grid gap-3 lg:grid-cols-2">
                                    {open.map((item) => (
                                        <li key={item.id}>
                                            <DebtRow item={item} onOpen={() => setOpenId(item.id)} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {open.length === 0 && (
                                <p className="text-muted-foreground py-4 text-sm">{t('Semua udah lunas. Mantap.')}</p>
                            )}
                            {paid.length > 0 && (
                                <details className="group plank">
                                    <summary className="row-press flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius)] px-4">
                                        <span className="font-display text-lg font-bold">
                                            {t('Lunas')} <span className="text-muted-foreground">({paid.length})</span>
                                        </span>
                                        <ChevronDown className="text-muted-foreground size-4 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <ul className="divide-border divide-y border-t">
                                        {paid.map((item) => (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenId(item.id)}
                                                    className="row-press flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-medium">{item.counterparty}</span>
                                                        <span className="text-muted-foreground block text-xs">
                                                            {shortDate((item.issued_at ?? item.received_at ?? '').slice(0, 10))}
                                                        </span>
                                                    </span>
                                                    <Money value={item.principal_minor} className="text-muted-foreground shrink-0 text-lg" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </>
                    )}
                </Section>
            </Page>

            <NewDebtPanel key={kind} kind={kind} sources={fundSources} open={creating} onOpenChange={setCreating} />
            {opened && (
                <DebtPanel
                    key={`${kind}-${opened.id}`}
                    item={opened}
                    kind={kind}
                    sources={fundSources}
                    open
                    onOpenChange={(value) => !value && setOpenId(null)}
                />
            )}
        </>
    );
}

function DebtRow({ item, onOpen }: { item: Debt; onOpen: () => void }) {
    const late = isOverdue(item);
    const paidPart = item.principal_minor > 0 ? Math.round(((item.principal_minor - item.outstanding_minor) / item.principal_minor) * 100) : 0;
    return (
        <button
            type="button"
            onClick={onOpen}
            className={cn('plank row-press flex w-full min-w-0 flex-col gap-3 p-4 text-left sm:p-5', late && 'border-keluar')}
        >
            <span className="flex w-full items-start justify-between gap-3">
                <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.counterparty}</span>
                    <span className={cn('mt-0.5 flex items-center gap-1 text-xs', late ? 'text-keluar font-semibold' : 'text-muted-foreground')}>
                        <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                        {item.due_date ? `${t('Jatuh tempo')} ${shortDate(item.due_date.slice(0, 10))}` : t('Tanpa jatuh tempo')}
                    </span>
                </span>
                <span
                    className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                        late ? 'bg-keluar-wash text-keluar' : 'bg-sunken text-muted-foreground',
                    )}
                >
                    {statusLabel(item)}
                </span>
            </span>
            <span className="block w-full">
                <span className="flex items-baseline justify-between gap-3">
                    <Money value={item.outstanding_minor} className="min-w-0 truncate text-[2rem] leading-none" />
                    <span className="text-muted-foreground shrink-0 text-xs">
                        {t('dari')} {rupiah(item.principal_minor)}
                    </span>
                </span>
                <span
                    className="bg-sunken mt-3 block h-2 w-full overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuenow={paidPart}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('Sudah dibayar')}
                >
                    <span className="bg-papan block h-full rounded-full" style={{ width: `${paidPart}%` }} />
                </span>
            </span>
        </button>
    );
}

function SourceChips({
    label,
    sources,
    value,
    onChange,
    error,
}: {
    label: string;
    sources: FundSource[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    return (
        <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{label}</legend>
            <div className="flex flex-wrap gap-1.5">
                {sources.map((source) => {
                    const selected = value === String(source.id);
                    return (
                        <button
                            key={source.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onChange(String(source.id))}
                            className="chip"
                            style={selected ? { background: source.color, borderColor: source.color, color: inkOn(source.color) } : undefined}
                        >
                            {!selected && <span className="size-2.5 rounded-full" style={{ background: source.color }} aria-hidden="true" />}
                            {source.name}
                        </button>
                    );
                })}
                {sources.length === 0 && (
                    <a href="/fund-sources" className="text-muted-foreground text-sm underline">
                        {t('Tambah sumber dana')}
                    </a>
                )}
            </div>
            {error && (
                <p role="alert" className="text-keluar text-xs font-medium">
                    {error}
                </p>
            )}
        </fieldset>
    );
}

function NewDebtPanel({
    kind,
    sources,
    open,
    onOpenChange,
}: {
    kind: Kind;
    sources: FundSource[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const lend = kind === 'receivables';
    const form = useForm({
        counterparty: '',
        fund_source_id: sources[0] ? String(sources[0].id) : '',
        principal_minor: '',
        date: localDate(),
        due_date: '',
        notes: '',
    });
    const canSubmit = form.data.counterparty.trim() !== '' && form.data.fund_source_id !== '' && Number(form.data.principal_minor) > 0;
    const dateError = (form.errors as Record<string, string | undefined>)[lend ? 'issued_at' : 'received_at'];

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        form.transform(({ date, ...data }) => ({
            ...data,
            [lend ? 'issued_at' : 'received_at']: date,
            fund_source_id: Number(data.fund_source_id),
            principal_minor: Number(data.principal_minor),
            due_date: data.due_date || null,
            notes: data.notes || null,
        }));
        form.post(lend ? '/receivables' : '/loans', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('counterparty', 'principal_minor', 'due_date', 'notes');
                onOpenChange(false);
            },
        });
    };

    return (
        <Panel
            open={open}
            onOpenChange={onOpenChange}
            title={lend ? t('Catat kasbon keluar') : t('Catat pinjaman masuk')}
            description={
                lend
                    ? t('Kasbon keluar menurunkan saldo likuid dan menaikkan piutang.')
                    : t('Pinjaman masuk menaikkan kas dan kewajiban, bukan pemasukan.')
            }
            footer={
                <button
                    type="submit"
                    form="new-debt-form"
                    disabled={form.processing || !canSubmit}
                    className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-base disabled:opacity-45"
                >
                    <Check className="size-5" /> {form.processing ? t('Menyimpan…') : t('Simpan')}
                </button>
            }
        >
            <form id="new-debt-form" onSubmit={submit} className="flex flex-col gap-4">
                <Field label={lend ? t('Penerima kasbon') : t('Pemberi pinjaman')} htmlFor="debt-person" error={form.errors.counterparty}>
                    <input
                        id="debt-person"
                        className="field"
                        maxLength={255}
                        value={form.data.counterparty}
                        onChange={(e) => form.setData('counterparty', e.target.value)}
                        required
                    />
                </Field>
                <Field
                    label={t('Pokok')}
                    htmlFor="debt-principal"
                    error={form.errors.principal_minor}
                    hint={Number(form.data.principal_minor) ? rupiah(Number(form.data.principal_minor)) : undefined}
                >
                    <input
                        id="debt-principal"
                        className="field papan-num text-2xl"
                        inputMode="numeric"
                        autoComplete="off"
                        value={form.data.principal_minor}
                        onChange={(e) => form.setData('principal_minor', digits(e.target.value))}
                        required
                    />
                </Field>
                <SourceChips
                    label={lend ? t('Diambil dari dompet') : t('Masuk ke dompet')}
                    sources={sources}
                    value={form.data.fund_source_id}
                    onChange={(value) => form.setData('fund_source_id', value)}
                    error={form.errors.fund_source_id}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('Tanggal')} htmlFor="debt-date" error={dateError}>
                        <input
                            id="debt-date"
                            type="date"
                            className="field"
                            value={form.data.date}
                            onChange={(e) => e.target.value && form.setData('date', e.target.value)}
                            required
                        />
                    </Field>
                    <Field label={t('Jatuh tempo')} htmlFor="debt-due" error={form.errors.due_date}>
                        <input
                            id="debt-due"
                            type="date"
                            className="field"
                            min={form.data.date}
                            value={form.data.due_date}
                            onChange={(e) => form.setData('due_date', e.target.value)}
                        />
                    </Field>
                </div>
                <Field label={t('Catatan')} htmlFor="debt-notes" error={form.errors.notes}>
                    <textarea
                        id="debt-notes"
                        className="field"
                        rows={2}
                        maxLength={1000}
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                    />
                </Field>
            </form>
        </Panel>
    );
}

function DebtPanel({
    item,
    kind,
    sources,
    open,
    onOpenChange,
}: {
    item: Debt;
    kind: Kind;
    sources: FundSource[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const lend = kind === 'receivables';
    const late = isOverdue(item);
    const form = useForm({
        fund_source_id: sources[0] ? String(sources[0].id) : '',
        principal_minor: '',
        interest_minor: '',
        penalty_minor: '',
        paid_at: localDate(),
    });
    const principal = Number(form.data.principal_minor);
    const canSubmit = form.data.fund_source_id !== '' && principal > 0 && principal <= item.outstanding_minor;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        form.transform((data) => ({
            ...data,
            fund_source_id: Number(data.fund_source_id),
            principal_minor: Number(data.principal_minor),
            interest_minor: Number(data.interest_minor || 0),
            penalty_minor: Number(data.penalty_minor || 0),
        }));
        form.post(`/${kind}/${item.id}/payments`, {
            preserveScroll: true,
            onSuccess: () => form.reset('principal_minor', 'interest_minor', 'penalty_minor'),
        });
    };

    const payments = [...item.payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at));

    return (
        <Panel
            open={open}
            onOpenChange={onOpenChange}
            title={item.counterparty}
            description={lend ? t('Kasbon keluar') : t('Pinjaman')}
            footer={
                item.outstanding_minor > 0 ? (
                    <button
                        type="submit"
                        form="pay-debt-form"
                        disabled={form.processing || !canSubmit}
                        className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-base disabled:opacity-45"
                    >
                        <Check className="size-5" /> {form.processing ? t('Menyimpan…') : t('Catat bayar')}
                    </button>
                ) : undefined
            }
        >
            <div className="flex flex-col gap-6">
                <div className="plank-papan p-5">
                    <p className="label-caps">{t('Sisa pokok')}</p>
                    <Money value={item.outstanding_minor} className="mt-2 block text-[2.75rem] leading-none" />
                    <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                        <div className="min-w-0">
                            <dt className="text-papan-soft">{t('Pokok')}</dt>
                            <dd className="mt-0.5 truncate font-semibold">{rupiah(item.principal_minor)}</dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="text-papan-soft">{t('Tanggal')}</dt>
                            <dd className="mt-0.5 truncate font-semibold">
                                {shortDate((item.issued_at ?? item.received_at ?? '').slice(0, 10))}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="text-papan-soft">{t('Jatuh tempo')}</dt>
                            <dd className={cn('mt-0.5 truncate font-semibold', late && 'text-kuning')}>
                                {item.due_date ? shortDate(item.due_date.slice(0, 10)) : '—'}
                            </dd>
                        </div>
                    </dl>
                    <p className={cn('mt-3 text-xs font-semibold', late && 'text-kuning')}>{statusLabel(item)}</p>
                    {item.notes && <p className="text-papan-soft mt-2 text-sm">{item.notes}</p>}
                </div>

                {item.outstanding_minor > 0 && (
                    <form id="pay-debt-form" onSubmit={submit} className="flex flex-col gap-4">
                        <h3 className="font-display text-lg leading-none font-bold">{t('Catat bayar')}</h3>
                        <Field
                            label={t('Pokok dibayar')}
                            htmlFor="pay-principal"
                            error={form.errors.principal_minor}
                            hint={principal > item.outstanding_minor ? t('Lebih dari sisa pokok.') : principal ? rupiah(principal) : undefined}
                        >
                            <div className="flex gap-2">
                                <input
                                    id="pay-principal"
                                    className="field papan-num min-w-0 flex-1 text-2xl"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    aria-invalid={principal > item.outstanding_minor}
                                    value={form.data.principal_minor}
                                    onChange={(e) => form.setData('principal_minor', digits(e.target.value))}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => form.setData('principal_minor', String(item.outstanding_minor))}
                                    className="chip shrink-0"
                                >
                                    {t('Lunasi')}
                                </button>
                            </div>
                        </Field>
                        <SourceChips
                            label={lend ? t('Masuk ke dompet') : t('Bayar pakai dompet')}
                            sources={sources}
                            value={form.data.fund_source_id}
                            onChange={(value) => form.setData('fund_source_id', value)}
                            error={form.errors.fund_source_id}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label={t('Bunga')} htmlFor="pay-interest" error={form.errors.interest_minor}>
                                <input
                                    id="pay-interest"
                                    className="field"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={form.data.interest_minor}
                                    onChange={(e) => form.setData('interest_minor', digits(e.target.value))}
                                />
                            </Field>
                            <Field label={t('Denda')} htmlFor="pay-penalty" error={form.errors.penalty_minor}>
                                <input
                                    id="pay-penalty"
                                    className="field"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={form.data.penalty_minor}
                                    onChange={(e) => form.setData('penalty_minor', digits(e.target.value))}
                                />
                            </Field>
                        </div>
                        <Field label={t('Tanggal bayar')} htmlFor="pay-date" error={form.errors.paid_at}>
                            <input
                                id="pay-date"
                                type="date"
                                className="field"
                                value={form.data.paid_at}
                                onChange={(e) => e.target.value && form.setData('paid_at', e.target.value)}
                                required
                            />
                        </Field>
                    </form>
                )}

                <section className="flex flex-col gap-2">
                    <h3 className="font-display text-lg leading-none font-bold">{t('Riwayat bayar')}</h3>
                    {payments.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t('Belum ada pembayaran.')}</p>
                    ) : (
                        <ul className="divide-border divide-y">
                            {payments.map((payment) => {
                                const extra = payment.interest_minor + payment.penalty_minor;
                                return (
                                    <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">{shortDate(payment.paid_at.slice(0, 10))}</p>
                                            {extra > 0 && (
                                                <p className="text-muted-foreground truncate text-xs">
                                                    {t('Pokok')} {rupiah(payment.principal_minor)} · {t('bunga/denda')} {rupiah(extra)}
                                                </p>
                                            )}
                                        </div>
                                        <Money
                                            value={payment.principal_minor + extra}
                                            sign={lend ? '+' : '−'}
                                            className={cn('shrink-0 text-lg', lend ? 'text-masuk' : 'text-keluar')}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </Panel>
    );
}

Kasbon.layout = {
    breadcrumbs: [{ title: t('Kasbon & Pinjaman'), href: '/kasbon' }],
};
