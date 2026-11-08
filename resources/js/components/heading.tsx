export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    return (
        <header className={variant === 'small' ? '' : 'mb-6'}>
            <h2
                className={
                    variant === 'small'
                        ? 'font-display text-xl leading-none font-bold'
                        : 'font-display text-2xl leading-none font-bold'
                }
            >
                {title}
            </h2>
            {description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {description}
                </p>
            )}
        </header>
    );
}
