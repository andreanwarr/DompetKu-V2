import { Form } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import { t } from '@/lib/i18n';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

const secondaryButton =
    'border-border bg-card hover:bg-sunken inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors duration-150 disabled:opacity-45';

export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            void fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const RecoveryCodeIconComponent = codesAreVisible ? EyeOff : Eye;

    return (
        <div className="bg-sunken flex w-full flex-col gap-4 rounded-xl p-4">
            <div>
                <p className="flex items-center gap-2 font-semibold">
                    <LockKeyhole className="size-4" aria-hidden="true" />
                    {t('Kode pemulihan 2FA')}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                    {t(
                        'Kode ini buat masuk lagi kalau HP autentikator lo hilang. Simpan di password manager yang aman.',
                    )}
                </p>
            </div>

            <div className="flex flex-col gap-2 select-none sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={toggleCodesVisibility}
                    className={secondaryButton}
                    aria-expanded={codesAreVisible}
                    aria-controls="recovery-codes-section"
                >
                    <RecoveryCodeIconComponent
                        className="size-4"
                        aria-hidden="true"
                    />
                    {codesAreVisible
                        ? t('Sembunyikan kode')
                        : t('Lihat kode pemulihan')}
                </button>

                {canRegenerateCodes && (
                    <Form
                        {...regenerateRecoveryCodes.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={fetchRecoveryCodes}
                    >
                        {({ processing }) => (
                            <button
                                type="submit"
                                disabled={processing}
                                aria-describedby="regenerate-warning"
                                className={secondaryButton}
                            >
                                <RefreshCw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                {t('Bikin kode baru')}
                            </button>
                        )}
                    </Form>
                )}
            </div>

            <div
                id="recovery-codes-section"
                className={`relative overflow-hidden transition-opacity duration-200 ${codesAreVisible ? 'h-auto opacity-100' : 'h-0 opacity-0'}`}
                aria-hidden={!codesAreVisible}
            >
                <div className="space-y-3">
                    {errors?.length ? (
                        <AlertError errors={errors} />
                    ) : (
                        <>
                            <div
                                ref={codesSectionRef}
                                className="bg-card border-border grid gap-1 rounded-lg border p-4 font-mono text-sm sm:grid-cols-2"
                                role="list"
                                aria-label={t('Kode pemulihan')}
                            >
                                {recoveryCodesList.length ? (
                                    recoveryCodesList.map((code, index) => (
                                        <div
                                            key={index}
                                            role="listitem"
                                            className="select-text"
                                        >
                                            {code}
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        className="space-y-2"
                                        aria-label={t('Memuat kode pemulihan')}
                                    >
                                        {Array.from({ length: 8 }, (_, index) => (
                                            <div
                                                key={index}
                                                className="bg-muted-foreground/20 h-4 animate-pulse rounded"
                                                aria-hidden="true"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p
                                id="regenerate-warning"
                                className="text-muted-foreground text-xs select-none"
                            >
                                {t(
                                    'Tiap kode cuma bisa dipakai sekali, lalu hangus. Butuh lagi? Klik "Bikin kode baru" di atas.',
                                )}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
