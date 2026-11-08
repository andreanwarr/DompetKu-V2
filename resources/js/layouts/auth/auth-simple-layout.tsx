import { Link } from '@inertiajs/react';
import { Logo } from '@/components/brand/logo';
import { t } from '@/lib/i18n';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="bg-background grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
            <aside className="bg-papan text-papan-ink flex flex-col px-5 py-4 sm:px-10 lg:sticky lg:top-0 lg:h-dvh lg:justify-between lg:p-12 xl:p-16">
                <Link
                    href={home()}
                    aria-label={t('DompetKu, ke beranda')}
                    className="flex min-h-11 w-fit items-center rounded-xl"
                >
                    <Logo onPapan />
                </Link>
                <p className="font-display hidden max-w-[11ch] text-[clamp(2.75rem,4.5vw,4.25rem)] leading-[1.02] font-bold tracking-[-0.045em] lg:block">
                    {t('Uang lo, kebaca sekali lirik.')}
                </p>
                <p className="text-papan-soft hidden max-w-sm text-sm leading-relaxed lg:block">
                    {t('Catat dari HP, saldo kehitung sendiri, laporan siap kapan aja.')}
                </p>
            </aside>
            <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-12">
                <main
                    id="main-content"
                    className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center lg:py-10"
                >
                    <div className="mb-8">
                        <h1 className="page-title">{title}</h1>
                        {description && (
                            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                                {description}
                            </p>
                        )}
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
}
