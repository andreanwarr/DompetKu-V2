import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { KeyRound } from 'lucide-react';
import InputError from '@/components/input-error';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    loadingLabel?: string;
    separator?: string;
};

export default function PasskeyVerify({
    routes,
    label,
    loadingLabel,
    separator,
}: Props = {}) {
    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? '/dashboard');
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <div className="grid gap-2">
                <button
                    type="button"
                    onClick={verify}
                    disabled={isLoading}
                    className="border-input bg-card hover:bg-sunken inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors duration-150 disabled:opacity-45"
                >
                    {isLoading ? (
                        <Spinner />
                    ) : (
                        <KeyRound className="size-4" aria-hidden="true" />
                    )}
                    {isLoading
                        ? (loadingLabel ?? t('Lagi ngecek…'))
                        : (label ?? t('Masuk pakai passkey'))}
                </button>
                {error && (
                    <InputError message={error} className="text-center" />
                )}
            </div>

            <div className="my-6 flex items-center gap-3">
                <span className="bg-border h-px flex-1" aria-hidden="true" />
                <span className="label-caps">
                    {separator ?? t('Atau pakai email')}
                </span>
                <span className="bg-border h-px flex-1" aria-hidden="true" />
            </div>
        </>
    );
}
