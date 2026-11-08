// Components
import { Form, Head } from '@inertiajs/react';
import { Field } from '@/components/finance/kit';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title={t('Lupa password')} />

            {status && (
                <p
                    role="status"
                    className="bg-masuk-wash text-masuk mb-6 rounded-xl px-4 py-3 text-sm font-medium"
                >
                    {status}
                </p>
            )}

            <div className="flex flex-col gap-6">
                <Form {...email.form()} className="flex flex-col gap-5">
                    {({ processing, errors }) => (
                        <>
                            <Field
                                label={t('Email')}
                                htmlFor="email"
                                error={errors.email}
                            >
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    className="field"
                                    autoComplete="off"
                                    autoFocus
                                    placeholder="email@contoh.com"
                                    aria-invalid={!!errors.email}
                                />
                            </Field>

                            <button
                                type="submit"
                                disabled={processing}
                                data-test="email-password-reset-link-button"
                                className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base disabled:opacity-45"
                            >
                                {processing && <Spinner />}
                                {t('Kirim link reset password')}
                            </button>
                        </>
                    )}
                </Form>

                <p className="text-muted-foreground text-center text-sm">
                    {t('Inget lagi?')}{' '}
                    <TextLink href={login()}>{t('Balik ke halaman masuk')}</TextLink>
                </p>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: t('Lupa password'),
    description: t('Masukin email lo, kita kirim link buat bikin password baru'),
};
