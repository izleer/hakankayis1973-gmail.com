'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icons';

const items: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Hafıza', icon: 'leaf' },
  { href: '/varliklar', label: 'Varlıklar', icon: 'grid' },
  { href: '/arsiv', label: 'Arşiv', icon: 'archive' },
  { href: '/kesfet', label: 'Keşfet', icon: 'compass' },
  { href: '/bildirimler', label: 'Bildirimler', icon: 'bell' },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="side-nav" aria-label="Ana menü">
      <Link href="/varliklar/yeni" className="side-add">
        <Icon name="plus" size={18} />
        <span>Yeni varlık</span>
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const mobileItems: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Hafıza', icon: 'leaf' },
  { href: '/varliklar', label: 'Varlık', icon: 'grid' },
  { href: '/varliklar/yeni', label: 'Ekle', icon: 'plus' },
  { href: '/arsiv', label: 'Arşiv', icon: 'archive' },
  { href: '/kesfet', label: 'Keşfet', icon: 'compass' },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label="Mobil menü">
      {mobileItems.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
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
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
