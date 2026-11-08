import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

export default function TextLink({
    className = '',
    children,
    ...props
}: Props) {
    return (
        <Link
            className={cn(
                'text-foreground font-semibold underline-offset-4 hover:underline focus-visible:underline',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
