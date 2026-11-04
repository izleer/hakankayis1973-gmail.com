import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Bulunamadı') };
}

export default async function NotFound() {
  const t = await getT();

  return (
    <main className="page page-narrow">
      <Link href="/" className="brand notfound-brand">
        <span className="brand-emblem">
          <Icon name="leaf" size={22} />
        </span>
        <span className="brand-word brand-word-single">izleer</span>
      </Link>

      <div className="notfound">
        <span className="notfound-number">404</span>
        <span className="eyebrow">{t('Bu iz silinmiş olabilir')}</span>
        <h1>{t('Aradığın sayfa burada değil.')}</h1>
        <p>
          {t(
            'Bağlantı eskimiş, varlık kaldırılmış ya da bu sayfayı görmek için erişimin olmayabilir.',
          )}
        </p>
        <div className="notfound-actions">
          <Link href="/" className="btn btn-primary">
            <Icon name="arrow-left" size={17} />
            {t('Hafızaya dön')}
          </Link>
          <Link href="/varliklar" className="btn btn-ghost">
            <Icon name="grid" size={16} />
            {t('Varlıklar')}
          </Link>
        </div>
      </div>
    </main>
  );
}
