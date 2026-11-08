import { cn } from '@/lib/utils';

/** DompetKu mark: an ink tile holding two planks (a price tag, a card leaving the wallet); the lower plank takes the accent. */
export function LogoMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
    return (
        <svg
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('size-9 shrink-0', className)}
            aria-hidden="true"
        >
            <rect width="48" height="48" rx="14" className={onDark ? 'fill-white/12' : 'fill-[#0F1222] dark:fill-[#F3F2F8]'} />
            <rect x="10" y="13" width="20" height="7" rx="2.5" className={onDark ? 'fill-white' : 'fill-white dark:fill-[#0B0A14]'} />
            <rect x="10" y="24" width="30" height="11" rx="3.5" className="fill-[#2F5BFF] dark:fill-[#8B7CFF]" />
        </svg>
    );
}

export function Wordmark({ className }: { className?: string; onPapan?: boolean }) {
    return <span className={cn('text-[1.3rem] leading-none font-extrabold tracking-[-0.045em]', className)}>DompetKu</span>;
}

export function Logo({ className, onPapan = false }: { className?: string; onPapan?: boolean }) {
    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <LogoMark onDark={onPapan} />
            <Wordmark />
        </span>
    );
}
