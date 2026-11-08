import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        onDelete(passkey.id, () => setIsDeleting(false));
    };

    return (
        <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
                <span className="bg-sunken text-muted-foreground grid size-10 shrink-0 place-items-center rounded-xl">
                    <KeyRound className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-semibold">{passkey.name}</p>
                        {passkey.authenticator && (
                            <span className="label-caps bg-sunken shrink-0 rounded-md px-1.5 py-0.5">
                                {passkey.authenticator}
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {t('Ditambah')} {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <>
                                <span className="mx-1" aria-hidden="true">
                                    ·
                                </span>
                                {t('Terakhir dipakai')}{' '}
                                {passkey.last_used_at_diff}
                            </>
                        )}
                    </p>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className="text-keluar hover:bg-keluar-wash grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-150"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">{t('Hapus passkey')}</span>
                    </button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>{t('Hapus passkey')}</DialogTitle>
                    <DialogDescription>
                        {t('Yakin hapus passkey')} "{passkey.name}"?{' '}
                        {t('Passkey ini nggak bisa dipakai login lagi.')}
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button
                                type="button"
                                className="border-border hover:bg-sunken inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold"
                            >
                                {t('Batal')}
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-45"
                        >
                            {isDeleting ? t('Menghapus…') : t('Hapus passkey')}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
