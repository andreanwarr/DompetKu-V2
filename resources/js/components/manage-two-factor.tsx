import { Form } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Heading from '@/components/heading';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    return (
        <section className="plank flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <Heading
                    variant="small"
                    title={t('Verifikasi 2 langkah')}
                    description={t('Lapisan aman tambahan tiap lo login')}
                />
                <span
                    className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                        twoFactorEnabled
                            ? 'bg-masuk-wash text-masuk'
                            : 'bg-sunken text-muted-foreground',
                    )}
                >
                    {twoFactorEnabled ? t('Aktif') : t('Belum aktif')}
                </span>
            </div>

            {twoFactorEnabled ? (
                <div className="flex flex-col items-start gap-4">
                    <p className="text-muted-foreground text-sm">
                        {t(
                            'Tiap login, lo bakal diminta kode acak dari aplikasi autentikator (TOTP) di HP lo.',
                        )}
                    </p>

                    <Form {...disable.form()}>
                        {({ processing }) => (
                            <button
                                type="submit"
                                disabled={processing}
                                className="border-keluar/40 text-keluar hover:bg-keluar-wash inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors duration-150 disabled:opacity-45"
                            >
                                {t('Matikan 2FA')}
                            </button>
                        )}
                    </Form>

                    <TwoFactorRecoveryCodes
                        recoveryCodesList={recoveryCodesList}
                        fetchRecoveryCodes={fetchRecoveryCodes}
                        errors={errors}
                    />
                </div>
            ) : (
                <div className="flex flex-col items-start gap-4">
                    <p className="text-muted-foreground text-sm">
                        {t(
                            'Kalau 2FA aktif, tiap login lo diminta kode aman dari aplikasi autentikator (TOTP) di HP.',
                        )}
                    </p>

                    {hasSetupData ? (
                        <button
                            type="button"
                            onClick={() => setShowSetupModal(true)}
                            className="btn-kuning inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm"
                        >
                            <ShieldCheck className="size-4" aria-hidden="true" />
                            {t('Lanjut setup')}
                        </button>
                    ) : (
                        <Form
                            {...enable.form()}
                            onSuccess={() => setShowSetupModal(true)}
                        >
                            {({ processing }) => (
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="btn-kuning inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm disabled:opacity-45"
                                >
                                    <ShieldCheck
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    {t('Aktifkan 2FA')}
                                </button>
                            )}
                        </Form>
                    )}
                </div>
            )}

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </section>
    );
}
