'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { uploadMedia, vh } from '@/lib/client';
import { initials } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import type { User } from '@/lib/types';
import { Icon } from './Icons';

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

export function ProfileAvatarEditor({ user }: { user: User }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = preview ?? user.avatarUrl;

  async function choose(file: File | undefined) {
    if (!file || busy) return;
    if (!file.type.startsWith('image/')) {
      setError(t('Yalnızca fotoğraf yükleyebilirsin.'));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(t('Dosya en fazla 10 MB olabilir.'));
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);
    setError(null);
    try {
      const media = await uploadMedia(file);
      if (!media.url) {
        throw new Error(t('Fotoğraf yüklenemedi.'));
      }
      await vh.patch('me', { avatarUrl: media.url });
      URL.revokeObjectURL(localUrl);
      setPreview(media.url);
      router.refresh();
    } catch (caught) {
      URL.revokeObjectURL(localUrl);
      setPreview(null);
      setError(caught instanceof Error ? caught.message : t('Fotoğraf yüklenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm(t('Profil fotoğrafı kaldırılsın mı?'))) return;
    setBusy(true);
    setError(null);
    try {
      await vh.patch('me', { avatarUrl: '' });
      setPreview(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Fotoğraf kaldırılamadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-avatar-block">
      <button
        type="button"
        className="profile-avatar profile-avatar-editable"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-busy={busy}
        aria-label={t('Profil fotoğrafını değiştir')}
        title={t('Profil fotoğrafını değiştir')}
      >
        {current ? (
          <img src={current} alt={user.displayName} />
        ) : (
          initials(user.displayName, locale)
        )}
        <span className="profile-avatar-badge" aria-hidden="true">
          {busy ? <span className="profile-avatar-spinner" /> : <Icon name="camera" size={15} />}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void choose(file);
        }}
      />
      {current && !busy ? (
        <button type="button" className="profile-avatar-remove" onClick={remove}>
          {t('Fotoğrafı kaldır')}
        </button>
      ) : null}
      {error ? (
        <p className="profile-avatar-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
