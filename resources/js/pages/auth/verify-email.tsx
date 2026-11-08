// Components
import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title={t('Verifikasi email')} />

            {status === 'verification-link-sent' && (
                <p
                    role="status"
                    className="bg-masuk-wash text-masuk mb-6 rounded-xl px-4 py-3 text-sm font-medium"
                >
                    {t('Link verifikasi baru udah dikirim ke email yang lo daftarin.')}
                </p>
            )}

            <Form {...send.form()} className="flex flex-col gap-5 text-center">
                {({ processing }) => (
                    <>
                        <button
                            type="submit"
                            disabled={processing}
                            className="btn-kuning inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base disabled:opacity-45"
                        >
                            {processing && <Spinner />}
                            {t('Kirim ulang email verifikasi')}
                        </button>

                        <TextLink
                            href={logout()}
                            className="mx-auto inline-flex min-h-11 items-center text-sm"
                        >
                            {t('Keluar')}
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: t('Cek email lo'),
    description: t(
        'Klik link verifikasi yang barusan kita kirim ke email lo buat lanjut.',
    ),
};
