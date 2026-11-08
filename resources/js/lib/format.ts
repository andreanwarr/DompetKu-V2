import { locale } from '@/lib/i18n';

const numberLocale = () => (locale() === 'en' ? 'en-US' : 'id-ID');

export const rupiah = (value: number) =>
    new Intl.NumberFormat(numberLocale(), {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);

/** Digits only, grouped: 1250000 -> "1.250.000". */
export const groupDigits = (value: number) =>
    new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 0 }).format(
        Math.abs(value),
    );

/** Short form for tight spots: 1.250.000 -> "1,25 jt". */
export const compactRupiah = (value: number) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? '−' : '';
    const en = locale() === 'en';
    const fmt = (n: number) =>
        new Intl.NumberFormat(numberLocale(), {
            maximumFractionDigits: n >= 100 ? 0 : 1,
        }).format(n);
    if (abs >= 1e9) return `${sign}${fmt(abs / 1e9)} ${en ? 'B' : 'M'}`;
    if (abs >= 1e6) return `${sign}${fmt(abs / 1e6)} ${en ? 'M' : 'jt'}`;
    if (abs >= 1e3) return `${sign}${fmt(abs / 1e3)} ${en ? 'K' : 'rb'}`;
    return `${sign}${abs}`;
};

const asDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`);

export const shortDate = (value: string) =>
    new Intl.DateTimeFormat(numberLocale(), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(asDate(value));

/** "Sab, 25 Okt" */
export const dayLabel = (value: string) =>
    new Intl.DateTimeFormat(numberLocale(), {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    }).format(asDate(value));

/** "Oktober 2026" from "2026-10" */
export const monthLabel = (month: string) =>
    new Intl.DateTimeFormat(numberLocale(), {
        month: 'long',
        year: 'numeric',
    }).format(asDate(`${month}-01`));

/** Today as YYYY-MM-DD in the device's own timezone. */
export const localDate = (offsetDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const shiftMonth = (month: string, delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// crypto.randomUUID only exists in secure contexts (https/localhost); *.test is not one
export const newIdempotencyKey = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          });

/** Ink colour that stays readable on a user-picked wallet/category colour. */
export const inkOn = (hex: string) => {
    const value = hex.replace('#', '');
    if (value.length !== 6) return '#ffffff';
    const [r, g, b] = [0, 2, 4].map((i) => {
        const c = parseInt(value.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // pick whichever ink has the higher WCAG contrast (white L=1, ink #141b16 L≈0.011)
    return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.061 ? '#ffffff' : '#141b16';
};
