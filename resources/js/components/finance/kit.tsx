import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import type { ReactNode } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/** Page shell: consistent gutters, max width, room for the bottom nav on phones. */
export function Page({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <main
            id="main-content"
            className={cn(
                'mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-3.5 pt-[calc(1rem+env(safe-area-inset-top))] pb-32 sm:px-6 lg:gap-7 lg:px-8 lg:pt-8 lg:pb-12',
                className,
            )}
        >
            {children}
        </main>
    );
}

export function PageHeader({
    title,
    description,
    actions,
    children,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                    <h1 className="page-title">{title}</h1>
                    {description && (
                        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
            {children}
        </header>
    );
}

export function Section({
    title,
    action,
    children,
    className,
}: {
    title?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('flex min-w-0 flex-col gap-3', className)}>
            {(title || action) && (
                <div className="flex min-h-9 items-center justify-between gap-3">
                    {title && (
                        <h2 className="font-display text-xl leading-none font-bold">
                            {title}
                        </h2>
                    )}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export function EmptyState({
    icon: Icon,
    title,
    text,
    action,
    className,
}: {
    icon?: LucideIcon;
    title: string;
    text?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'border-border flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed px-6 py-10 text-center',
                className,
            )}
        >
            {Icon && (
                <span className="bg-sunken text-muted-foreground grid size-12 place-items-center rounded-2xl">
                    <Icon className="size-5" aria-hidden="true" />
                </span>
            )}
            <div>
                <p className="font-semibold">{title}</p>
                {text && (
                    <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-sm">
                        {text}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

export function Field({
    label,
    error,
    hint,
    htmlFor,
    children,
    className,
}: {
    label: string;
    error?: string;
    hint?: string;
    htmlFor?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <label htmlFor={htmlFor} className="text-sm font-medium">
                {label}
            </label>
            {children}
            {hint && !error && (
                <p className="text-muted-foreground text-xs">{hint}</p>
            )}
            {error && (
                <p role="alert" className="text-keluar text-xs font-medium">
                    {error}
                </p>
            )}
        </div>
    );
}

/** Pill segmented control (a radio group). */
export function Segmented<T extends string>({
    value,
    onChange,
    options,
    label,
    className,
    size = 'md',
}: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
    label: string;
    className?: string;
    size?: 'sm' | 'md';
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={cn(
                'bg-sunken grid auto-cols-fr grid-flow-col gap-1 rounded-full p-1',
                className,
            )}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'rounded-full px-3 font-semibold transition-colors',
                        size === 'md' ? 'min-h-10 text-sm' : 'min-h-8 text-xs',
                        value === option.value
                            ? 'bg-card text-foreground shadow-[0_1px_2px_#0b0c0f1f]'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

/** Bottom sheet on phones, right-hand panel on larger screens. */
export function Panel({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className,
    initialFocus,
}: {
    initialFocus?: React.RefObject<HTMLElement | null>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
}) {
    const mobile = useIsMobile();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={mobile ? 'bottom' : 'right'}
                onOpenAutoFocus={(event) => {
                    if (!initialFocus?.current) return;
                    event.preventDefault();
                    initialFocus.current.focus();
                }}
                className={cn(
                    'bg-background gap-0 p-0',
                    mobile
                        ? 'max-h-[92dvh] rounded-t-[1.5rem]'
                        : 'w-full sm:max-w-[440px]',
                    className,
                )}
            >
                {mobile && (
                    <span
                        aria-hidden="true"
                        className="bg-border mx-auto mt-2.5 h-1.5 w-10 rounded-full"
                    />
                )}
                <SheetHeader className="px-5 pt-4 pb-3 pr-14 text-left sm:px-6 sm:pt-6">
                    <SheetTitle>{title}</SheetTitle>
                    {description && (
                        <SheetDescription>{description}</SheetDescription>
                    )}
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
                    {children}
                </div>
                {footer && (
                    <div className="border-border bg-background safe-bottom border-t px-5 pt-3 pb-3 sm:px-6 sm:pb-6">
                        {footer}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
