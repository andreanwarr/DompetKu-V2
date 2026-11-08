import { Link } from '@inertiajs/react';
import { Palette, ShieldCheck, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Page, PageHeader } from '@/components/finance/kit';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const items = [
        { title: t('Profil'), href: edit(), icon: UserRound },
        { title: t('Keamanan'), href: editSecurity(), icon: ShieldCheck },
        { title: t('Tampilan'), href: editAppearance(), icon: Palette },
    ];

    return (
        <Page>
            <PageHeader
                title={t('Pengaturan')}
                description={t('Kelola profil dan pengaturan akun lo')}
            />
            <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
                <nav
                    aria-label={t('Pengaturan')}
                    className="scroll-x -mx-4 gap-2 px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-9 lg:col-span-3 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
                >
                    {items.map((item) => {
                        const active = isCurrentOrParentUrl(item.href);
                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                prefetch
                                aria-current={active ? 'page' : undefined}
                                data-active={active}
                                className={cn(
                                    'chip min-h-11 shrink-0 lg:w-full lg:justify-start lg:px-4 lg:text-sm',
                                    !active && 'lg:border-transparent lg:bg-transparent',
                                )}
                            >
                                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
                <div className="flex max-w-3xl min-w-0 flex-col gap-6 lg:col-span-9">
                    {children}
                </div>
            </div>
        </Page>
    );
}
