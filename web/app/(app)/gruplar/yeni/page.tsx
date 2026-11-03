import Link from 'next/link';
import { NewGroupForm } from '@/components/NewGroupForm';
import { Icon } from '@/components/Icons';
import { requireViewer } from '@/lib/api';

export const metadata = { title: 'Yeni grup · Gruplar' };

export default async function NewGroupPage() {
  await requireViewer();
  return (
    <main className="page">
      <Link href="/gruplar" className="back-link">
        <Icon name="arrow-left" size={16} />
        Gruplar
      </Link>
      <header className="page-head">
        <div>
          <span className="eyebrow">Yeni topluluk</span>
          <h1>Bir grup kur</h1>
          <p>
            Varlıklar yine sahiplerinde kalır. Grup, izin verdiğiniz parçaların
            etrafında insanları buluşturur.
          </p>
        </div>
      </header>
      <NewGroupForm />
    </main>
  );
}
