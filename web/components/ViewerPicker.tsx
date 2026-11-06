'use client';

import { useEffect, useMemo, useState } from 'react';
import { vh } from '@/lib/client';
import { useT } from '@/lib/i18n/client';
import type { Friend, UserMini } from '@/lib/types';
import { Icon } from './Icons';

export function ViewerPicker({
  selected,
  onChange,
  extra = [],
  disabled = false,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  extra?: UserMini[];
  disabled?: boolean;
}) {
  const t = useT();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    vh.get<{ items: Friend[] }>('users/me/friends')
      .then((data) => {
        if (active) setFriends(data.items);
      })
      .catch(() => {
        if (active) setFriends([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const candidates = useMemo(() => {
    const known = new Set<string>();
    const merged: UserMini[] = [];
    for (const user of [...extra, ...(friends ?? [])]) {
      if (known.has(user.id)) continue;
      known.add(user.id);
      merged.push(user);
    }
    return merged.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [extra, friends]);

  const filtered = query.trim()
    ? candidates.filter((user) => {
        const needle = query.trim().toLocaleLowerCase();
        return (
          user.displayName.toLocaleLowerCase().includes(needle) ||
          user.username.toLocaleLowerCase().includes(needle)
        );
      })
    : candidates;

  function toggle(userId: string) {
    onChange(
      selected.includes(userId)
        ? selected.filter((id) => id !== userId)
        : [...selected, userId],
    );
  }

  return (
    <div className="viewer-picker">
      <div className="viewer-picker-head">
        <span>
          {t('Kişiler')}
          <small>{t('En az bir kişi seç. Birden çok kişi seçebilirsin.')}</small>
        </span>
        <strong>{t('{count} seçili', { count: selected.length })}</strong>
      </div>
      <label className="viewer-search">
        <Icon name="search" size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Arkadaşlarında ara')}
          aria-label={t('Arkadaşlarında ara')}
        />
      </label>
      {friends === null ? (
        <p className="muted-note">{t('Kişiler yükleniyor…')}</p>
      ) : filtered.length === 0 ? (
        <p className="muted-note">
          {query.trim()
            ? t('Eşleşen kişi bulunamadı.')
            : t('Arkadaş listende kişi yok. Önce arkadaş ekleyebilirsin.')}
        </p>
      ) : (
        <div className="viewer-list">
          {filtered.map((user) => {
            const active = selected.includes(user.id);
            return (
              <button
                type="button"
                key={user.id}
                className={`viewer-chip${active ? ' is-selected' : ''}`}
                onClick={() => toggle(user.id)}
                disabled={disabled}
                aria-pressed={active}
              >
                <span className="avatar avatar-small">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" />
                  ) : (
                    user.displayName.slice(0, 1)
                  )}
                </span>
                <span>
                  <strong>{user.displayName}</strong>
                  <small>@{user.username}</small>
                </span>
                {active ? (
                  <span className="type-check">
                    <Icon name="check" size={13} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
