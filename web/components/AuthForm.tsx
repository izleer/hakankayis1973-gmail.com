'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/lib/i18n/client';
import { Icon } from './Icons';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const t = useT();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isRegister = mode === 'register';
  const showDemo = process.env.NODE_ENV !== 'production';

  function fillDemo() {
    setIdentifier('ada@demo.local');
    setPassword('Demo1234!');
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/session/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isRegister
            ? { displayName, username, email, password }
            : { identifier, password },
        ),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? t('İşlem tamamlanamadı.'));
      }
      router.replace('/');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('İşlem tamamlanamadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/" className="brand auth-brand">
        <span className="brand-emblem">
          <Icon name="leaf" size={22} />
        </span>
        <span className="brand-word brand-word-single">izleer</span>
      </Link>

      <div className="auth-copy">
        <span className="eyebrow">{isRegister ? t('Yeni bir hafıza') : t('Tekrar hoş geldin')}</span>
        <h1>{isRegister ? t('Hatırlamaya başla.') : t('Kaldığın yerden devam et.')}</h1>
        <p>
          {isRegister
            ? t('Birkaç saniyede hesabını oluştur; ilk varlığını ve ilk anısını ekle.')
            : t('Varlıklarının zaman çizelgesi, fotoğrafları ve belgeleri seni bekliyor.')}
        </p>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {isRegister ? (
          <>
            <label className="field">
              <span>{t('Ad soyad')}</span>
              <input
                className="input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ada Yıldız"
                autoComplete="name"
                required
              />
            </label>
            <label className="field">
              <span>{t('Kullanıcı adı')}</span>
              <input
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="ada"
                autoComplete="username"
                pattern="[A-Za-z0-9_]{3,30}"
                title={t('3-30 karakter; harf, rakam ve alt çizgi')}
                required
              />
            </label>
            <label className="field">
              <span>{t('E-posta')}</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('ada@ornek.com')}
                autoComplete="email"
                required
              />
            </label>
          </>
        ) : (
          <label className="field">
            <span>{t('E-posta veya kullanıcı adı')}</span>
            <input
              className="input"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="ada@demo.local"
              autoComplete="username"
              required
            />
          </label>
        )}

        <label className="field">
          <span>{t('Şifre')}</span>
          <span className="password-wrap">
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : 1}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={(event) => {
                event.preventDefault();
                setShowPassword((value) => !value);
              }}
              aria-pressed={showPassword}
              aria-label={showPassword ? t('Şifreyi gizle') : t('Şifreyi göster')}
              title={showPassword ? t('Şifreyi gizle') : t('Şifreyi göster')}
            >
              <Icon name={showPassword ? 'lock' : 'eye'} size={17} />
            </button>
          </span>
          {isRegister ? <small>{t('En az 8 karakter, bir harf ve bir rakam.')}</small> : null}
        </label>

        {error ? (
          <div className="form-error" role="alert">
            <Icon name="close" size={16} />
            {error}
          </div>
        ) : null}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? t('Bir saniye…') : isRegister ? t('Hesabı oluştur') : t('Giriş yap')}
          {!busy ? <Icon name="arrow-right" size={18} /> : null}
        </button>
      </form>

      {!isRegister && showDemo ? (
        <div className="demo-card">
          <div>
            <strong>{t('Demo hesap')}</strong>
            <span>ada@demo.local · Demo1234!</span>
          </div>
          <button type="button" className="btn btn-ghost btn-xs" onClick={fillDemo}>
            {t('Doldur')}
          </button>
        </div>
      ) : null}

      <p className="auth-switch">
        {isRegister ? t('Zaten hesabın var mı? ') : t('Henüz hesabın yok mu? ')}
        <Link href={isRegister ? '/giris' : '/kayit'}>
          {isRegister ? t('Giriş yap') : t('Hesap oluştur')}
        </Link>
      </p>
    </>
  );
}
