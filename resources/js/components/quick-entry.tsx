import { router, usePage } from '@inertiajs/react';
import { Check, Trash2 } from 'lucide-react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { Field, Panel, Segmented } from '@/components/finance/kit';
import {
    groupDigits,
    inkOn,
    localDate,
    newIdempotencyKey,
    shortDate,
} from '@/lib/format';
import type { Category, FundSource, QuickEntryData } from '@/lib/finance';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type Mode = 'expense' | 'income' | 'transfer';

export type EditableEntry = {
    id: string;
    type: string;
    amount: number;
    date: string;
    description?: string | null;
    counterparty?: string | null;
    fund_source_id?: number | null;
    category_id?: number | null;
    is_recurring?: boolean;
};

type OpenOptions = { mode?: Mode; entry?: EditableEntry };

const QuickEntryContext = createContext<(options?: OpenOptions) => void>(
    () => {},
);

export const useQuickEntry = () => useContext(QuickEntryContext);

const LAST_KEY = 'dompetku:last-pick';
type LastPick = Partial<Record<Mode, { source?: number; category?: number }>>;
const readLast = (): LastPick => {
    try {
        return JSON.parse(localStorage.getItem(LAST_KEY) ?? '{}') as LastPick;
    } catch {
        return {};
    }
};

type FormState = {
    amount: string;
    source: number | null;
    toSource: number | null;
    category: number | null;
    date: string;
    description: string;
    note: string;
    recurring: boolean;
};

export function QuickEntryProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>('expense');
    const [editing, setEditing] = useState<EditableEntry | null>(null);
    const [seed, setSeed] = useState(0);

    const openEntry = useCallback((options: OpenOptions = {}) => {
        const entry = options.entry ?? null;
        setEditing(entry);
        setMode(
            entry
                ? entry.type === 'income'
                    ? 'income'
                    : 'expense'
                : (options.mode ?? 'expense'),
        );
        setSeed((s) => s + 1);
        setOpen(true);
    }, []);

    // "n" anywhere (outside inputs) opens the sheet; ?new=1 deep link (PWA shortcut) too
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (
                event.key.toLowerCase() !== 'n' ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                target.closest('input, textarea, select, [contenteditable]')
            )
                return;
            event.preventDefault();
            openEntry();
        };
        window.addEventListener('keydown', onKey);
        const params = new URLSearchParams(window.location.search);
        if (params.get('new') === '1') {
            openEntry({ mode: (params.get('mode') as Mode) ?? undefined });
            params.delete('new');
            params.delete('mode');
            const query = params.toString();
            window.history.replaceState(
                window.history.state,
                '',
                window.location.pathname + (query ? `?${query}` : ''),
            );
        }
        return () => window.removeEventListener('keydown', onKey);
    }, [openEntry]);

    return (
        <QuickEntryContext.Provider value={openEntry}>
            {children}
            <QuickEntrySheet
                key={seed}
                open={open}
                onOpenChange={setOpen}
                initialMode={mode}
                editing={editing}
            />
        </QuickEntryContext.Provider>
    );
}

