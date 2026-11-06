'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { vh } from '@/lib/client';
import { useT } from '@/lib/i18n/client';
import type { FriendStatus } from '@/lib/types';
import { Icon } from './Icons';

export function FriendButton({
  username,
  initial,
  compact = false,
  removable = false,
}: {
  username: string;
  initial: FriendStatus;
  compact?: boolean;
  removable?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [status, setStatus] = useState<FriendStatus>(initial);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await vh.post<{ status: string }>(`users/${username}/friend`);
      setStatus((data.status as FriendStatus) ?? 'pending_out');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (busy) return;
    setBusy(true);
    try {
      await vh.post(`users/${username}/friend/accept`);
      setStatus('friends');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy) return;
    setBusy(true);
    try {
      await vh.delete(`users/${username}/friend`);
      setStatus('none');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm(t('Arkadaşlıktan çıkarılsın mı?'))) return;
    await cancel();
  }

  if (status === 'friends') {
    return (
      <span className="friend-actions">
        <span className={`friend-badge${compact ? ' is-compact' : ''}`}>
          <Icon name="users" size={compact ? 13 : 15} />
          {t('Arkadaşsınız')}
        </span>
        {removable ? (
          <button
            type="button"
            className={`btn btn-ghost${compact ? ' btn-sm' : ''}`}
            onClick={remove}
            disabled={busy}
          >
            {t('Çıkar')}
          </button>
        ) : null}
      </span>
    );
  }

  if (status === 'pending_out') {
    return (
      <button
        type="button"
        className={`btn btn-ghost${compact ? ' btn-sm' : ''}`}
        onClick={cancel}
        disabled={busy}
      >
        <Icon name="clock" size={compact ? 14 : 16} />
        {t('İstek gönderildi')}
      </button>
    );
  }

  if (status === 'pending_in') {
    return (
      <span className="friend-actions">
        <button
          type="button"
          className={`btn btn-primary${compact ? ' btn-sm' : ''}`}
          onClick={accept}
          disabled={busy}
        >
          <Icon name="check" size={compact ? 14 : 16} />
          {t('İsteği kabul et')}
        </button>
        <button
          type="button"
          className={`btn btn-ghost${compact ? ' btn-sm' : ''}`}
          onClick={cancel}
          disabled={busy}
        >
          {t('Reddet')}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn-primary${compact ? ' btn-sm' : ''}`}
      onClick={add}
      disabled={busy}
    >
      <Icon name="users" size={compact ? 14 : 16} />
      {t('Arkadaş ekle')}
    </button>
  );
}
