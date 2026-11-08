import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowRight,
    BookCheck,
    FileSpreadsheet,
    Fuel,
    Smartphone,
    Utensils,
} from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Money } from '@/components/finance/money';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';

// Illustrative numbers only; the preview is labelled "Contoh tampilan".
const sampleRows = [
    { icon: ArrowDownLeft, title: 'Gaji', meta: 'Hari ini · Pemasukan', amount: 8_500_000, sign: '+' as const },
    { icon: Utensils, title: 'Makan siang', meta: 'Hari ini · Makan', amount: 35_000, sign: '−' as const },
    { icon: Fuel, title: 'Bensin', meta: 'Kemarin · Transport', amount: 50_000, sign: '−' as const },
];
const sampleCategories = [
    { name: 'Makan', total: 1_250_000, color: 'var(--chart-1)' },
    { name: 'Tagihan', total: 980_000, color: 'var(--chart-4)' },
    { name: 'Transport', total: 640_000, color: 'var(--chart-2)' },
];
const sampleMax = Math.max(...sampleCategories.map((c) => c.total));

function ProductPreview() {
    return (
        <figure
            aria-label={t('Contoh tampilan DompetKu dengan angka ilustrasi')}
            className="bg-background text-foreground flex flex-col gap-3 rounded-[1.5rem] p-3 sm:p-4"
        >
            <figcaption className="text-muted-foreground px-1 text-right text-xs">
                {t('angka ilustrasi')}
            </figcaption>

            <div className="plank-papan flex flex-col gap-4 p-4 sm:p-5">
                <div>
                    <p className="label-caps">{t('Bulan ini')}</p>
                    <Money
                        value={5_285_000}
                        className="mt-2 block text-[clamp(2.5rem,11vw,3.5rem)]"
                    />
                </div>
                <dl className="grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
                    <div>
                        <dt className="label-caps">{t('Masuk')}</dt>
                        <dd className="mt-1">
                            <Money value={8_500_000} sign="+" className="text-xl" />
                        </dd>
                    </div>
                    <div>
                        <dt className="label-caps">{t('Keluar')}</dt>
                        <dd className="mt-1">
                            <Money value={3_215_000} sign="−" className="text-xl" />
                        </dd>
                    </div>
                </dl>
            </div>

            <ul className="plank divide-border divide-y overflow-hidden">
                {sampleRows.map((row) => (
                    <li key={row.title} className="flex min-h-14 items-center gap-3 px-3 py-2.5">
                        <span className="bg-sunken text-muted-foreground grid size-9 shrink-0 place-items-center rounded-xl">
                            <row.icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                                {t(row.title)}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                                {t(row.meta)}
                            </span>
                        </span>
                        <Money
                            value={row.amount}
                            sign={row.sign}
                            className={cn(
                                'text-base',
                                row.sign === '+' ? 'text-masuk' : 'text-keluar',
                            )}
                        />
                    </li>
                ))}
            </ul>

            <ul className="plank flex flex-col gap-3 p-3">
                {sampleCategories.map((cat) => (
                    <li key={cat.name} className="flex flex-col gap-1.5">
                        <span className="flex items-baseline gap-3">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {t(cat.name)}
                            </span>
                            <Money value={cat.total} className="text-base" />
                        </span>
                        <span className="bg-sunken block h-2 overflow-hidden rounded-full">
                            <span
                                className="block h-full rounded-full"
                                style={{
                                    width: `${(cat.total / sampleMax) * 100}%`,
                                    background: cat.color,
                                }}
                            />
                        </span>
                    </li>
                ))}
            </ul>
        </figure>
    );
}

