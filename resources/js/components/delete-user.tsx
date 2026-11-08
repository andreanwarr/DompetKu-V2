import { Form } from '@inertiajs/react';
import { useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { Field, Panel } from '@/components/finance/kit';
import PasswordInput from '@/components/password-input';
import { t } from '@/lib/i18n';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);

    return (
        <section className="plank border-keluar/40 flex flex-col gap-4 p-5 sm:p-6">
            <div>
                <h2 className="font-display text-keluar text-xl leading-none font-bold">
                    {t('Hapus akun')}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {t(
                        'Akun dan semua catatan keuangan lo bakal dihapus permanen. Nggak bisa dibatalin.',
                    )}
                </p>
            </div>

            <button
                type="button"
                onClick={() => setOpen(true)}
                data-test="delete-user-button"
                className="border-keluar text-keluar hover:bg-keluar-wash inline-flex min-h-11 w-fit items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors duration-150"
            >
                {t('Hapus akun')}
            </button>

            <Panel
                open={open}
                onOpenChange={setOpen}
                title={t('Yakin mau hapus akun?')}
                description={t(
                    'Semua data lo ikut kehapus permanen. Masukin password buat konfirmasi.',
                )}
                initialFocus={passwordInput}
            >
                <Form
                    {...ProfileController.destroy.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    onError={() => passwordInput.current?.focus()}
                    resetOnSuccess
                    className="flex flex-col gap-5 pt-1"
                >
                    {({ resetAndClearErrors, processing, errors }) => (
                        <>
                            <Field
                                label={t('Password')}
                                htmlFor="password"
                                error={errors.password}
                            >
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    ref={passwordInput}
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.password}
                                />
                            </Field>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetAndClearErrors();
                                        setOpen(false);
                                    }}
                                    className="border-border hover:bg-sunken inline-flex min-h-12 items-center justify-center rounded-xl border px-5 text-sm font-semibold"
                                >
                                    {t('Batal')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    data-test="confirm-delete-user-button"
                                    className="bg-destructive text-destructive-foreground inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold disabled:opacity-45"
                                >
                                    {t('Hapus akun permanen')}
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            </Panel>
        </section>
    );
}
