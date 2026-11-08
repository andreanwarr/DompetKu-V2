import { Head, useForm } from '@inertiajs/react';
import { Archive, Check, ChevronDown, Plus, Tags } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, Field, Page, PageHeader, Panel, Section, Segmented } from '@/components/finance/kit';
import { inkOn } from '@/lib/format';
import { bucketLabel } from '@/lib/finance';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Kind = 'expense' | 'income';
type Bucket = 'essential' | 'lifestyle' | 'saving';
type Category = {
    id: number;
    name: string;
    type: Kind;
    icon?: string | null;
    color: string;
    bucket: string;
    is_archived: boolean;
};

const BUCKETS: { value: Bucket; text: string }[] = [
    { value: 'essential', text: t('Kebutuhan pokok: makan, kos, listrik, transport. Patokannya ±50% gaji.') },
    { value: 'lifestyle', text: t('Enak tapi bisa ditahan: nongkrong, jajan, langganan. Patokannya ±30% gaji.') },
    { value: 'saving', text: t('Buat masa depan: tabungan, investasi, dana darurat. Minimal 20% gaji.') },
];
const SWATCHES = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#eab308', '#64748b'];

export default function Categories({ categories }: { categories: Category[] }) {
    const [kind, setKind] = useState<Kind>('expense');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const form = useForm({ type: 'expense' as Kind, name: '', color: SWATCHES[0], bucket: 'essential' as string, is_archived: false });

    const ofKind = categories.filter((c) => c.type === kind);
    const live = ofKind.filter((c) => !c.is_archived);
    const archived = ofKind.filter((c) => c.is_archived);
    const ungrouped = live.filter((c) => !BUCKETS.some((b) => b.value === c.bucket));

    const startAdd = () => {
        setEditing(null);
        form.clearErrors();
        form.setData({ type: kind, name: '', color: SWATCHES[0], bucket: 'essential', is_archived: false });
        setOpen(true);
    };
    const startEdit = (category: Category) => {
        setEditing(category);
        form.clearErrors();
        form.setData({
            type: category.type,
            name: category.name,
            color: category.color || SWATCHES[0],
            bucket: BUCKETS.some((b) => b.value === category.bucket) ? category.bucket : 'lifestyle',
            is_archived: category.is_archived,
        });
        setOpen(true);
    };
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const done = { preserveScroll: true, onSuccess: () => setOpen(false) };
        // income categories have no bucket: the server sets it to 'income' and rejects anything else
        if (editing) {
            form.transform(({ name, color, bucket, is_archived }) => ({ name, color, is_archived, ...(editing.type === 'expense' ? { bucket } : {}) }));
            form.put(`/categories/${editing.id}`, done);
        } else {
            form.transform(({ type, name, color, bucket }) => ({ type, name, color, ...(type === 'expense' ? { bucket } : {}) }));
            form.post('/categories', done);
        }
    };
    const formKind = editing ? editing.type : form.data.type;

    const rows = (items: Category[], muted = false) => (
        <ul className="plank divide-border divide-y overflow-hidden">
            {items.map((category) => (
                <li key={category.id}>
                    <button type="button" onClick={() => startEdit(category)} className="row-press flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
                        <span className={cn('size-3.5 shrink-0 rounded-full', muted && 'opacity-50')} style={{ background: category.color }} aria-hidden="true" />
                        <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', muted && 'text-muted-foreground')}>{category.name}</span>
                        {muted && category.type === 'expense' && <span className="text-muted-foreground text-xs">{bucketLabel(category.bucket)}</span>}
                    </button>
                </li>
            ))}
        </ul>
    );

    return (
        <>
            <Head title={t('Kategori')} />
            <Page>
                <PageHeader
                    title={t('Kategori')}
                    description={t('Kelompok kategori dipakai buat nilai pola belanja lo di saran otomatis.')}
                    actions={
                        <button type="button" onClick={startAdd} className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm">
                            <Plus className="size-4" strokeWidth={2.5} /> {t('Kategori baru')}
                        </button>
                    }
                >
                    <Segmented<Kind>
                        label={t('Jenis kategori')}
                        value={kind}
                        onChange={setKind}
                        className="sm:max-w-sm"
                        options={[
                            { value: 'expense', label: t('Pengeluaran') },
                            { value: 'income', label: t('Pemasukan') },
                        ]}
                    />
                </PageHeader>

                {live.length === 0 && archived.length === 0 ? (
                    <EmptyState
                        icon={Tags}
                        title={kind === 'expense' ? t('Belum ada kategori pengeluaran') : t('Belum ada kategori pemasukan')}
                        text={t('Bikin kategori biar tiap transaksi gampang dikenali.')}
                        action={
                            <button type="button" onClick={startAdd} className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm">
                                <Plus className="size-4" /> {t('Kategori baru')}
                            </button>
                        }
                    />
                ) : kind === 'expense' ? (
                    <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
                        {BUCKETS.map((bucket) => {
                            const items = live.filter((c) => c.bucket === bucket.value);
                            return (
                                <Section key={bucket.value} title={bucketLabel(bucket.value)}>
                                    <p className="text-muted-foreground -mt-1 text-sm leading-relaxed">{bucket.text}</p>
                                    {items.length > 0 ? rows(items) : <p className="text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-5 text-center text-sm">{t('Belum ada kategori di sini.')}</p>}
                                </Section>
                            );
                        })}
                        {ungrouped.length > 0 && (
                            <Section title={t('Belum dikelompokkan')} className="lg:col-span-3">
                                {rows(ungrouped)}
                            </Section>
                        )}
                    </div>
                ) : (
                    live.length > 0 && <div className="lg:max-w-xl">{rows(live)}</div>
                )}

                {archived.length > 0 && (
                    <details className="group">
                        <summary className="text-muted-foreground hover:text-foreground flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                            <Archive className="size-4" /> {t('Diarsipkan')} ({archived.length})
                            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-2 lg:max-w-xl">{rows(archived, true)}</div>
                    </details>
                )}
            </Page>

            <Panel
                open={open}
                onOpenChange={setOpen}
                title={editing ? t('Ubah kategori') : t('Kategori baru')}
                footer={
                    <button
                        type="submit"
                        form="category-form"
                        disabled={form.processing}
                        className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-base disabled:opacity-45"
                    >
                        <Check className="size-5" />
                        {form.processing ? t('Menyimpan…') : editing ? t('Simpan perubahan') : t('Tambahkan')}
                    </button>
                }
            >
                <form id="category-form" onSubmit={submit} className="flex flex-col gap-5">
                    {!editing && (
                        <Segmented<Kind>
                            label={t('Jenis')}
                            value={form.data.type}
                            onChange={(value) => form.setData('type', value)}
                            options={[
                                { value: 'expense', label: t('Pengeluaran') },
                                { value: 'income', label: t('Pemasukan') },
                            ]}
                        />
                    )}
                    {form.errors.type && <p role="alert" className="text-keluar text-xs font-medium">{form.errors.type}</p>}

                    <Field label={t('Nama')} htmlFor="cat-name" error={form.errors.name}>
                        <input
                            id="cat-name"
                            className="field"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder={t('Contoh: Kopi')}
                            maxLength={120}
                            aria-invalid={!!form.errors.name}
                            required
                        />
                    </Field>

                    {formKind === 'expense' && (
                        <fieldset className="flex flex-col gap-1.5">
                            <legend className="mb-1.5 text-sm font-medium">{t('Kelompok')}</legend>
                            <div className="flex flex-wrap gap-1.5">
                                {BUCKETS.map((bucket) => (
                                    <button key={bucket.value} type="button" aria-pressed={form.data.bucket === bucket.value} onClick={() => form.setData('bucket', bucket.value)} className="chip min-h-10">
                                        {bucketLabel(bucket.value)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-muted-foreground text-xs leading-relaxed">{BUCKETS.find((b) => b.value === form.data.bucket)?.text}</p>
                            {form.errors.bucket && <p role="alert" className="text-keluar text-xs font-medium">{form.errors.bucket}</p>}
                        </fieldset>
                    )}

                    <fieldset className="flex flex-col gap-1.5">
                        <legend className="mb-1.5 text-sm font-medium">{t('Warna')}</legend>
                        <div className="flex flex-wrap gap-2">
                            {SWATCHES.map((color) => {
                                const on = form.data.color.toLowerCase() === color;
                                return (
                                    <button
                                        key={color}
                                        type="button"
                                        aria-label={color}
                                        aria-pressed={on}
                                        onClick={() => form.setData('color', color)}
                                        className={cn('grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-[var(--background)]', on && 'ring-foreground ring-2')}
                                        style={{ background: color, color: inkOn(color) }}
                                    >
                                        {on && <Check className="size-4" />}
                                    </button>
                                );
                            })}
                            <label
                                className={cn(
                                    'border-border relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-full border ring-offset-2 ring-offset-[var(--background)]',
                                    !SWATCHES.includes(form.data.color.toLowerCase()) && 'ring-foreground ring-2',
                                )}
                                style={!SWATCHES.includes(form.data.color.toLowerCase()) ? { background: form.data.color, color: inkOn(form.data.color) } : undefined}
                            >
                                <Plus className="size-4" />
                                <span className="sr-only">{t('Warna lain')}</span>
                                <input type="color" value={form.data.color} onChange={(e) => form.setData('color', e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                            </label>
                        </div>
                        {form.errors.color && <p role="alert" className="text-keluar text-xs font-medium">{form.errors.color}</p>}
                    </fieldset>

                    {editing && (
                        <label className="plank flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3">
                            <Archive className="text-muted-foreground size-4 shrink-0" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">{t('Arsipkan kategori ini')}</span>
                                <span className="text-muted-foreground block text-xs">{t('Nggak muncul lagi pas nyatet. Transaksi lamanya tetap aman.')}</span>
                            </span>
                            <input
                                type="checkbox"
                                className="accent-papan size-5 shrink-0"
                                checked={form.data.is_archived}
                                onChange={(e) => form.setData('is_archived', e.target.checked)}
                            />
                        </label>
                    )}
                    {form.errors.is_archived && <p role="alert" className="text-keluar text-xs font-medium">{form.errors.is_archived}</p>}
                </form>
            </Panel>
        </>
    );
}

Categories.layout = {
    breadcrumbs: [{ title: t('Kategori'), href: '/categories' }],
};
