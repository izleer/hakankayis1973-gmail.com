'use client';

import { useState } from 'react';
import { vh } from '@/lib/client';
import { useT } from '@/lib/i18n/client';
import { Icon } from './Icons';

export function FollowButton({
  username,
  initial,
  compact = false,
}: {
  username: string;
  initial: boolean;
  compact?: boolean;
}) {
  const t = useT();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      await (next
        ? vh.post(`users/${username}/follow`)
        : vh.delete(`users/${username}/follow`));
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`btn ${following ? 'btn-ghost' : 'btn-primary'}${compact ? ' btn-sm' : ''}`}
      onClick={toggle}
      disabled={busy}
    >
      <Icon name={following ? 'check' : 'plus'} size={compact ? 14 : 16} />
      {following ? t('Takip ediliyor') : t('Takip et')}
    </button>
  );
}
