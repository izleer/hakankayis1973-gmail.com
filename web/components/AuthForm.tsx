'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icons';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

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
        throw new Error(payload?.error?.message ?? 'İşlem tamamlanamadı.');
      }
      router.replace('/');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İşlem tamamlanamadı.');
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
        <span className="brand-word">
          Varlık
          <em>Hafızası</em>
        </span>
      </Link>

      <div className="auth-copy">
        <span className="eyebrow">{isRegister ? 'Yeni bir hafıza' : 'Tekrar hoş geldin'}</span>
        <h1>{isRegister ? 'Hatırlamaya başla.' : 'Kaldığın yerden devam et.'}</h1>
        <p>
          {isRegister
            ? 'Birkaç saniyede hesabını oluştur; ilk varlığını ve ilk anısını ekle.'
            : 'Varlıklarının zaman çizelgesi, fotoğrafları ve belgeleri seni bekliyor.'}
        </p>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {isRegister ? (
          <>
            <label className="field">
              <span>Ad soyad</span>
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
              <span>Kullanıcı adı</span>
              <input
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="ada"
                autoComplete="username"
                pattern="[A-Za-z0-9_]{3,30}"
                title="3-30 karakter; harf, rakam ve alt çizgi"
                required
              />
            </label>
            <label className="field">
              <span>E-posta</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ada@ornek.com"
                autoComplete="email"
                required
              />
            </label>
          </>
        ) : (
          <label className="field">
            <span>E-posta veya kullanıcı adı</span>
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
          <span>Şifre</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : 1}
            required
          />
          {isRegister ? <small>En az 8 karakter, bir harf ve bir rakam.</small> : null}
        </label>

        {error ? (
          <div className="form-error" role="alert">
            <Icon name="close" size={16} />
            {error}
          </div>
        ) : null}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Bir saniye…' : isRegister ? 'Hesabı oluştur' : 'Giriş yap'}
          {!busy ? <Icon name="arrow-right" size={18} /> : null}
        </button>
      </form>

      {!isRegister ? (
        <div className="demo-card">
          <div>
            <strong>Demo hesap</strong>
            <span>ada@demo.local · Demo1234!</span>
          </div>
          <button type="button" className="btn btn-ghost btn-xs" onClick={fillDemo}>
            Doldur
          </button>
        </div>
      ) : null}

      <p className="auth-switch">
        {isRegister ? 'Zaten hesabın var mı? ' : 'Henüz hesabın yok mu? '}
        <Link href={isRegister ? '/giris' : '/kayit'}>
          {isRegister ? 'Giriş yap' : 'Hesap oluştur'}
        </Link>
      </p>
    </>
  );
}
