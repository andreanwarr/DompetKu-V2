import { Form, Head } from '@inertiajs/react';
import { Field } from '@/components/finance/kit';
import PasswordInput from '@/components/password-input';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title={t('Reset password')} />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
            >
                {({ processing, errors }) => (
                    <div className="flex flex-col gap-5">
                        <Field
                            label={t('Email')}
                            htmlFor="email"
                            error={errors.email}
                        >
                            <input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                className="field bg-sunken text-muted-foreground"
                                readOnly
                            />
                        </Field>

                        <Field
                            label={t('Password baru')}
                            htmlFor="password"
                            error={errors.password}
                        >
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                autoFocus
                                passwordrules={passwordRules}
                                aria-invalid={!!errors.password}
                            />
                        </Field>

                        <Field
                            label={t('Ulangi password baru')}
                            htmlFor="password_confirmation"
                            error={errors.password_confirmation}
                        >
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                autoComplete="new-password"
                                passwordrules={passwordRules}
                                aria-invalid={!!errors.password_confirmation}
                            />
                        </Field>

                        <button
                            type="submit"
                            disabled={processing}
                            data-test="reset-password-button"
                            className="btn-kuning mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base disabled:opacity-45"
                        >
                            {processing && <Spinner />}
                            {t('Simpan password baru')}
                        </button>
                    </div>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: t('Bikin password baru'),
    description: t('Ketik password baru lo di bawah'),
};
