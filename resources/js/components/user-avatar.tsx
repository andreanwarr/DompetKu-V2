import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

/** Profile photo when uploaded, initials otherwise. Size and colours come from className. */
export function UserAvatar({ user, className }: { user: Pick<User, 'name' | 'avatar'>; className?: string }) {
    const initials = useInitials();

    return (
        <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full font-bold', className)}>
            {user.avatar ? <img src={user.avatar} alt="" className="size-full object-cover" /> : initials(user.name)}
        </span>
    );
}
