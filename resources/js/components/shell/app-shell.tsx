import { Link, router, usePage } from '@inertiajs/react';
import {
    ChartColumnBig,
    Ellipsis,
    FolderOpen,
    House,
    LogOut,
    Monitor,
    Moon,
    PiggyBank,
    Plus,
    ReceiptText,
    Repeat,
    Settings,
    Sun,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand/logo';
import { Panel } from '@/components/finance/kit';
import { useQuickEntry } from '@/components/quick-entry';
import { UserAvatar } from '@/components/user-avatar';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';

type Item = { title: string; short: string; href: string; icon: LucideIcon };

const nav = (): Item[] => [
    { title: t('Beranda'), short: t('Beranda'), href: '/dashboard', icon: House },
    { title: t('Transaksi'), short: t('Transaksi'), href: '/transactions', icon: ReceiptText },
    { title: t('Tabungan'), short: t('Tabungan'), href: '/tabungan', icon: PiggyBank },
    { title: t('Kasbon & Pinjaman'), short: t('Kasbon'), href: '/kasbon', icon: Repeat },
    { title: t('Laporan'), short: t('Laporan'), href: '/reports', icon: ChartColumnBig },
    { title: t('Sumber dana'), short: t('Dompet'), href: '/fund-sources', icon: Wallet },
    { title: t('Kategori'), short: t('Kategori'), href: '/categories', icon: FolderOpen },
];

export function AppShell({ children }: { children: ReactNode }) {
    const [account, setAccount] = useState(false);

    return (
        <div className="min-h-dvh lg:grid lg:grid-cols-[116px_minmax(0,1fr)]">
            <a
                href="#main-content"
                className="btn-kuning sr-only z-50 rounded-lg px-4 py-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
                {t('Lewati ke konten')}
            </a>
            <Rail onAccount={() => setAccount(true)} />
            <div className="flex min-w-0 flex-col">{children}</div>
            <TabBar onAccount={() => setAccount(true)} />
            <Panel open={account} onOpenChange={setAccount} title={t('Akun & tampilan')}>
                <AccountSheet onNavigate={() => setAccount(false)} />
            </Panel>
        </div>
    );
}

/** Desktop: a floating icon rail with labels, the add button at the foot. */
function Rail({ onAccount }: { onAccount: () => void }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const openEntry = useQuickEntry();
    const { auth } = usePage().props;

    return (
        <aside className="sticky top-0 hidden h-dvh p-5 pr-0 lg:block">
            <div className="plank flex h-full min-h-0 flex-col items-center py-4">
                <Link href="/dashboard" prefetch aria-label="DompetKu" className="mb-3 shrink-0">
                    <LogoMark className="size-11" />
                </Link>
                <nav aria-label={t('Navigasi utama')} className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto [scrollbar-width:none]">
                    {nav().map((item) => {
                        const active = isCurrentOrParentUrl(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch
                                aria-current={active ? 'page' : undefined}
                                title={item.title}
                                className={cn(
                                    'flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl py-2.5 text-[0.68rem] font-semibold transition-colors [@media(max-height:780px)]:py-1.5',
                                    active
                                        ? 'bg-foreground text-background dark:bg-[#22222d] dark:text-foreground'
                                        : 'text-muted-foreground hover:bg-sunken hover:text-foreground',
                                )}
                            >
                                <item.icon className={cn('size-5', active && 'dark:text-kuning')} strokeWidth={2} />
                                {item.short}
                            </Link>
                        );
                    })}
                </nav>
                <div className="flex shrink-0 flex-col items-center gap-2.5 pt-3">
                    <button
                        type="button"
                        onClick={() => openEntry()}
                        aria-label={t('Catat transaksi (N)')}
                        title={t('Catat transaksi (N)')}
                        className="btn-kuning grid size-14 place-items-center rounded-[18px] [@media(max-height:780px)]:size-12 shadow-[0_10px_24px_color-mix(in_srgb,var(--kuning)_40%,transparent)]"
                    >
                        <Plus className="size-6" strokeWidth={2.6} />
                    </button>
                    <button
                        type="button"
                        onClick={onAccount}
                        aria-label={t('Akun & tampilan')}
                        title={auth.user.name}
                        className="rounded-full"
                    >
                        <UserAvatar user={auth.user} className="bg-sunken text-foreground size-11 text-sm" />
                    </button>
                </div>
            </div>
        </aside>
    );
}

/** Phones: a floating tab bar, the add button raised in the middle. */
function TabBar({ onAccount }: { onAccount: () => void }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const openEntry = useQuickEntry();
    const [more, setMore] = useState(false);
    const items = nav();
    const primary = [items[0], items[1]];
    const secondary = [items[4]];
    const extra = [items[2], items[3], items[5], items[6]];
    const moreActive = extra.some((i) => isCurrentOrParentUrl(i.href)) || isCurrentOrParentUrl('/settings');

    const tab = (item: Item) => {
        const active = isCurrentOrParentUrl(item.href);
        return (
            <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? 'page' : undefined}
                className={cn('flex min-h-13 flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-bold', active ? 'text-white' : 'text-[#8d93ab]')}
            >
                <item.icon className={cn('size-[1.3rem]', active && 'text-kuning')} />
                {item.short}
            </Link>
        );
    };

    return (
        <>
            <nav
                aria-label={t('Navigasi utama')}
                className="fixed inset-x-3.5 bottom-[calc(0.875rem+env(safe-area-inset-bottom))] z-40 flex h-[4.25rem] items-center rounded-3xl bg-[#0f1222] px-1.5 shadow-[0_18px_40px_#0f122240] lg:hidden dark:border dark:border-[var(--border)] dark:bg-[#16161ef2] dark:backdrop-blur-lg"
            >
                {primary.map(tab)}
                <button
                    type="button"
                    onClick={() => openEntry()}
                    aria-label={t('Catat transaksi')}
                    className="btn-kuning -mt-7 grid size-14 shrink-0 place-items-center rounded-[19px] shadow-[0_10px_26px_color-mix(in_srgb,var(--kuning)_45%,transparent)]"
                >
                    <Plus className="size-6" strokeWidth={2.6} />
                </button>
                {secondary.map(tab)}
                <button
                    type="button"
                    onClick={() => setMore(true)}
                    aria-expanded={more}
                    className={cn('flex min-h-13 flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-bold', moreActive ? 'text-white' : 'text-[#8d93ab]')}
                >
                    <Ellipsis className={cn('size-[1.3rem]', moreActive && 'text-kuning')} />
                    {t('Lainnya')}
                </button>
            </nav>
            <Panel open={more} onOpenChange={setMore} title={t('Menu')}>
                <div className="grid grid-cols-2 gap-2.5">
                    {extra.map((item) => {
                        const active = isCurrentOrParentUrl(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch
                                onClick={() => setMore(false)}
                                aria-current={active ? 'page' : undefined}
                                className={cn('plank flex min-h-22 flex-col justify-between gap-3 p-4 text-sm font-bold', active && 'ring-kuning ring-2')}
                            >
                                <span className="bg-accent text-accent-foreground grid size-9 place-items-center rounded-xl">
                                    <item.icon className="size-[1.1rem]" />
                                </span>
                                {item.title}
                            </Link>
                        );
                    })}
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setMore(false);
                        onAccount();
                    }}
                    className="plank mt-2.5 flex min-h-14 w-full items-center gap-3 px-4 text-sm font-bold"
                >
                    <Settings className="text-muted-foreground size-5" />
                    {t('Akun & tampilan')}
                </button>
            </Panel>
        </>
    );
}

