'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/client';
import type { Plan } from '@/lib/types';
import { Icon, type IconName } from './Icons';

const items: {
  href: string;
  label: string;
  icon: IconName;
  premiumOnly?: boolean;
}[] = [
  { href: '/', label: 'Hafıza', icon: 'leaf' },
  { href: '/varliklar', label: 'Varlıklar', icon: 'grid' },
  { href: '/analiz', label: 'Analiz', icon: 'ruler', premiumOnly: true },
  { href: '/arkadaslar', label: 'Arkadaşlar', icon: 'users' },
  { href: '/rapor', label: 'Rapor', icon: 'file', premiumOnly: true },
  { href: '/gruplar', label: 'Gruplar', icon: 'users' },
  { href: '/arsiv', label: 'Arşiv', icon: 'archive' },
  { href: '/kesfet', label: 'Keşfet', icon: 'compass' },
  { href: '/bildirimler', label: 'Bildirimler', icon: 'bell' },
  { href: '/ayarlar/sosyal', label: 'Bağlantılar', icon: 'share' },
];

export function SideNav({ plan = 'free', isAdmin = false }: { plan?: Plan; isAdmin?: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const premium = plan === 'premium';
  return (
    <nav className="side-nav" aria-label={t('Ana menü')}>
      <Link href="/varliklar/yeni" className="side-add">
        <Icon name="plus" size={18} />
        <span>{t('Yeni varlık')}</span>
      </Link>
      <div className="side-nav-group">
        {items.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`side-link${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={19} />
              <span>{t(item.label)}</span>
              {item.premiumOnly && !premium ? (
                <span className="side-lock" title={t('Premium')}>
                  <Icon name="lock" size={12} />
                </span>
              ) : null}
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            href="/yonetim"
            className={`side-link${pathname.startsWith('/yonetim') ? ' is-active' : ''}`}
            aria-current={pathname.startsWith('/yonetim') ? 'page' : undefined}
          >
            <Icon name="lock" size={19} />
            <span>{t('Yönetim')}</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

const mobileItems: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Hafıza', icon: 'leaf' },
  { href: '/varliklar', label: 'Varlık', icon: 'grid' },
  { href: '/varliklar/yeni', label: 'Ekle', icon: 'plus' },
  { href: '/gruplar', label: 'Gruplar', icon: 'users' },
  { href: '/menu', label: 'Daha fazla', icon: 'more' },
];

const menuPaths = [
  '/menu',
  '/kesfet',
  '/arkadaslar',
  '/arsiv',
  '/bildirimler',
  '/profil',
  '/ayarlar',
  '/rapor',
  '/analiz',
  '/plan',
];

function isMobileActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/';
  if (href === '/menu') {
    return menuPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }
  if (href === '/varliklar') {
    return (
      pathname === '/varliklar' ||
      (pathname.startsWith('/varliklar/') && !pathname.startsWith('/varliklar/yeni'))
    );
  }
  if (href === '/varliklar/yeni') {
    return pathname === '/varliklar/yeni' || pathname.startsWith('/varliklar/yeni/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="mobile-nav" aria-label={t('Mobil menü')}>
      {mobileItems.map((item) => {
        const active = isMobileActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-link${active ? ' is-active' : ''}${
              item.href === '/varliklar/yeni' ? ' is-add' : ''
            }`}
          >
            <span className="mobile-link-icon">
              <Icon name={item.icon} size={item.href === '/varliklar/yeni' ? 24 : 20} />
            </span>
            <span>{t(item.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
