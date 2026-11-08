import {
    ArrowDownLeft,
    ArrowRightLeft,
    ArrowUpRight,
    Banknote,
    CreditCard,
    HandCoins,
    Landmark,
    PiggyBank,
    Smartphone,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { t } from '@/lib/i18n';

export type FundSource = {
    id: number;
    name: string;
    type: string;
    color: string;
};

export type Category = {
    id: number;
    name: string;
    type: 'income' | 'expense';
    color: string;
    bucket?: string;
};

export type QuickEntryData = {
    fundSources: FundSource[];
    categories: Category[];
};

/** Direction of cash for the owner's wallets: masuk (+), keluar (−), or a move (no sign). */
export type Flow = 'in' | 'out' | 'move';

type TypeMeta = { label: string; flow: Flow; icon: LucideIcon };

export const entryType = (type: string): TypeMeta => {
    switch (type) {
        case 'income':
            return { label: t('Pemasukan'), flow: 'in', icon: ArrowDownLeft };
        case 'expense':
            return { label: t('Pengeluaran'), flow: 'out', icon: ArrowUpRight };
        case 'transfer':
            return { label: t('Pindah dana'), flow: 'move', icon: ArrowRightLeft };
        case 'savings_deposit':
            return { label: t('Setor tabungan'), flow: 'move', icon: PiggyBank };
        case 'savings_withdrawal':
            return { label: t('Tarik tabungan'), flow: 'move', icon: PiggyBank };
        case 'receivable_issue':
            return { label: t('Kasbon keluar'), flow: 'out', icon: HandCoins };
        case 'receivable_payment':
            return { label: t('Kasbon dibayar'), flow: 'in', icon: HandCoins };
        case 'loan_received':
            return { label: t('Pinjaman masuk'), flow: 'in', icon: Landmark };
        case 'loan_payment':
            return { label: t('Bayar pinjaman'), flow: 'out', icon: Landmark };
        default:
            return { label: type, flow: 'move', icon: ArrowRightLeft };
    }
};

export const flowSign = (flow: Flow) =>
    flow === 'in' ? '+' : flow === 'out' ? '−' : '';

export const flowClass = (flow: Flow) =>
    flow === 'in' ? 'text-masuk' : flow === 'out' ? 'text-keluar' : '';

export const sourceIcon = (type: string): LucideIcon =>
    ({
        cash: Banknote,
        bank: Landmark,
        ewallet: Smartphone,
        prepaid: CreditCard,
    })[type] ?? Wallet;

export const sourceTypeLabel = (type: string) =>
    ({
        cash: t('Tunai'),
        bank: t('Bank'),
        ewallet: t('E-wallet'),
        prepaid: t('Prabayar'),
        other: t('Lainnya'),
    })[type] ?? type;

export const bucketLabel = (bucket?: string) =>
    ({
        essential: t('Wajib'),
        lifestyle: t('Gaya hidup'),
        saving: t('Tabungan'),
        income: t('Pemasukan'),
    })[bucket ?? ''] ?? '';
