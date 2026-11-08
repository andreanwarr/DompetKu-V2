import { Form, Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
/* @chisel-email-verification */
import { Link } from '@inertiajs/react';
/* @end-chisel-email-verification */
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { Field } from '@/components/finance/kit';
import Heading from '@/components/heading';
import { UserAvatar } from '@/components/user-avatar';
import { t } from '@/lib/i18n';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
/* @chisel-email-verification */
import { send } from '@/routes/verification';
/* @end-chisel-email-verification */

type PageProps = {
    auth: Auth;
};

export default function Profile(
    /* @chisel-email-verification */
    {
        mustVerifyEmail,
        status,
    }: {
        mustVerifyEmail: boolean;
        status?: string;
    },
    /* @end-chisel-email-verification */
) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title={t('Pengaturan profil')} />

            <section className="plank flex flex-col gap-5 p-5 sm:p-6">
                <Heading
                    variant="small"
                    title={t('Profil')}
                    description={t('Ganti nama dan email akun lo')}
                />

                <AvatarPicker />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="flex flex-col gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <Field label={t('Nama')} htmlFor="name" error={errors.name}>
                                <input
                                    id="name"
                                    className="field"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder={t('Nama lengkap')}
                                    aria-invalid={!!errors.name}
                                />
                            </Field>

                            <Field label={t('Email')} htmlFor="email" error={errors.email}>
                                <input
                                    id="email"
                                    type="email"
                                    className="field"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="email@contoh.com"
                                    aria-invalid={!!errors.email}
                                />
                            </Field>

                            {/* @chisel-email-verification */}
                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div className="bg-sunken rounded-xl p-4 text-sm">
                                        <p className="text-muted-foreground">
                                            {t('Email lo belum diverifikasi.')}{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground font-semibold underline-offset-4 hover:underline"
                                            >
                                                {t('Kirim ulang link verifikasi')}
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <p className="text-masuk mt-2 font-medium">
                                                {t('Link verifikasi baru udah dikirim ke email lo.')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            {/* @end-chisel-email-verification */}

                            <div>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-profile-button"
                                    className="btn-kuning inline-flex min-h-12 w-full items-center justify-center rounded-xl px-6 text-sm disabled:opacity-45 sm:w-auto"
                                >
                                    {processing ? t('Menyimpan…') : t('Simpan')}
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            </section>

            <DeleteUser />
        </>
    );
}

/** Center-crop to a 512px square JPEG in the browser: phone photos are often over PHP's 2 MB upload cap. */
async function squareJpeg(file: File, size = 512): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(size, side);
    canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('encode failed');
    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}

function AvatarPicker() {
    const { auth } = usePage<PageProps>().props;
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    const upload = async (file: File | undefined) => {
        if (!file) return;
        setError(undefined);
        setBusy(true);
        const avatar = await squareJpeg(file).catch(() => null);
        if (!avatar) {
            setBusy(false);
            setError(t('Gambar nggak kebaca. Coba foto lain.'));
            return;
        }
        router.post('/settings/avatar', { avatar }, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setBusy(true),
            onError: (errors) => setError(errors.avatar),
            onFinish: () => {
                setBusy(false);
                if (input.current) input.current.value = '';
            },
        });
    };

    return (
        <div className="flex items-center gap-4">
            <UserAvatar user={auth.user} className={'bg-foreground text-background size-20 text-2xl' + (busy ? ' opacity-50' : '')} />
            <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-kuning inline-flex min-h-11 items-center rounded-xl px-4 text-sm disabled:opacity-45">
                        {busy ? t('Mengunggah…') : auth.user.avatar ? t('Ganti foto') : t('Upload foto')}
                    </button>
                    {auth.user.avatar && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => router.delete('/settings/avatar', { preserveScroll: true })}
                            className="bg-sunken inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold disabled:opacity-45"
                        >
                            {t('Hapus foto')}
                        </button>
                    )}
                </div>
                <p className="text-muted-foreground text-xs">{t('JPG, PNG, atau WebP. Otomatis dipotong persegi.')}</p>
                {error && <p className="text-keluar text-xs font-medium">{error}</p>}
            </div>
            <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label={t('Upload foto')} onChange={(e) => upload(e.target.files?.[0])} />
        </div>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: t('Pengaturan profil'),
            href: edit(),
        },
    ],
};
