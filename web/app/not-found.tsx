import Link from 'next/link';
import { Icon } from '@/components/Icons';

export const metadata = { title: 'Bulunamadı' };

export default function NotFound() {
  return (
    <main className="page page-narrow">
      <Link href="/" className="brand notfound-brand">
        <span className="brand-emblem">
          <Icon name="leaf" size={22} />
        </span>
        <span className="brand-word">
          Varlık
          <em>Hafızası</em>
        </span>
      </Link>

      <div className="notfound">
        <span className="notfound-number">404</span>
        <span className="eyebrow">Bu iz silinmiş olabilir</span>
        <h1>Aradığın sayfa burada değil.</h1>
        <p>
          Bağlantı eskimiş, varlık kaldırılmış ya da bu sayfayı görmek için
          erişimin olmayabilir.
        </p>
        <div className="notfound-actions">
          <Link href="/" className="btn btn-primary">
            <Icon name="arrow-left" size={17} />
            Hafızaya dön
          </Link>
          <Link href="/varliklar" className="btn btn-ghost">
            <Icon name="grid" size={16} />
            Varlıklar
          </Link>
        </div>
      </div>
    </main>
  );
}
