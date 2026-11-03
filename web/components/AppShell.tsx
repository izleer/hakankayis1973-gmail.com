import Link from 'next/link';
import { initials } from '@/lib/format';
import type { User } from '@/lib/types';
import { Icon } from './Icons';
import { LogoutButton } from './LogoutButton';
import { MobileNav, SideNav } from './SideNav';

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="izleer, ana sayfa">
          <span className="brand-emblem">
            <Icon name="leaf" size={22} />
          </span>
          <span className="brand-word brand-word-single">izleer</span>
        </Link>

        <SideNav />

        <div className="sidebar-foot">
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
          <p className="sidebar-motto">“Hatırlamak, yeniden bakmaktır.”</p>
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
          <Link href="/profil" className="avatar avatar-small">
            {user.avatarUrl ? <img src={user.avatarUrl} alt={user.displayName} /> : initials(user.displayName)}
          </Link>
        </header>
        {children}
        <MobileNav />
      </div>
    </div>
  );
}
