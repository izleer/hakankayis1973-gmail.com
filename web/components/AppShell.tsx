import Link from 'next/link';
import { initials } from '@/lib/format';
import { getT } from '@/lib/i18n/server';
import type { User } from '@/lib/types';
import { Icon } from './Icons';
import { LocaleSwitcher } from './LocaleSwitcher';
import { LogoutButton } from './LogoutButton';
import { MobileNav, SideNav } from './SideNav';
import { ReminderAlert } from './ReminderAlert';

export async function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const t = await getT();

  return (
    <div className="shell">
      <a href="#ana-icerik" className="skip-link">
        {t('İçeriğe geç')}
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label={t('izleer, ana sayfa')}>
          <span className="brand-emblem">
            <Icon name="leaf" size={22} />
          </span>
          <span className="brand-word brand-word-single">izleer</span>
        </Link>

        <SideNav />

        <div className="sidebar-foot">
          <LocaleSwitcher className="locale-switcher-side" />
          <Link href="/profil" className="user-card">
            <span className="avatar">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.displayName)}
            </span>
            <span className="user-card-text">
              <strong>{user.displayName}</strong>
              <small>@{user.username}</small>
            </span>
            <Icon name="arrow-right" size={16} />
          </Link>
          <LogoutButton />
          <p className="sidebar-motto">{t('“Hatırlamak, yeniden bakmaktır.”')}</p>
        </div>
      </aside>

      <div className="main">
        <header className="mobile-header">
          <Link href="/" className="brand brand-mobile">
            <span className="brand-emblem">
              <Icon name="leaf" size={20} />
            </span>
            <span className="brand-word brand-word-single">izleer</span>
          </Link>
          <span className="mobile-header-end">
            <LocaleSwitcher className="locale-switcher-mobile" />
            <Link href="/profil" className="avatar avatar-small">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} />
              ) : (
                initials(user.displayName)
              )}
            </Link>
          </span>
        </header>
        <div id="ana-icerik" className="main-content" tabIndex={-1}>
          {children}
        </div>
        <MobileNav />
        <ReminderAlert />
      </div>
    </div>
  );
}
