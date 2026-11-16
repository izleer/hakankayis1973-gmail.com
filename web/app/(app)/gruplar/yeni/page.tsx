import type { Metadata } from 'next';
import Link from 'next/link';
import { AdSlot } from '@/components/AdSlot';
import { NewGroupForm } from '@/components/NewGroupForm';
import { Icon } from '@/components/Icons';
import { requireViewer } from '@/lib/api';
import { adConfig } from '@/lib/ads';
import { getI18n, getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Yeni grup · Gruplar') };
}

export default async function NewGroupPage() {
  const viewer = await requireViewer();
  const { t } = await getI18n();
  const ads = viewer.plan === 'premium' ? null : adConfig();
  return (
    <main className="page">
      <Link href="/gruplar" className="back-link">
        <Icon name="arrow-left" size={16} />
        {t('Gruplar')}
      </Link>
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Yeni topluluk')}</span>
          <h1>{t('Bir grup kur')}</h1>
          <p>
            {t('Varlıklar yine sahiplerinde kalır. Grup, izin verdiğiniz parçaların etrafında insanları buluşturur.')}
          </p>
        </div>
      </header>
      {viewer.plan === 'premium' ? null : (
        <AdSlot client={ads?.client ?? ''} slot={ads?.slots.groups ?? ''} />
      )}
      <NewGroupForm />
    </main>
  );
}
