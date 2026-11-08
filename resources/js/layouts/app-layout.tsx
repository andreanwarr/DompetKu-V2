import { usePage } from '@inertiajs/react';
import { useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { QuickEntryProvider } from '@/components/quick-entry';
import { AppShell } from '@/components/shell/app-shell';
import { t } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: ReactNode;
}) {
    const { errors } = usePage().props as { errors?: Record<string, string> };
    const blocked = errors?.transaction;

    // errors that belong to no form field (e.g. delete refused) surface as a toast
    useEffect(() => {
        if (blocked) toast.error(t(blocked));
    }, [blocked]);

    return (
        <QuickEntryProvider>
            <AppShell>{children}</AppShell>
        </QuickEntryProvider>
    );
}
