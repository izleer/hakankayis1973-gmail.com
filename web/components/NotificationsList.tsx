'use client';

import Link from 'next/link';
import { useState } from 'react';
import { vh } from '@/lib/client';
import { formatDateTime, initials } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import type { Notification } from '@/lib/types';
import { EmptyState } from './EmptyState';
import { Icon, type IconName } from './Icons';

const meta: Record<string, { label: string; icon: IconName }> = {
  like: { label: 'Beğeni', icon: 'heart' },
  comment: { label: 'Yorum', icon: 'message' },
  follow: { label: 'Takip', icon: 'user' },
  community_join: { label: 'Topluluk', icon: 'users' },
  community_post: { label: 'Topluluk', icon: 'users' },
  system: { label: 'Sistem', icon: 'bell' },
};

function linkFor(item: Notification): string {
  if (item.entityType === 'user' && item.actor) return `/profil/${item.actor.username}`;
  if (item.entityType === 'asset' && item.entityId) return `/varliklar/${item.entityId}`;
  if (item.entityType === 'post') return '/kesfet';
  if (item.entityType === 'community') return '/kesfet';
  return '/';
}

export function NotificationsList({
  initial,
  initialUnread,
}: {
  initial: Notification[];
  initialUnread: number;
}) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [busy, setBusy] = useState(false);

  async function markAll() {
    if (busy || unread === 0) return;
    setBusy(true);
    try {
      await vh.post('notifications/read-all');
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      setUnread(0);
    } finally {
      setBusy(false);
    }
  }

  async function markOne(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
      ),
    );
    setUnread((count) => Math.max(0, count - 1));
    await vh.post(`notifications/${id}/read`).catch(() => undefined);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="bell"
        title={t('Henüz bildirim yok')}
        body={t(
          'Biri gönderini beğendiğinde, yorum yaptığında ya da seni takip ettiğinde burada görünecek.',
        )}
        action={{ href: '/kesfet', label: t('Keşfete göz at') }}
      />
    );
  }

  return (
    <>
      <div className="notice-toolbar">
        <span className="notice-count">
          {unread > 0 ? t('{count} okunmamış bildirim', { count: unread }) : t('Tümü okundu')}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={markAll}
          disabled={busy || unread === 0}
        >
          <Icon name="check" size={15} />
          {t('Tümünü okundu işaretle')}
        </button>
      </div>

      <div className="notice-list">
        {items.map((item) => {
          const info = meta[item.type] ?? { label: item.type, icon: 'bell' as IconName };
          return (
            <Link
              key={item.id}
              href={linkFor(item)}
              className={`notice-row${item.readAt ? '' : ' is-unread'}`}
              onClick={() => {
                if (!item.readAt) void markOne(item.id);
              }}
            >
              <span className="notice-icon">
                <Icon name={info.icon} size={18} />
              </span>
              <span className="notice-actor">
                <span className="avatar avatar-small">
                  {item.actor?.avatarUrl ? (
                    <img src={item.actor.avatarUrl} alt="" />
                  ) : item.actor ? (
                    initials(item.actor.displayName, locale)
                  ) : (
                    <Icon name="bell" size={15} />
                  )}
                </span>
              </span>
              <span className="notice-body">
                <span className="notice-kicker">
                  {t(info.label)}
                  {item.readAt ? null : <span className="notice-dot" />}
                </span>
                <strong>{item.message ?? t('Yeni bir bildirim var.')}</strong>
                <small>{formatDateTime(item.createdAt, locale)}</small>
              </span>
              <Icon name="arrow-right" size={16} />
            </Link>
          );
        })}
      </div>
    </>
  );
}
