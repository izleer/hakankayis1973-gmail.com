import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { NewAssetForm } from '@/components/NewAssetForm';
import { api, requireViewer } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import type { AssetType } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Yeni varlık') };
}

export default async function NewAssetPage() {
  await requireViewer();
  const t = await getT();
  const types = await api<{ items: AssetType[] }>('/v1/asset-types');

  return (
    <main className="page page-narrow">
      <Link href="/varliklar" className="back-link">
        <Icon name="arrow-left" size={16} />
        {t('Varlıklar')}
      </Link>
      <header className="page-head compact">
        <div>
          <span className="eyebrow">{t('Hafızaya yeni bir iz')}</span>
          <h1>{t('Yeni varlık')}</h1>
          <p>
            {t('Bir canlı, bir eser, bir mekân… Adını koy, ilk fotoğrafını ekle ve hikâyesini başlat.')}
          </p>
        </div>
      </header>
      <NewAssetForm types={types.items} />
    </main>
  );
}
