import { groupDigits } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Painted amount: heavy tabular numerals with a small raised "Rp".
 * `sign` forces +/−; otherwise negatives get "−" and positives none.
 */
export function Money({
    value,
    sign,
    className,
}: {
    value: number;
    sign?: '+' | '−' | '';
    className?: string;
}) {
    const prefix = sign ?? (value < 0 ? '−' : '');

    return (
        <span className={cn('papan-num whitespace-nowrap', className)}>
            {prefix && <span className="mr-[0.04em]">{prefix}</span>}
            <span className="rp">Rp</span>
            {groupDigits(value)}
        </span>
    );
}