function QuickEntrySheet({
    open,
    onOpenChange,
    initialMode,
    editing,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMode: Mode;
    editing: EditableEntry | null;
}) {
    const data = usePage().props.quickEntry as QuickEntryData | null;
    const sources = data?.fundSources ?? [];
    const categories = data?.categories ?? [];
    const [mode, setMode] = useState<Mode>(initialMode);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showNote, setShowNote] = useState(Boolean(editing?.counterparty));
    const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
    const amountRef = useRef<HTMLInputElement>(null);
    const [amountFocused, setAmountFocused] = useState(false);

    const pickFor = useCallback(
        (next: Mode) => {
            const last = readLast()[next] ?? {};
            const firstSource = sources.find((s) => s.id === last.source)?.id ?? sources[0]?.id ?? null;
            const cats = categories.filter((c) => c.type === (next === 'income' ? 'income' : 'expense'));
            const firstCategory = cats.find((c) => c.id === last.category)?.id ?? null;
            return { source: firstSource, category: next === 'transfer' ? null : firstCategory };
        },
        [sources, categories],
    );

    const [form, setForm] = useState<FormState>(() => {
        if (editing) {
            return {
                amount: String(editing.amount),
                source: editing.fund_source_id ?? sources[0]?.id ?? null,
                toSource: null,
                category: editing.category_id ?? null,
                date: editing.date,
                description: editing.description ?? '',
                note: editing.counterparty ?? '',
                recurring: editing.is_recurring ?? true,
            };
        }
        const pick = pickFor(initialMode);
        return {
            amount: '',
            source: pick.source,
            toSource: sources.find((s) => s.id !== pick.source)?.id ?? null,
            category: pick.category,
            date: localDate(),
            description: '',
            note: '',
            recurring: true,
        };
    });
    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const switchMode = (next: Mode) => {
        setMode(next);
        setErrors({});
        const pick = pickFor(next);
        setForm((f) => ({
            ...f,
            category: pick.category,
            source: f.source ?? pick.source,
            toSource:
                f.toSource && f.toSource !== f.source
                    ? f.toSource
                    : (sources.find((s) => s.id !== (f.source ?? pick.source))?.id ?? null),
        }));
    };

    const visibleCategories = useMemo(
        () => categories.filter((c) => c.type === (mode === 'income' ? 'income' : 'expense')),
        [categories, mode],
    );

    const amount = Number(form.amount || 0);
    const canSubmit =
        amount > 0 &&
        form.source !== null &&
        (mode === 'transfer'
            ? form.toSource !== null && form.toSource !== form.source
            : form.category !== null && form.description.trim() !== '');

    const done = () => {
        if (mode !== 'transfer' && !editing) {
            const last = readLast();
            last[mode] = { source: form.source ?? undefined, category: form.category ?? undefined };
            localStorage.setItem(LAST_KEY, JSON.stringify(last));
        }
        onOpenChange(false);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit || processing) return;
        const options = {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onError: (e: Record<string, string>) => setErrors(e),
            onSuccess: () => {
                setIdempotencyKey(newIdempotencyKey());
                done();
            },
        };
        if (mode === 'transfer') {
            router.post(
                '/transfers',
                {
                    from_fund_source_id: form.source,
                    to_fund_source_id: form.toSource,
                    amount_minor: amount,
                    effective_date: form.date,
                    description: form.description || null,
                    idempotency_key: idempotencyKey,
                },
                options,
            );
            return;
        }
        const payload = {
            type: mode,
            amount_minor: amount,
            fund_source_id: form.source,
            category_id: form.category,
            effective_date: form.date,
            description: form.description.trim(),
            counterparty: form.note || null,
            is_recurring: mode === 'income' ? form.recurring : true,
        };
        if (editing) {
            router.put(`/transactions/${editing.id}`, payload, options);
        } else {
            router.post('/transactions', { ...payload, idempotency_key: idempotencyKey }, options);
        }
    };

    const destroy = () => {
        if (!editing) return;
        router.delete(`/transactions/${editing.id}`, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    const typed = groupDigits(amount);
    const title = editing
        ? t('Ubah transaksi')
        : mode === 'transfer'
          ? t('Pindah dana')
          : mode === 'income'
            ? t('Catat pemasukan')
            : t('Catat pengeluaran');

    return (
        <Panel
            open={open}
            onOpenChange={onOpenChange}
            initialFocus={editing ? undefined : amountRef}
            title={title}
            description={editing ? shortDate(editing.date) : undefined}
            footer={
                <div className="flex gap-2">
                    {editing && (
                        <button
                            type="button"
                            onClick={() => (confirmDelete ? destroy() : setConfirmDelete(true))}
                            disabled={processing}
                            className={cn(
                                'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors',
                                confirmDelete
                                    ? 'border-keluar bg-keluar text-white'
                                    : 'text-keluar border-border hover:bg-keluar-wash',
                            )}
                        >
                            <Trash2 className="size-4" />
                            {confirmDelete ? t('Yakin hapus?') : <span className="sr-only">{t('Hapus')}</span>}
                        </button>
                    )}
                    <button
                        type="submit"
                        form="quick-entry-form"
                        disabled={!canSubmit || processing}
                        className="btn-kuning inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl text-base disabled:opacity-45"
                    >
                        <Check className="size-5" />
                        {processing ? t('Menyimpan…') : editing ? t('Simpan perubahan') : t('Simpan')}
                    </button>
                </div>
            }
        >
            {sources.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                    {t('Tambahkan sumber dana terlebih dahulu.')}{' '}
                    <a href="/fund-sources" className="text-foreground font-semibold underline">
                        {t('Sumber dana')}
                    </a>
                </div>
            ) : (
                <form id="quick-entry-form" onSubmit={submit} className="flex flex-col gap-5">
                    {!editing && (
                        <Segmented<Mode>
                            label={t('Jenis transaksi')}
                            value={mode}
                            onChange={switchMode}
                            options={[
                                { value: 'expense', label: t('Keluar') },
                                { value: 'income', label: t('Masuk') },
                                { value: 'transfer', label: t('Pindah') },
                            ]}
                        />
                    )}

                    {/* The plank: digits are painted live as they are typed. */}
                    <div
                        className="plank-papan relative cursor-text px-5 pt-4 pb-5"
                        onClick={() => amountRef.current?.focus()}
                    >
                        <p className="papan-num mt-1 flex items-baseline text-[clamp(2.5rem,11vw,3.25rem)]" aria-hidden="true">
                            <span className={cn('mr-1 text-[0.55em]', mode === 'expense' ? 'text-[#ffb4a6]' : mode === 'income' ? 'text-kuning' : 'text-papan-soft')}>
                                {mode === 'expense' ? '−' : mode === 'income' ? '+' : ''}
                            </span>
                            <span className="rp">Rp</span>
                            <span className={amount ? '' : 'text-papan-soft/70'}>
                                {typed.slice(0, -1)}
                                <span key={form.amount.length} className={amount ? 'digit-land' : ''}>
                                    {typed.slice(-1)}
                                </span>
                            </span>
                            <span
                                className={cn(
                                    'bg-kuning ml-1 h-[0.8em] w-[3px] self-center rounded-full',
                                    amountFocused ? 'animate-pulse' : 'opacity-0',
                                )}
                            />
                        </p>
                        <input
                            ref={amountRef}
                            id="qe-amount"
                            aria-label={t('Nominal')}
                            inputMode="numeric"
                            autoComplete="off"
                            value={form.amount}
                            onFocus={() => setAmountFocused(true)}
                            onBlur={() => setAmountFocused(false)}
                            onChange={(e) =>
                                set('amount', e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13))
                            }
                            className="absolute inset-0 h-full w-full cursor-text opacity-0"
                        />
                        <div className="relative mt-4 flex flex-wrap gap-1.5">
                            {[10000, 20000, 50000, 100000].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        set('amount', String(amount + value));
                                    }}
                                    className="chip min-h-8 px-3 text-xs"
                                >
                                    +{value / 1000}rb
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (amount) set('amount', `${form.amount}000`.slice(0, 13));
                                }}
                                className="chip min-h-8 px-3 text-xs"
                            >
                                000
                            </button>
                            {amount > 0 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        set('amount', '');
                                    }}
                                    className="chip min-h-8 px-3 text-xs"
                                >
                                    {t('Hapus')}
                                </button>
                            )}
                        </div>
                        {errors.amount_minor && (
                            <p role="alert" className="mt-2 text-xs font-medium text-[#ffcdc4]">
                                {errors.amount_minor}
                            </p>
                        )}
                    </div>

                    {mode === 'transfer' ? (
                        <>
                            <WalletPicker label={t('Dari')} sources={sources} value={form.source} onChange={(v) => set('source', v)} error={errors.from_fund_source_id} />
                            <WalletPicker
                                label={t('Ke')}
                                sources={sources.filter((s) => s.id !== form.source)}
                                value={form.toSource}
                                onChange={(v) => set('toSource', v)}
                                error={errors.to_fund_source_id}
                            />
                        </>
                    ) : (
                        <>
                            <ChoiceGroup label={t('Kategori')} error={errors.category_id}>
                                {visibleCategories.map((category) => (
                                    <ColorChip
                                        key={category.id}
                                        color={category.color}
                                        selected={form.category === category.id}
                                        onClick={() => set('category', category.id)}
                                    >
                                        {category.name}
                                    </ColorChip>
                                ))}
                                {visibleCategories.length === 0 && (
                                    <a href="/categories" className="text-muted-foreground text-sm underline">
                                        {t('Bikin kategori dulu')}
                                    </a>
                                )}
                            </ChoiceGroup>
                            <WalletPicker label={t('Pakai dompet')} sources={sources} value={form.source} onChange={(v) => set('source', v)} error={errors.fund_source_id} />
                        </>
                    )}

                    <Field
                        label={mode === 'transfer' ? t('Keterangan (opsional)') : t('Judul')}
                        htmlFor="qe-description"
                        error={errors.description}
                    >
                        <input
                            id="qe-description"
                            className="field"
                            value={form.description}
                            maxLength={255}
                            onChange={(e) => set('description', e.target.value)}
                            placeholder={
                                mode === 'expense' ? t('Beli apa? mis. Nasi padang') : mode === 'income' ? t('Dari mana? mis. Gaji Oktober') : t('mis. Isi saldo e-wallet')
                            }
                        />
                    </Field>

                    <ChoiceGroup label={t('Tanggal')} error={errors.effective_date}>
                        {[
                            { value: localDate(), label: t('Hari ini') },
                            { value: localDate(-1), label: t('Kemarin') },
                        ].map((day) => (
                            <button
                                key={day.value}
                                type="button"
                                aria-pressed={form.date === day.value}
                                onClick={() => set('date', day.value)}
                                className="chip"
                            >
                                {day.label}
                            </button>
                        ))}
                        <input
                            type="date"
                            aria-label={t('Pilih tanggal')}
                            value={form.date}
                            onChange={(e) => e.target.value && set('date', e.target.value)}
                            className={cn('chip font-medium tabular-nums', ![localDate(), localDate(-1)].includes(form.date) && 'border-foreground')}
                        />
                    </ChoiceGroup>

                    {mode === 'income' && (
                        <label className="plank flex cursor-pointer items-start gap-3 p-3.5">
                            <input
                                type="checkbox"
                                className="accent-papan mt-0.5 size-5 shrink-0"
                                checked={form.recurring}
                                onChange={(e) => set('recurring', e.target.checked)}
                            />
                            <span className="text-sm">
                                <span className="font-semibold">{t('Gaji / pemasukan rutin')}</span>
                                <span className="text-muted-foreground block text-xs leading-relaxed">
                                    {t('Matikan untuk bonus/THR, biar nggak ikut patokan anggaran bulanan.')}
                                </span>
                            </span>
                        </label>
                    )}

                    {mode !== 'transfer' &&
                        (showNote ? (
                            <Field label={t('Catatan')} htmlFor="qe-note" error={errors.counterparty}>
                                <textarea id="qe-note" className="field" rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
                            </Field>
                        ) : (
                            <button type="button" onClick={() => setShowNote(true)} className="text-muted-foreground hover:text-foreground self-start text-sm font-medium underline-offset-4 hover:underline">
                                + {t('Tambah catatan')}
                            </button>
                        ))}

                    {errors.transaction && (
                        <p role="alert" className="text-keluar text-sm font-medium">
                            {errors.transaction}
                        </p>
                    )}
                </form>
            )}
        </Panel>
    );
}

function ChoiceGroup({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{label}</legend>
            <div className="flex flex-wrap gap-1.5">{children}</div>
            {error && (
                <p role="alert" className="text-keluar text-xs font-medium">
                    {error}
                </p>
            )}
        </fieldset>
    );
}

function ColorChip({
    color,
    selected,
    onClick,
    children,
}: {
    color: string;
    selected: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className="chip"
            style={selected ? { background: color, borderColor: color, color: inkOn(color) } : undefined}
        >
            {!selected && <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />}
            {children}
        </button>
    );
}

function WalletPicker({
    label,
    sources,
    value,
    onChange,
    error,
}: {
    label: string;
    sources: FundSource[];
    value: number | null;
    onChange: (value: number) => void;
    error?: string;
}) {
    return (
        <ChoiceGroup label={label} error={error}>
            {sources.map((source) => (
                <ColorChip key={source.id} color={source.color} selected={value === source.id} onClick={() => onChange(source.id)}>
                    {source.name}
                </ColorChip>
            ))}
        </ChoiceGroup>
    );
}

export type { Category, FundSource };
