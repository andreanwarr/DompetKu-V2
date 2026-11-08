import { Head, useForm } from '@inertiajs/react';
import { Check, PiggyBank, Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import {
    EmptyState,
    Field,
    Page,
    PageHeader,
    Panel,
    Section,
    Segmented,
} from '@/components/finance/kit';
import { Money } from '@/components/finance/money';
import { inkOn, localDate, newIdempotencyKey, rupiah, shortDate } from '@/lib/format';
import type { FundSource } from '@/lib/finance';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Movement = {
    goal_id: number;
    type: string;
    amount: number;
    date: string;
    person: string;
    source: string;
    description?: string | null;
};
type Goal = {
    id: number;
    name: string;
    target_minor: number;
    balance: number;
    target_date?: string | null;
    color: string;
    status: string;
    history: Movement[];
};

const COLORS = ['#7c3aed', '#0e5a3a', '#2563eb', '#db2777', '#ea580c', '#0f766e'];
const digits = (value: string) => value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
const percentOf = (goal: Goal) =>
    goal.target_minor > 0 ? Math.min(100, Math.round((goal.balance / goal.target_minor) * 100)) : 0;

/** How the goal is pacing: per-month need when there is a date, otherwise ETA from the last 90 days. */
function pace(goal: Goal) {
    const remaining = Math.max(0, goal.target_minor - goal.balance);
    if (remaining === 0) return { text: t('Target tercapai'), late: false };
    const today = localDate();
    if (goal.target_date) {
        const target = goal.target_date.slice(0, 10);
        if (target < today) return { text: t('Lewat tanggal target'), late: true };
        const [ty, tm] = target.split('-').map(Number);
        const [y, m] = today.split('-').map(Number);
        const months = Math.max(1, (ty - y) * 12 + (tm - m));
        return { text: `${t('Perlu')} ${rupiah(Math.ceil(remaining / months))}/${t('bln')}`, late: false };
    }
    const since = localDate(-90);
    const net = goal.history
        .filter((mov) => mov.date >= since)
        .reduce((sum, mov) => sum + (mov.type === 'savings_deposit' ? mov.amount : -mov.amount), 0);
    if (net <= 0) return null;
    return { text: `${t('Kira-kira')} ${Math.ceil(remaining / (net / 3))} ${t('bln lagi')}`, late: false };
}

export default function Tabungan({
    fundSources,
    savingGoals,
}: {
    fundSources: FundSource[];
    savingGoals: Goal[];
}) {
    const [creating, setCreating] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);
    const total = savingGoals.reduce((sum, g) => sum + g.balance, 0);
    const active = savingGoals.filter((g) => g.status === 'active');
    const toGo = active.reduce((sum, g) => sum + Math.max(0, g.target_minor - g.balance), 0);
    const opened = savingGoals.find((g) => g.id === openId) ?? null;

    return (
        <>
            <Head title={t('Tabungan')} />
            <Page>
                <PageHeader
                    title={t('Tabungan')}
                    description={t('Sisihkan sekarang, wujudkan rencana lo pelan-pelan.')}
                    actions={
                        <button
                            type="button"
                            onClick={() => setCreating(true)}
                            className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm"
                        >
                            <Plus className="size-4" strokeWidth={2.5} /> {t('Target baru')}
                        </button>
                    }
                />

                <section aria-label={t('Total tabungan')} className="plank-papan flex flex-col gap-5 p-5 sm:p-7">
                    <div className="min-w-0">
                        <p className="label-caps">{t('Total tabungan')}</p>
                        <Money value={total} className="mt-3 block text-[clamp(2.5rem,10.5vw,3.75rem)]" />
                    </div>
                    <dl className="grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-3">
                        <div>
                            <dt className="label-caps">{t('Target aktif')}</dt>
                            <dd className="papan-num mt-1.5 text-2xl">{active.length}</dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="label-caps">{t('Kurang lagi')}</dt>
                            <dd className="mt-1.5 truncate">
                                <Money value={toGo} className="text-2xl" />
                            </dd>
                        </div>
                    </dl>
                </section>

                <Section title={t('Target lo')}>
                    {savingGoals.length === 0 ? (
                        <EmptyState
                            icon={PiggyBank}
                            title={t('Belum ada tabungan')}
                            text={t('Bikin target pertama, mis. dana darurat atau DP rumah.')}
                            action={
                                <button
                                    type="button"
                                    onClick={() => setCreating(true)}
                                    className="btn-kuning inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm"
                                >
                                    <Plus className="size-4" /> {t('Target baru')}
                                </button>
                            }
                        />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                            {savingGoals.map((goal) => (
                                <GoalPlank key={goal.id} goal={goal} onOpen={() => setOpenId(goal.id)} />
                            ))}
                        </div>
                    )}
                </Section>
            </Page>

            <NewGoalPanel open={creating} onOpenChange={setCreating} />
            {opened && (
                <GoalPanel
                    key={opened.id}
                    goal={opened}
                    sources={fundSources}
                    open={openId !== null}
                    onOpenChange={(open) => !open && setOpenId(null)}
                />
            )}
        </>
    );
}

