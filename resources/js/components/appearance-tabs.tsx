import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: t('Terang') },
        { value: 'dark', icon: Moon, label: t('Gelap') },
        { value: 'system', icon: Monitor, label: t('Sistem') },
    ];

    return (
        <div
            className={cn('grid w-full grid-cols-3 gap-2', className)}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => updateAppearance(value)}
                    aria-pressed={appearance === value}
                    className={cn(
                        'flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors duration-150',
                        appearance === value
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                >
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                </button>
            ))}
        </div>
    );
}
