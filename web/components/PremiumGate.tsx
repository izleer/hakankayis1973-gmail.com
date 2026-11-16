import Link from 'next/link';
import { getT } from '@/lib/i18n/server';
import { Icon } from './Icons';

/**
 * Premium'a özel sayfaların ortak kapısı. İçerik gösterilmez; neyin
 * açılacağı ve nasıl geçileceği açıkça anlatılır.
 */
export async function PremiumGate({ title, body }: { title: string; body: string }) {
  const t = await getT();
  return (
    <main className="page page-narrow">
      <section className="premium-gate" aria-label={t('Premium özellik')}>
        <span className="premium-gate-icon">
          <Icon name="lock" size={26} />
        </span>
        <span className="eyebrow">{t('PREMIUM')}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        <ul className="premium-gate-list">
          <li>
            <Icon name="check" size={15} />
            {t('Sınırsız varlık ve kayıt')}
          </li>
          <li>
            <Icon name="check" size={15} />
            {t('Varlık karşılaştırması ve gelişmiş analiz')}
          </li>
          <li>
            <Icon name="check" size={15} />
            {t('Yazdırılabilir raporlar')}
          </li>
        </ul>
        <div className="premium-gate-actions">
          <Link href="/plan" className="btn btn-primary">
            <Icon name="sparkles" size={17} />
            {t('Planları gör')}
          </Link>
          <Link href="/" className="btn btn-ghost">
            <Icon name="arrow-left" size={16} />
            {t('Hafızaya dön')}
          </Link>
        </div>
      </section>
    </main>
  );
}