function GoalPlank({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
    const ink = inkOn(goal.color);
    const percent = percentOf(goal);
    const status = pace(goal);
    return (
        <button
            type="button"
            onClick={onOpen}
            className={cn(
                'flex min-h-48 w-full min-w-0 flex-col justify-between gap-4 rounded-[var(--radius)] p-5 text-left transition-transform active:scale-[0.98]',
                goal.status !== 'active' && 'opacity-70',
            )}
            style={{ background: goal.color, color: ink }}
        >
            <span className="flex w-full items-start justify-between gap-3">
                <span className="min-w-0 truncate font-semibold">{goal.name}</span>
                <span className="papan-num shrink-0 text-2xl">{percent}%</span>
            </span>
            <span className="block w-full min-w-0">
                <Money value={goal.balance} className="block truncate text-[2.5rem] leading-none" />
                <span className="mt-1.5 block truncate text-xs opacity-75">
                    {t('dari')} {rupiah(goal.target_minor)}
                    {goal.target_date ? ` · ${shortDate(goal.target_date)}` : ''}
                </span>
                <span
                    className="mt-3 block h-2 w-full overflow-hidden rounded-full"
                    style={{ background: `color-mix(in srgb, ${ink} 22%, transparent)` }}
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={goal.name}
                >
                    <span className="block h-full rounded-full" style={{ width: `${percent}%`, background: ink }} />
                </span>
                {status && (
                    <span className={cn('mt-2 block truncate text-xs font-semibold', status.late && 'underline decoration-2 underline-offset-2')}>
                        {status.text}
                    </span>
                )}
            </span>
        </button>
    );
}

function NewGoalPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const form = useForm({
        name: '',
        target_minor: '',
        opening_balance_minor: '',
        target_date: '',
        color: COLORS[0],
    });
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            target_minor: Number(data.target_minor),
            opening_balance_minor: Number(data.opening_balance_minor || 0),
            target_date: data.target_date || null,
        }));
        form.post('/savings', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Panel
            open={open}
            onOpenChange={onOpenChange}
            title={t('Target baru')}
            description={t('Saldo awal langsung dihitung sebagai tabungan, bukan dari kas likuid.')}
            footer={
                <button
                    type="submit"
                    form="new-goal-form"
                    disabled={form.processing || !form.data.name.trim() || !Number(form.data.target_minor)}
                    className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-base disabled:opacity-45"
                >
                    <Check className="size-5" /> {form.processing ? t('Menyimpan…') : t('Buat target')}
                </button>
            }
        >
            <form id="new-goal-form" onSubmit={submit} className="flex flex-col gap-4">
                <Field label={t('Nama target')} htmlFor="goal-name" error={form.errors.name}>
                    <input
                        id="goal-name"
                        className="field"
                        maxLength={120}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder={t('mis. Dana darurat')}
                        required
                    />
                </Field>
                <Field
                    label={t('Target nominal')}
                    htmlFor="goal-target"
                    error={form.errors.target_minor}
                    hint={Number(form.data.target_minor) ? rupiah(Number(form.data.target_minor)) : undefined}
                >
                    <input
                        id="goal-target"
                        className="field papan-num text-xl"
                        inputMode="numeric"
                        value={form.data.target_minor}
                        onChange={(e) => form.setData('target_minor', digits(e.target.value))}
                        required
                    />
                </Field>
                <Field
                    label={t('Saldo awal')}
                    htmlFor="goal-opening"
                    error={form.errors.opening_balance_minor}
                    hint={t('Uang yang udah ada di tabungan ini sekarang.')}
                >
                    <input
                        id="goal-opening"
                        className="field papan-num text-xl"
                        inputMode="numeric"
                        placeholder="0"
                        value={form.data.opening_balance_minor}
                        onChange={(e) => form.setData('opening_balance_minor', digits(e.target.value))}
                    />
                </Field>
                <Field label={t('Target tanggal')} htmlFor="goal-date" error={form.errors.target_date}>
                    <input
                        id="goal-date"
                        type="date"
                        className="field"
                        value={form.data.target_date}
                        onChange={(e) => form.setData('target_date', e.target.value)}
                    />
                </Field>
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm font-medium">{t('Warna')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                aria-pressed={form.data.color === color}
                                aria-label={color}
                                onClick={() => form.setData('color', color)}
                                className={cn(
                                    'grid size-11 place-items-center rounded-full border-2 transition-colors',
                                    form.data.color === color ? 'border-foreground' : 'border-transparent',
                                )}
                                style={{ background: color, color: inkOn(color) }}
                            >
                                {form.data.color === color && <Check className="size-4" />}
                            </button>
                        ))}
                    </div>
                    {form.errors.color && (
                        <p role="alert" className="text-keluar text-xs font-medium">
                            {form.errors.color}
                        </p>
                    )}
                </fieldset>
            </form>
        </Panel>
    );
}

