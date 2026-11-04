import type { Metadata } from 'next';
import Link from 'next/link';
import { NewGroupForm } from '@/components/NewGroupForm';
import { Icon } from '@/components/Icons';
import { requireViewer } from '@/lib/api';
import { getI18n, getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Yeni grup · Gruplar') };
}

export default async function NewGroupPage() {
  await requireViewer();
  const { t } = await getI18n();
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
      <NewGroupForm />
    </main>
  );
}
