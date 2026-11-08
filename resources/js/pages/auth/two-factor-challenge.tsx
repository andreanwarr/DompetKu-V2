import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { t } from '@/lib/i18n';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const authConfigContent = useMemo<{
        title: string;
        description: string;
        toggleText: string;
    }>(() => {
        if (showRecoveryInput) {
            return {
                title: t('Kode pemulihan'),
                description: t(
                    'Masukin salah satu kode pemulihan darurat lo buat buktiin ini akun lo.',
                ),
                toggleText: t('masuk pakai kode autentikasi'),
            };
        }

        return {
            title: t('Kode autentikasi'),
            description: t(
                'Masukin kode dari aplikasi autentikator di HP lo.',
            ),
            toggleText: t('masuk pakai kode pemulihan'),
        };
    }, [showRecoveryInput]);

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title={t('Verifikasi 2 langkah')} />

            <Form
                {...store.form()}
                className="flex flex-col gap-5"
                resetOnError
                resetOnSuccess={!showRecoveryInput}
            >
                {({ errors, processing, clearErrors }) => (
                    <>
                        {showRecoveryInput ? (
                            <div className="flex flex-col gap-1.5">
                                <label
                                    htmlFor="recovery_code"
                                    className="text-sm font-medium"
                                >
                                    {t('Kode pemulihan')}
                                </label>
                                <input
                                    id="recovery_code"
                                    name="recovery_code"
                                    type="text"
                                    className="field font-mono"
                                    autoComplete="one-time-code"
                                    autoFocus={showRecoveryInput}
                                    required
                                    aria-invalid={!!errors.recovery_code}
                                />
                                <InputError message={errors.recovery_code} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 text-center">
                                <InputOTP
                                    name="code"
                                    maxLength={OTP_MAX_LENGTH}
                                    value={code}
                                    onChange={(value) => setCode(value)}
                                    disabled={processing}
                                    pattern={REGEXP_ONLY_DIGITS}
                                    aria-label={t('Kode autentikasi')}
                                    autoFocus
                                >
                                    <InputOTPGroup>
                                        {Array.from(
                                            { length: OTP_MAX_LENGTH },
                                            (_, index) => (
                                                <InputOTPSlot
                                                    key={index}
                                                    index={index}
                                                />
                                            ),
                                        )}
                                    </InputOTPGroup>
                                </InputOTP>
                                <InputError message={errors.code} />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="btn-kuning inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-base disabled:opacity-45"
                        >
                            {t('Lanjut')}
                        </button>

                        <p className="text-muted-foreground text-center text-sm">
                            {t('atau')}{' '}
                            <button
                                type="button"
                                className="text-foreground min-h-11 font-semibold underline-offset-4 hover:underline focus-visible:underline"
                                onClick={() => toggleRecoveryMode(clearErrors)}
                            >
                                {authConfigContent.toggleText}
                            </button>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}
