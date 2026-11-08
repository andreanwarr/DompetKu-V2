import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { t } from '@/lib/i18n';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title={t('Pengaturan tampilan')} />

            <section className="plank flex flex-col gap-5 p-5 sm:p-6">
                <Heading
                    variant="small"
                    title={t('Tema')}
                    description={t(
                        'Pilih tema terang, gelap, atau ikuti sistem perangkat',
                    )}
                />
                <AppearanceTabs />
            </section>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: t('Pengaturan tampilan'),
            href: editAppearance(),
        },
    ],
};
