import { Form, Head } from '@inertiajs/react';
import { Field } from '@/components/finance/kit';
import PasswordInput from '@/components/password-input';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';
import { store } from '@/routes/password/confirm';
/* @chisel-passkeys */
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

export default function ConfirmPassword() {
    return (
        <>
            <Head title={t('Konfirmasi password')} />

            {/* @chisel-passkeys */}
            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label={t('Konfirmasi pakai passkey')}
                loadingLabel={t('Lagi ngecek…')}
                separator={t('Atau pakai password')}
            />
            {/* @end-chisel-passkeys */}

            <Form {...store.form()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="flex flex-col gap-5">
                        <Field
                            label={t('Password')}
                            htmlFor="password"
                            error={errors.password}
                        >
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                autoFocus
                                aria-invalid={!!errors.password}
                            />
                        </Field>

                        <button
                            type="submit"
                            disabled={processing}
                            data-test="confirm-password-button"
                            className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base disabled:opacity-45"
                        >
                            {processing && <Spinner />}
                            {t('Konfirmasi password')}
                        </button>
                    </div>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: t('Konfirmasi password'),
    description: t(
        'Ini area sensitif. Masukin password lo dulu sebelum lanjut.',
    ),
};
