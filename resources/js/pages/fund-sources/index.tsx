import { Head, useForm } from '@inertiajs/react';
import { Archive, Check, Pencil, Plus, Scale, Wallet } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, Field, Page, PageHeader, Panel, Section } from '@/components/finance/kit';
import { Money } from '@/components/finance/money';
import { inkOn, localDate, newIdempotencyKey, rupiah, shortDate } from '@/lib/format';
import { sourceIcon, sourceTypeLabel } from '@/lib/finance';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Source = {
    id: number;
    name: string;
    type: string;
    opening_balance_minor: number;
    current_balance_minor: number;
    opening_date: string;
    color: string;
    is_active: boolean;
};

const TYPES = ['bank', 'ewallet', 'cash', 'prepaid', 'other'] as const;
const SWATCHES = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#eab308', '#334155'];

export default function FundSources({ fundSources }: { fundSources: Source[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Source | null>(null);
    const form = useForm({
        name: '',
        type: 'bank',
        opening_balance_minor: '',
        opening_date: localDate(),
        color: SWATCHES[0],
        is_active: true,
    });

    const active = fundSources.filter((s) => s.is_active);
    const archived = fundSources.filter((s) => !s.is_active);
    const total = active.reduce((sum, s) => sum + Number(s.current_balance_minor), 0);

    const startAdd = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
        setOpen(true);
    };
    const startEdit = (source: Source) => {
        setEditing(source);
        form.clearErrors();
        form.setData({
            name: source.name,
            type: source.type,
            opening_balance_minor: String(source.opening_balance_minor),
            opening_date: source.opening_date.slice(0, 10),
            color: source.color || SWATCHES[0],
            is_active: source.is_active,
        });
        setOpen(true);
    };
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const done = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) {
            // opening balance/date are not editable server-side: send only what update accepts
            form.transform(({ name, type, color, is_active }) => ({ name, type, color, is_active }));
            form.put(`/fund-sources/${editing.id}`, done);
        } else {
            form.transform(({ name, type, color, opening_balance_minor, opening_date }) => ({
                name,
                type,
                color,
                opening_date,
                opening_balance_minor: Number(opening_balance_minor),
            }));
            form.post('/fund-sources', done);
        }
    };

    return (
        <>
            <Head title={t('Sumber Dana')} />
            <Page>
                <PageHeader
                    title={t('Sumber dana')}
                    actions={
                        <button type="button" onClick={startAdd} className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm">
                            <Plus className="size-4" strokeWidth={2.5} /> {t('Tambah')}
                        </button>
                    }
                />

                {fundSources.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title={t('Belum ada dompet')}
                        text={t('Tambahkan rekening, e-wallet, atau uang tunai biar saldo kebaca.')}
                        action={
                            <button type="button" onClick={startAdd} className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm">
                                <Plus className="size-4" /> {t('Tambah sumber dana')}
                            </button>
                        }
                    />
                ) : (
                    <>
                        <section aria-label={t('Total saldo')} className="plank-papan flex flex-col gap-2 p-5 sm:p-7">
                            <p className="label-caps">{t('Total saldo dompet aktif')}</p>
                            <Money value={total} className="block text-[clamp(2.5rem,10.5vw,3.75rem)]" />
                            <p className="text-papan-soft text-sm">
                                {active.length} {t('dompet aktif')}
                                {archived.length > 0 && ` · ${archived.length} ${t('diarsipkan')}`}
                            </p>
                        </section>

                        {active.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {active.map((source) => (
                                    <SourcePlank key={source.id} source={source} onPick={startEdit} />
                                ))}
                            </div>
                        )}

                        {archived.length > 0 && (
                            <Section title={t('Diarsipkan')}>
                                <ul className="plank divide-border divide-y overflow-hidden">
                                    {archived.map((source) => {
                                        const Icon = sourceIcon(source.type);
                                        return (
                                            <li key={source.id}>
                                                <button type="button" onClick={() => startEdit(source)} className="row-press flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
                                                    <span className="bg-sunken text-muted-foreground grid size-10 shrink-0 place-items-center rounded-xl">
                                                        <Icon className="size-4" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="text-muted-foreground block truncate text-sm font-medium">{source.name}</span>
                                                        <span className="text-muted-foreground text-xs">{sourceTypeLabel(source.type)}</span>
                                                    </span>
                                                    <Money value={Number(source.current_balance_minor)} className="text-muted-foreground text-lg" />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Section>
                        )}
                    </>
                )}
            </Page>

            <Panel
                open={open}
                onOpenChange={setOpen}
                title={editing ? t('Ubah sumber dana') : t('Tambah sumber dana')}
                description={editing ? undefined : t('Saldo berjalan dihitung dari saldo awal ini plus semua transaksi.')}
                footer={
                    <button
                        type="submit"
                        form="fund-source-form"
                        disabled={form.processing}
                        className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-base disabled:opacity-45"
                    >
                        <Check className="size-5" />
                        {form.processing ? t('Menyimpan…') : editing ? t('Simpan perubahan') : t('Tambahkan')}
                    </button>
                }
            >
                <form id="fund-source-form" onSubmit={submit} className="flex flex-col gap-5">
                    <Field label={t('Nama')} htmlFor="fs-name" error={form.errors.name}>
                        <input
                            id="fs-name"
                            className="field"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder="BCA Utama"
                            maxLength={120}
                            aria-invalid={!!form.errors.name}
                            required
                        />
                    </Field>

                    <fieldset className="flex flex-col gap-1.5">
                        <legend className="mb-1.5 text-sm font-medium">{t('Jenis')}</legend>
                        <div className="flex flex-wrap gap-1.5">
                            {TYPES.map((type) => {
                                const Icon = sourceIcon(type);
                                return (
                                    <button key={type} type="button" aria-pressed={form.data.type === type} onClick={() => form.setData('type', type)} className="chip min-h-10">
                                        <Icon className="size-4" /> {sourceTypeLabel(type)}
                                    </button>
                                );
                            })}
                        </div>
                        {form.errors.type && <p role="alert" className="text-keluar text-xs font-medium">{form.errors.type}</p>}
                    </fieldset>

                    {editing ? (
                        <div className="bg-sunken rounded-[var(--radius)] p-4">
                            <p className="label-caps">{t('Saldo awal')}</p>
                            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                                <Money value={editing.opening_balance_minor} className="text-2xl" />
                                <span className="text-muted-foreground text-sm">{t('per')} {shortDate(editing.opening_date.slice(0, 10))}</span>
                            </p>
                            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                                {t('Saldo awal & tanggalnya dikunci biar riwayat saldo nggak berubah. Saldo meleset? Pakai "Sesuaikan saldo" di bawah.')}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                label={t('Saldo awal')}
                                htmlFor="fs-balance"
                                error={form.errors.opening_balance_minor}
                                hint={form.data.opening_balance_minor ? rupiah(Number(form.data.opening_balance_minor)) : undefined}
                            >
                                <input
                                    id="fs-balance"
                                    className="field tabular-nums"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    placeholder="0"
                                    value={form.data.opening_balance_minor}
                                    onChange={(e) => form.setData('opening_balance_minor', e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13))}
                                    aria-invalid={!!form.errors.opening_balance_minor}
                                    required
                                />
                            </Field>
                            <Field label={t('Per tanggal')} htmlFor="fs-date" error={form.errors.opening_date}>
                                <input
                                    id="fs-date"
                                    type="date"
                                    className="field"
                                    value={form.data.opening_date}
                                    onChange={(e) => form.setData('opening_date', e.target.value)}
                                    aria-invalid={!!form.errors.opening_date}
                                    required
                                />
                            </Field>
                        </div>
                    )}

                    <ColorPicker value={form.data.color} onChange={(c) => form.setData('color', c)} error={form.errors.color} />

                    {editing && (
                        <label className="plank flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3">
                            <Archive className="text-muted-foreground size-4 shrink-0" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">{t('Arsipkan dompet ini')}</span>
                                <span className="text-muted-foreground block text-xs">{t('Disembunyiin dari pilihan dompet. Riwayatnya tetap aman.')}</span>
                            </span>
                            <input
                                type="checkbox"
                                className="accent-papan size-5 shrink-0"
                                checked={!form.data.is_active}
                                onChange={(e) => form.setData('is_active', !e.target.checked)}
                            />
                        </label>
                    )}
                    {form.errors.is_active && <p role="alert" className="text-keluar text-xs font-medium">{form.errors.is_active}</p>}
                </form>
                {editing?.is_active && <AdjustBalance key={editing.id} source={editing} onDone={() => setOpen(false)} />}
            </Panel>
        </>
    );
}

