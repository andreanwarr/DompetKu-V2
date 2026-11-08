import { router } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import { EmptyState } from '@/components/finance/kit';
import Heading from '@/components/heading';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import { t } from '@/lib/i18n';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onError,
        });
    };

    const handleRegisterSuccess = () => {
        router.reload();
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <section className="plank flex flex-col gap-5 p-5 sm:p-6">
            <Heading
                variant="small"
                title={t('Passkey')}
                description={t(
                    'Login tanpa password, pakai sidik jari, wajah, atau PIN perangkat',
                )}
            />

            {passkeys.length > 0 ? (
                <div className="border-border divide-border divide-y overflow-hidden rounded-xl border">
                    {passkeys.map((passkey) => (
                        <PasskeyItem
                            key={passkey.id}
                            passkey={passkey}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={KeyRound}
                    title={t('Belum ada passkey')}
                    text={t(
                        'Tambah passkey biar bisa login tanpa ngetik password.',
                    )}
                />
            )}

            <PasskeyRegistration onSuccess={handleRegisterSuccess} />
        </section>
    );
}