function GoalPanel({
    goal,
    sources,
    open,
    onOpenChange,
}: {
    goal: Goal;
    sources: FundSource[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const percent = percentOf(goal);
    const status = pace(goal);
    const form = useForm({
        direction: 'deposit' as 'deposit' | 'withdrawal',
        fund_source_id: sources[0] ? String(sources[0].id) : '',
        external: false,
        counterparty: '',
        amount_minor: '',
        effective_date: localDate(),
        description: '',
        idempotency_key: newIdempotencyKey(),
    });
    const deposit = form.data.direction === 'deposit';
    const canSubmit =
        Number(form.data.amount_minor) > 0 && (form.data.external || form.data.fund_source_id !== '');

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        form.transform((data) => ({
            ...data,
            fund_source_id: data.external ? null : Number(data.fund_source_id),
            counterparty: data.counterparty || null,
            description: data.description || null,
            amount_minor: Number(data.amount_minor),
        }));
        form.post(`/savings/${goal.id}/movements`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('amount_minor', 'description', 'counterparty');
                form.setData('idempotency_key', newIdempotencyKey());
            },
        });
    };

    return (
        <Panel
            open={open}
            onOpenChange={onOpenChange}
            title={goal.name}
            footer={
                <button
                    type="submit"
                    form="goal-move-form"
                    disabled={form.processing || !canSubmit}
                    className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-base disabled:opacity-45"
                >
                    <Check className="size-5" />
                    {form.processing ? t('Menyimpan…') : deposit ? t('Catat setoran') : t('Catat penarikan')}
                </button>
            }
        >
            <div className="flex flex-col gap-6">
                <div className="rounded-[var(--radius)] p-5" style={{ background: goal.color, color: inkOn(goal.color) }}>
                    <p className="text-xs font-semibold tracking-[0.09em] uppercase opacity-75">{t('Saldo saat ini')}</p>
                    <Money value={goal.balance} className="mt-2 block text-[2.75rem] leading-none" />
                    <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                        <div className="min-w-0">
                            <dt className="opacity-75">{t('Target')}</dt>
                            <dd className="mt-0.5 truncate font-semibold">{rupiah(goal.target_minor)}</dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="opacity-75">{t('Kurang lagi')}</dt>
                            <dd className="mt-0.5 truncate font-semibold">
                                {rupiah(Math.max(0, goal.target_minor - goal.balance))}
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="opacity-75">{t('Tanggal target')}</dt>
                            <dd className="mt-0.5 truncate font-semibold">
                                {goal.target_date ? shortDate(goal.target_date) : '—'}
                            </dd>
                        </div>
                    </dl>
                    <p className="mt-3 text-xs font-semibold">
                        {percent}%{status ? ` · ${status.text}` : ''}
                    </p>
                </div>

                <form id="goal-move-form" onSubmit={submit} className="flex flex-col gap-4">
                    <Segmented
                        label={t('Jenis mutasi')}
                        value={form.data.direction}
                        onChange={(value) => form.setData('direction', value)}
                        options={[
                            { value: 'deposit', label: t('Setor') },
                            { value: 'withdrawal', label: t('Tarik') },
                        ]}
                    />
                    <Field
                        label={t('Nominal')}
                        htmlFor="move-amount"
                        error={form.errors.amount_minor}
                        hint={Number(form.data.amount_minor) ? rupiah(Number(form.data.amount_minor)) : undefined}
                    >
                        <input
                            id="move-amount"
                            className="field papan-num text-2xl"
                            inputMode="numeric"
                            autoComplete="off"
                            value={form.data.amount_minor}
                            onChange={(e) => form.setData('amount_minor', digits(e.target.value))}
                            required
                        />
                    </Field>

                    <fieldset className="flex min-w-0 flex-col gap-2">
                        <legend className="mb-2 text-sm font-medium">
                            {deposit ? t('Uangnya dari mana') : t('Uangnya ke mana')}
                        </legend>
                        <div className="flex flex-wrap gap-1.5">
                            {sources.map((source) => {
                                const selected = !form.data.external && form.data.fund_source_id === String(source.id);
                                return (
                                    <button
                                        key={source.id}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => {
                                            form.setData('external', false);
                                            form.setData('fund_source_id', String(source.id));
                                        }}
                                        className="chip"
                                        style={selected ? { background: source.color, borderColor: source.color, color: inkOn(source.color) } : undefined}
                                    >
                                        {!selected && <span className="size-2.5 rounded-full" style={{ background: source.color }} aria-hidden="true" />}
                                        {source.name}
                                    </button>
                                );
                            })}
                        </div>
                        <label
                            className={cn(
                                'plank mt-1 flex cursor-pointer items-start gap-3 p-3.5 transition-colors',
                                form.data.external && 'border-foreground',
                            )}
                        >
                            <input
                                type="checkbox"
                                className="accent-papan mt-0.5 size-5 shrink-0"
                                checked={form.data.external}
                                onChange={(e) => form.setData('external', e.target.checked)}
                            />
                            <span className="text-sm">
                                <span className="font-semibold">
                                    {deposit ? t('Setoran dari luar') : t('Ditarik ke luar')}
                                </span>
                                <span className="text-muted-foreground block text-xs leading-relaxed">
                                    {deposit
                                        ? t('Mis. pasangan nitip nabung. Saldo dompet lo nggak berkurang.')
                                        : t('Uangnya dipakai langsung di luar, nggak masuk dompet lo.')}
                                </span>
                            </span>
                        </label>
                        {form.errors.fund_source_id && (
                            <p role="alert" className="text-keluar text-xs font-medium">
                                {form.errors.fund_source_id}
                            </p>
                        )}
                    </fieldset>

                    <Field
                        label={t('Siapa yang menabung')}
                        htmlFor="move-person"
                        error={form.errors.counterparty}
                        hint={t('Kosongin kalau lo sendiri.')}
                    >
                        <input
                            id="move-person"
                            className="field"
                            maxLength={100}
                            value={form.data.counterparty}
                            onChange={(e) => form.setData('counterparty', e.target.value)}
                            placeholder={t('Yang menabung, mis. Istri')}
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('Tanggal')} htmlFor="move-date" error={form.errors.effective_date}>
                            <input
                                id="move-date"
                                type="date"
                                className="field"
                                value={form.data.effective_date}
                                onChange={(e) => e.target.value && form.setData('effective_date', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t('Catatan')} htmlFor="move-desc" error={form.errors.description}>
                            <input
                                id="move-desc"
                                className="field"
                                maxLength={1000}
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                            />
                        </Field>
                    </div>
                </form>

                <section className="flex flex-col gap-2">
                    <h3 className="font-display text-lg leading-none font-bold">{t('Riwayat mutasi')}</h3>
                    {goal.history.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t('Belum ada setoran. Mulai dari yang kecil.')}</p>
                    ) : (
                        <ul className="divide-border divide-y">
                            {goal.history.map((mov, i) => {
                                const isDeposit = mov.type === 'savings_deposit';
                                const external = mov.source === 'Dari luar';
                                return (
                                    <li key={i} className="flex items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {isDeposit ? t('Setoran') : t('Penarikan')} · {mov.person}
                                            </p>
                                            <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                                                {external && <UserRound className="size-3 shrink-0" aria-hidden="true" />}
                                                <span className="truncate">
                                                    {shortDate(mov.date)} · {t(mov.source)}
                                                    {mov.description ? ` · ${mov.description}` : ''}
                                                </span>
                                            </p>
                                        </div>
                                        <Money
                                            value={mov.amount}
                                            sign={isDeposit ? '+' : '−'}
                                            className={cn('shrink-0 text-lg', isDeposit ? 'text-masuk' : 'text-keluar')}
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

Tabungan.layout = {
    breadcrumbs: [{ title: t('Tabungan'), href: '/tabungan' }],
};
