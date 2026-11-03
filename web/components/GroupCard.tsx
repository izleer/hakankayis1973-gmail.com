import Link from 'next/link';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';
import type { Group } from '@/lib/types';

const roleLabels: Record<string, string> = {
  owner: 'Kurucu',
  admin: 'Yönetici',
  moderator: 'Moderatör',
  member: 'Üye',
};

export function GroupCard({ group }: { group: Group }) {
  return (
    <Link href={`/gruplar/${group.slug}`} className="group-card">
      <span className="group-cover">
        <MediaImage src={group.coverUrl} alt={group.name} fallbackIcon="users" />
        <span className={`visibility-pill is-${group.visibility === 'private' ? 'private' : 'public'}`}>
          <Icon name={group.visibility === 'private' ? 'lock' : 'eye'} size={12} />
          {group.visibility === 'private' ? 'Özel' : 'Herkese açık'}
        </span>
        {group.role ? (
          <span className="group-role-badge">{roleLabels[group.role] ?? group.role}</span>
        ) : group.membershipStatus === 'pending' ? (
          <span className="group-role-badge is-pending">Onay bekliyor</span>
        ) : null}
      </span>
      <span className="group-card-body">
        {group.category ? <span className="eyebrow">{group.category}</span> : null}
        <strong>{group.name}</strong>
        <small className="group-card-description">
          {group.description ?? 'Bu grubun henüz bir açıklaması yok.'}
        </small>
        <span className="group-card-meta">
          <span>
            <Icon name="users" size={13} />
            {group.memberCount} üye
          </span>
          <span>
            <Icon name="book" size={13} />
            {group.postCount} gönderi
          </span>
          <span>
            <Icon name="leaf" size={13} />
            {group.assetCount} varlık
          </span>
        </span>
      </span>
    </Link>
  );
}