function AccountSheet({ onNavigate }: { onNavigate: () => void }) {
    const { auth, locale } = usePage().props;
    const { appearance, updateAppearance } = useAppearance();
    const switchLocale = (next: 'id' | 'en') => {
        if (locale === next) return;
        router.patch('/locale', { locale: next }, { preserveScroll: true, onSuccess: () => window.location.reload() });
    };
    const themes: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: t('Terang') },
        { value: 'dark', icon: Moon, label: t('Gelap') },
        { value: 'system', icon: Monitor, label: t('Ikuti sistem') },
    ];
    const option = (active: boolean) =>
        cn(
            'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition-colors',
            active ? 'bg-card text-foreground shadow-[0_1px_3px_#0f12221f] dark:bg-[#2a2a36]' : 'text-muted-foreground hover:text-foreground',
        );

    return (
        <div className="flex flex-col gap-5">
            <div className="plank flex items-center gap-3 p-4">
                <UserAvatar user={auth.user} className="bg-foreground text-background size-12 text-base" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{auth.user.name}</span>
                    <span className="text-muted-foreground block truncate text-sm">{auth.user.email}</span>
                </span>
            </div>
            <div>
                <p className="mb-2 text-sm font-bold">{t('Tema')}</p>
                <div role="radiogroup" aria-label={t('Tema')} className="bg-sunken flex gap-1 rounded-2xl p-1">
                    {themes.map((theme) => (
                        <button key={theme.value} type="button" role="radio" aria-checked={appearance === theme.value} onClick={() => updateAppearance(theme.value)} className={option(appearance === theme.value)}>
                            <theme.icon className="size-4" />
                            {theme.label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <p className="mb-2 text-sm font-bold">{t('Bahasa')}</p>
                <div role="radiogroup" aria-label={t('Bahasa')} className="bg-sunken flex gap-1 rounded-2xl p-1">
                    {(
                        [
                            ['id', 'Indonesia'],
                            ['en', 'English'],
                        ] as const
                    ).map(([value, label]) => (
                        <button key={value} type="button" role="radio" aria-checked={locale === value} onClick={() => switchLocale(value)} className={option(locale === value)}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Link href="/settings/profile" prefetch onClick={onNavigate} className="plank flex min-h-14 items-center gap-3 px-4 text-sm font-bold">
                    <Settings className="text-muted-foreground size-5" /> {t('Pengaturan akun')}
                </Link>
                <Link
                    href={logout()}
                    as="button"
                    onClick={() => router.flushAll()}
                    className="plank text-keluar flex min-h-14 w-full items-center gap-3 px-4 text-sm font-bold"
                >
                    <LogOut className="size-5" /> {t('Keluar akun')}
                </Link>
            </div>
        </div>
    );
}
