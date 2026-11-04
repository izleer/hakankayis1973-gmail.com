'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n/client';
import { Icon } from './Icons';

export function LogoutButton() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="logout-btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch('/api/session/logout', { method: 'POST' });
        } finally {
          window.location.assign('/giris');
        }
      }}
    >
      <Icon name="logout" size={17} />
      <span>{busy ? t('Çıkılıyor…') : t('Çıkış')}</span>
    </button>
  );
}