/** Match the wallet to the real money: the difference is posted as "Selisih / Lupa" (server computes it again). */
function AdjustBalance({ source, onDone }: { source: Source; onDone: () => void }) {
    const form = useForm({ actual_balance_minor: '', idempotency_key: newIdempotencyKey() });
    const current = Number(source.current_balance_minor);
    const diff = form.data.actual_balance_minor === '' ? null : Number(form.data.actual_balance_minor) - current;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!diff) return;
        form.transform((data) => ({ ...data, actual_balance_minor: Number(data.actual_balance_minor) }));
        form.post(`/fund-sources/${source.id}/adjust`, { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form onSubmit={submit} className="border-border mt-6 flex flex-col gap-3 border-t pt-6">
            <div>
                <p className="text-sm font-bold">{t('Sesuaikan saldo')}</p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{t('Isi saldo asli sekarang. Selisihnya dicatat otomatis ke kategori "Selisih / Lupa".')}</p>
            </div>
            <Field label={t('Saldo asli sekarang')} htmlFor="fs-actual" error={form.errors.actual_balance_minor}>
                <input
                    id="fs-actual"
                    className="field tabular-nums"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={String(current)}
                    value={form.data.actual_balance_minor}
                    onChange={(e) => form.setData('actual_balance_minor', e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13))}
                    aria-invalid={!!form.errors.actual_balance_minor}
                />
            </Field>
            {diff !== null && (
                <p aria-live="polite" className={cn('rounded-xl px-3.5 py-3 text-sm font-medium', diff === 0 ? 'bg-sunken text-muted-foreground' : diff < 0 ? 'bg-keluar-wash text-keluar' : 'bg-masuk-wash text-masuk')}>
                    {diff === 0
                        ? t('Saldonya udah sama, nggak ada selisih.')
                        : `${diff < 0 ? t('Kurang') : t('Lebih')} ${rupiah(Math.abs(diff))} · ${diff < 0 ? t('dicatat sebagai pengeluaran') : t('dicatat sebagai pemasukan')}`}
                </p>
            )}
            <button type="submit" disabled={!diff || form.processing} className="bg-sunken inline-flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-45">
                <Scale className="size-4" /> {form.processing ? t('Menyimpan…') : t('Sesuaikan')}
            </button>
        </form>
    );
}

