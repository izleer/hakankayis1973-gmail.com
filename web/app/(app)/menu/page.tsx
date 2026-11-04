import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icons';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { LogoutButton } from '@/components/LogoutButton';
import { requireViewer } from '@/lib/api';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Menü') };
}

const links: { href: string; label: string; description: string; icon: IconName }[] = [
  {
    href: '/kesfet',
    label: 'Keşfet',
    description: 'Başka hafızalara, paylaşımlara ve topluluklara bak.',
    icon: 'compass',
  },
  {
    href: '/arsiv',
    label: 'Arşiv',
    description: 'Fotoğraf, belge ve videoların tek bir yerde.',
    icon: 'archive',
  },
  {
    href: '/bildirimler',
    label: 'Bildirimler',
    description: 'Takip, beğeni ve grup davetlerini gör.',
    icon: 'bell',
  },
  {
    href: '/profil',
    label: 'Profil',
    description: 'Kendi hafızan, paylaşımların ve sayaçların.',
    icon: 'user',
  },
  {
    href: '/ayarlar/sosyal',
    label: 'Bağlantılar',
    description: 'Facebook ve Instagram hesaplarını yönet.',
    icon: 'share',
  },
];

export default async function MenuPage() {
  const viewer = await requireViewer();
  const t = await getT();

  return (
    <main className="page page-narrow">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Tüm duraklar')}</span>
          <h1>{t('Menü')}</h1>
          <p>{t('Hafızana giden diğer yollar tek bir listede.')}</p>
        </div>
        <Link href="/" className="btn btn-ghost">
          <Icon name="arrow-left" size={17} />
          {t('Hafızaya dön')}
        </Link>
      </header>

      <nav className="menu-list" aria-label={t('Diğer sayfalar')}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="menu-link">
            <span className="menu-link-icon">
              <Icon name={link.icon} size={19} />
            </span>
            <span className="menu-link-text">
              <strong>{t(link.label)}</strong>
              <small>{t(link.description)}</small>
            </span>
            <Icon name="arrow-right" size={17} />
          </Link>
        ))}
      </nav>

      <section className="menu-account" aria-label={t('Hesap')}>
        <div>
          <strong>{viewer.displayName}</strong>
          <small>@{viewer.username}</small>
        </div>
        <div className="menu-account-actions">
          <LocaleSwitcher className="locale-switcher-menu" />
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
