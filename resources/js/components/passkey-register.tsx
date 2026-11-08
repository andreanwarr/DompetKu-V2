import { usePasskeyRegister } from '@laravel/passkeys/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Field } from '@/components/finance/kit';
import InputError from '@/components/input-error';
import { t } from '@/lib/i18n';

type Props = {
    onSuccess: () => void;
};

export default function PasskeyRegistration({ onSuccess }: Props) {
    const [name, setName] = useState(() => {
        const ua = navigator.userAgent;

        const browser = [
            { pattern: /Edg|Edge/, name: 'Edge' },
            { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
            { pattern: /Firefox|FxiOS/, name: 'Firefox' },
            { pattern: /Chrome|CriOS/, name: 'Chrome' },
            { pattern: /Safari/, name: 'Safari' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        const os = [
            { pattern: /iPhone/, name: 'iPhone' },
            { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
            { pattern: /Android/, name: 'Android' },
            { pattern: /Mac/, name: 'Mac' },
            { pattern: /Windows/, name: 'Windows' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        return [browser, os].filter(Boolean).join(' on ') || '';
    });

    const [showForm, setShowForm] = useState(false);
    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setName('');
            setShowForm(false);
            onSuccess();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        await register(name);
    };

    const handleCancel = () => {
        setShowForm(false);
        setName('');
    };

    if (!isSupported) {
        return (
            <p className="text-muted-foreground text-sm">
                {t('Browser ini belum dukung passkey.')}
            </p>
        );
    }

    if (!showForm) {
        return (
            <button
                type="button"
                onClick={() => setShowForm(true)}
                className="border-border bg-card hover:bg-sunken inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors duration-150"
            >
                <Plus className="size-4" aria-hidden="true" />
                {t('Tambah passkey')}
            </button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-sunken flex flex-col gap-4 rounded-xl p-4"
        >
            <Field
                label={t('Nama passkey')}
                htmlFor="passkey-name"
                hint={t('Nama ini biar lo gampang ngenalin passkey-nya nanti.')}
            >
                <input
                    id="passkey-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('mis. MacBook, iPhone')}
                    className="field"
                    autoFocus
                />
            </Field>

            {error && <InputError message={error} />}

            <div className="flex flex-wrap gap-2">
                <button
                    type="submit"
                    disabled={isLoading || !name.trim()}
                    className="btn-kuning inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm disabled:opacity-45"
                >
                    {isLoading ? t('Mendaftarkan…') : t('Daftarkan passkey')}
                </button>
                <button
                    type="button"
                    onClick={handleCancel}
                    className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
                >
                    {t('Batal')}
                </button>
            </div>
        </form>
    );
}
