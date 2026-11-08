import { Form, Head, usePage } from '@inertiajs/react';
import { Field } from '@/components/finance/kit';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */
import { store } from '@/routes/login';
import { request } from '@/routes/password';
/* @chisel-passkeys */
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const { canRegister } = usePage().props;

    return (
        <>
            <Head title={t('Masuk')} />

            {status && (
                <p
                    role="status"
                    className="bg-masuk-wash text-masuk mb-6 rounded-xl px-4 py-3 text-sm font-medium"
                >
                    {status}
                </p>
            )}

            {/* @chisel-passkeys */}
            <PasskeyVerify />
            {/* @end-chisel-passkeys */}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
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
                                    className="field"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@contoh.com"
                                    aria-invalid={!!errors.email}
                                />
                            </Field>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium"
                                    >
                                        {t('Password')}
                                    </label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-sm"
                                            tabIndex={5}
                                        >
                                            {t('Lupa password?')}
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.password}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <label
                                htmlFor="remember"
                                className="flex min-h-11 w-fit items-center gap-3 text-sm font-medium"
                            >
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                {t('Ingat gua di perangkat ini')}
                            </label>

                            <button
                                type="submit"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                                className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base disabled:opacity-45"
                            >
                                {processing && <Spinner />}
                                {t('Masuk')}
                            </button>
                        </div>

                        {/* @chisel-registration */}
                        {canRegister && (
                            <p className="text-muted-foreground text-center text-sm">
                                {t('Belum punya akun?')}{' '}
                                <TextLink href={register()} tabIndex={5}>
                                    {t('Daftar')}
                                </TextLink>
                            </p>
                        )}
                        {/* @end-chisel-registration */}
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: t('Masuk ke DompetKu'),
    description: t('Masukin email dan password lo'),
};