export default function Welcome() {
    const { auth, canRegister } = usePage().props;

    const benefits = [
        {
            icon: Smartphone,
            title: t('Catat cepat dari HP'),
            text: t(
                'Ketik nominal, pilih kategori, beres. Pemasukan, pengeluaran, atau pindah saldo antar dompet.',
            ),
        },
        {
            icon: BookCheck,
            title: t('Saldo ngitung sendiri'),
            text: t(
                'Tiap transaksi dibukukan berpasangan (double-entry), jadi saldo tiap dompet dan rekening selalu cocok.',
            ),
        },
        {
            icon: FileSpreadsheet,
            title: t('Laporan yang jujur'),
            text: t(
                'Gaji dan bonus dipisah, kasbon dan pinjaman nggak nyampur ke pengeluaran. Export ke Excel kapan aja.',
            ),
        },
    ];

    return (
        <>
            <Head title="DompetKu" />
            <div className="bg-background text-foreground flex min-h-dvh flex-col">
                <section className="bg-papan text-papan-ink">
                    <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-10">
                        <header className="flex min-h-18 items-center justify-between gap-3 py-3">
                            <Link
                                href="/"
                                aria-label="DompetKu"
                                className="flex min-h-11 items-center rounded-xl"
                            >
                                <Logo onPapan />
                            </Link>
                            <nav aria-label={t('Navigasi utama')}>
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold underline-offset-4 hover:underline"
                                    >
                                        {t('Buka DompetKu')}
                                    </Link>
                                ) : (
                                    <Link
                                        href={login()}
                                        className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold underline-offset-4 hover:underline"
                                    >
                                        {t('Masuk')}
                                    </Link>
                                )}
                            </nav>
                        </header>

                        <div className="grid items-center gap-10 pt-8 pb-12 lg:grid-cols-12 lg:gap-12 lg:pt-14 lg:pb-20">
                            <div className="lg:col-span-7">
                                <h1 className="font-display max-w-[12ch] text-[clamp(2.75rem,8vw,5rem)] leading-[1.02] font-bold tracking-[-0.045em]">
                                    {t('Uang lo, kebaca sekali lirik.')}
                                </h1>
                                <p className="text-papan-soft mt-6 max-w-md text-base leading-relaxed sm:text-lg">
                                    {t(
                                        'Catatan keuangan pribadi yang ngitung saldonya sendiri. Catat dari HP, lihat ke mana uang lo pergi.',
                                    )}
                                </p>
                                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                    {auth.user ? (
                                        <Link
                                            href={dashboard()}
                                            className="btn-kuning inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base"
                                        >
                                            {t('Buka DompetKu')}
                                            <ArrowRight className="size-4" aria-hidden="true" />
                                        </Link>
                                    ) : (
                                        <>
                                            {canRegister && (
                                                <Link
                                                    href={register()}
                                                    className="btn-kuning inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base"
                                                >
                                                    {t('Mulai sekarang')}
                                                    <ArrowRight className="size-4" aria-hidden="true" />
                                                </Link>
                                            )}
                                            <Link
                                                href={login()}
                                                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-6 text-base font-semibold transition-colors duration-150 hover:bg-white/10"
                                            >
                                                {t('Masuk')}
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
                                <ProductPreview />
                            </div>
                        </div>
                    </div>
                </section>

                <main
                    id="main-content"
                    className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-12 sm:px-6 lg:px-10 lg:py-20"
                >
                    {/* what the app does, set like the price list on a warung board */}
                    <ul className="divide-border border-border divide-y border-y">
                        {benefits.map((benefit) => (
                            <li key={benefit.title} className="grid gap-2 py-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-baseline md:gap-10 md:py-8">
                                <h2 className="font-display text-3xl leading-none font-bold md:text-[2.75rem]">
                                    {benefit.title}
                                </h2>
                                <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
                                    {benefit.text}
                                </p>
                            </li>
                        ))}
                    </ul>
                </main>

                <footer className="border-border text-muted-foreground mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-2 border-t px-5 py-6 text-xs sm:px-6 lg:px-10">
                    <span>DompetKu</span>
                    <span>{t('Keuangan pribadi, lebih tertata.')}</span>
                </footer>
            </div>
        </>
    );
}
