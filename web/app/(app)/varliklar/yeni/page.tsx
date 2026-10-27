import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { NewAssetForm } from '@/components/NewAssetForm';
import { api, requireViewer } from '@/lib/api';
import type { AssetType } from '@/lib/types';

export const metadata = { title: 'Yeni varlık' };

export default async function NewAssetPage() {
  await requireViewer();
  const types = await api<{ items: AssetType[] }>('/v1/asset-types');

  return (
    <main className="page page-narrow">
      <Link href="/varliklar" className="back-link">
        <Icon name="arrow-left" size={16} />
        Varlıklar
      </Link>
      <header className="page-head compact">
        <div>
          <span className="eyebrow">Hafızaya yeni bir iz</span>
          <h1>Yeni varlık</h1>
          <p>
            Bir canlı, bir eser, bir mekân… Adını koy, ilk fotoğrafını ekle ve
            hikâyesini başlat.
          </p>
        </div>
      </header>
      <NewAssetForm types={types.items} />
    </main>
  );
}
