import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import { Field } from '@/components/finance/kit';
import Heading from '@/components/heading';
import PasswordInput from '@/components/password-input';
import { t } from '@/lib/i18n';
import { edit } from '@/routes/security';
/* @chisel-passkeys */
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
/* @end-chisel-passkeys */
/* @chisel-2fa */
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
/* @end-chisel-2fa */

// oxfmt-ignore
type Props = {
    passwordRules: string;
} /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
    ManageTwoFactorProps /* @end-chisel-2fa */;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title={t('Pengaturan keamanan')} />

            <section className="plank flex flex-col gap-5 p-5 sm:p-6">
                <Heading
                    variant="small"
                    title={t('Ganti password')}
                    description={t(
                        'Pakai password yang panjang dan acak biar akun lo aman',
                    )}
                />

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <Field
                                label={t('Password sekarang')}
                                htmlFor="current_password"
                                error={errors.current_password}
                            >
                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.current_password}
                                />
                            </Field>

                            <Field
                                label={t('Password baru')}
                                htmlFor="password"
                                error={errors.password}
                            >
                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    autoComplete="new-password"
                                    passwordrules={props.passwordRules}
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
                                    passwordrules={props.passwordRules}
                                    aria-invalid={!!errors.password_confirmation}
                                />
                            </Field>

                            <div>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-password-button"
                                    className="btn-kuning inline-flex min-h-12 w-full items-center justify-center rounded-xl px-6 text-sm disabled:opacity-45 sm:w-auto"
                                >
                                    {processing ? t('Menyimpan…') : t('Simpan password')}
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            </section>

            {/* @chisel-2fa */}
            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />
            {/* @end-chisel-2fa */}

            {/* @chisel-passkeys */}
            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
            {/* @end-chisel-passkeys */}
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: t('Pengaturan keamanan'),
            href: edit(),
        },
    ],
};