function SourcePlank({ source, onPick }: { source: Source; onPick: (s: Source) => void }) {
    const Icon = sourceIcon(source.type);
    const ink = inkOn(source.color);
    return (
        <button
            type="button"
            onClick={() => onPick(source)}
            aria-label={`${t('Ubah')} ${source.name}`}
            className="flex min-h-40 flex-col justify-between gap-4 rounded-[var(--radius)] p-5 text-left transition-transform active:scale-[0.98]"
            style={{ background: source.color, color: ink }}
        >
            <span className="flex w-full items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0 opacity-75" />
                    <span className="truncate text-sm font-semibold">{source.name}</span>
                </span>
                <Pencil className="size-3.5 shrink-0 opacity-60" />
            </span>
            <span className="min-w-0">
                <span className="block text-xs opacity-70">{sourceTypeLabel(source.type)}</span>
                <Money value={Number(source.current_balance_minor)} className="mt-1 block truncate text-[2.1rem]" />
                <span className="mt-1 block text-xs opacity-70">
                    {t('Saldo awal')} {rupiah(source.opening_balance_minor)} · {shortDate(source.opening_date.slice(0, 10))}
                </span>
            </span>
        </button>
    );
}

function ColorPicker({ value, onChange, error }: { value: string; onChange: (color: string) => void; error?: string }) {
    const custom = !SWATCHES.includes(value.toLowerCase());
    return (
        <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">{t('Warna')}</legend>
            <div className="flex flex-wrap gap-2">
                {SWATCHES.map((color) => (
                    <button
                        key={color}
                        type="button"
                        aria-label={color}
                        aria-pressed={value.toLowerCase() === color}
                        onClick={() => onChange(color)}
                        className={cn('grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-[var(--background)] transition-shadow', value.toLowerCase() === color && 'ring-foreground ring-2')}
                        style={{ background: color, color: inkOn(color) }}
                    >
                        {value.toLowerCase() === color && <Check className="size-4" />}
                    </button>
                ))}
                <label
                    className={cn('border-border relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-full border ring-offset-2 ring-offset-[var(--background)]', custom && 'ring-foreground ring-2')}
                    style={custom ? { background: value, color: inkOn(value) } : undefined}
                >
                    <Plus className="size-4" />
                    <span className="sr-only">{t('Warna lain')}</span>
                    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
            </div>
            {error && <p role="alert" className="text-keluar text-xs font-medium">{error}</p>}
        </fieldset>
    );
}

FundSources.layout = {
    breadcrumbs: [{ title: t('Sumber Dana'), href: '/fund-sources' }],
};
