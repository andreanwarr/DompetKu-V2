import { Form, Head } from '@inertiajs/react';
import { Field } from '@/components/finance/kit';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title={t('Daftar')} />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="flex flex-col gap-5">
                            <Field
                                label={t('Nama')}
                                htmlFor="name"
                                error={errors.name}
                            >
                                <input
                                    id="name"
                                    type="text"
                                    className="field"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder={t('Nama lengkap')}
                                    aria-invalid={!!errors.name}
                                />
                            </Field>

                            <Field
                                label={t('Email')}
                                htmlFor="email"
                                error={errors.email}
                            >
                                <input
                                    id="email"
                                    type="email"
                                    className="field"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@contoh.com"
                                    aria-invalid={!!errors.email}
                                />
                            </Field>

                            <Field
                                label={t('Password')}
                                htmlFor="password"
                                error={errors.password}
                            >
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    passwordrules={passwordRules}
                                    aria-invalid={!!errors.password}
                                />
                            </Field>

                            <Field
                                label={t('Ulangi password')}
                                htmlFor="password_confirmation"
                                error={errors.password_confirmation}
                            >
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    passwordrules={passwordRules}
                                    aria-invalid={!!errors.password_confirmation}
                                />
                            </Field>

                            <button
                                type="submit"
                                tabIndex={5}
                                disabled={processing}
                                data-test="register-user-button"
                                className="btn-kuning mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base disabled:opacity-45"
                            >
                                {processing && <Spinner />}
                                {t('Bikin akun')}
                            </button>
                        </div>

                        <p className="text-muted-foreground text-center text-sm">
                            {t('Udah punya akun?')}{' '}
                            <TextLink href={login()} tabIndex={6}>
                                {t('Masuk')}
                            </TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: t('Bikin akun DompetKu'),
    description: t('Gratis. Isi data di bawah, langsung bisa nyatet.'),
};
