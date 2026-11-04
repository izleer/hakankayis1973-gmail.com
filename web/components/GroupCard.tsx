import Link from 'next/link';
import { getT } from '@/lib/i18n/server';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';
import type { Group } from '@/lib/types';

const roleLabels: Record<string, string> = {
  owner: 'Kurucu',
  admin: 'Yönetici',
  moderator: 'Moderatör',
  member: 'Üye',
};

export async function GroupCard({ group }: { group: Group }) {
  const t = await getT();

  return (
    <Link href={`/gruplar/${group.slug}`} className="group-card">
      <span className="group-cover">
        <MediaImage src={group.coverUrl} alt={group.name} fallbackIcon="users" />
        <span className={`visibility-pill is-${group.visibility === 'private' ? 'private' : 'public'}`}>
          <Icon name={group.visibility === 'private' ? 'lock' : 'eye'} size={12} />
          {group.visibility === 'private' ? t('Özel') : t('Herkese açık')}
        </span>
        {group.role ? (
          <span className="group-role-badge">{t(roleLabels[group.role] ?? group.role)}</span>
        ) : group.membershipStatus === 'pending' ? (
          <span className="group-role-badge is-pending">{t('Onay bekliyor')}</span>
        ) : null}
      </span>
      <span className="group-card-body">
        {group.category ? <span className="eyebrow">{t(group.category)}</span> : null}
        <strong>{group.name}</strong>
        <small className="group-card-description">
          {group.description ?? t('Bu grubun henüz bir açıklaması yok.')}
        </small>
        <span className="group-card-meta">
          <span>
            <Icon name="users" size={13} />
            {t('{count} üye', { count: group.memberCount })}
          </span>
          <span>
            <Icon name="book" size={13} />
            {t('{count} gönderi', { count: group.postCount })}
          </span>
          <span>
            <Icon name="leaf" size={13} />
            {t('{count} varlık', { count: group.assetCount })}
          </span>
        </span>
      </span>
    </Link>
  );
}
