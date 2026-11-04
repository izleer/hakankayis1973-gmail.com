import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Giriş yap') };
}

export default async function LoginPage() {
  const t = await getT();
  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="auth-photo" style={{ backgroundImage: "url('/files/seed/bonsai.jpg')" }} />
        <div className="auth-visual-shade" />
        <div className="auth-visual-content">
          <span className="eyebrow eyebrow-light eyebrow-brand">izleer</span>
          <blockquote>
            {t('Bir şeyi saklamak,')}
            <br />
            {t('ona yeniden bakmak içindir.')}
          </blockquote>
          <p>
            {t(
              'Bonsai, evcil hayvan, tablo, ev ya da bir çiçek… Bakımı, fotoğrafları ve hikâyesiyle birlikte kalsın.',
            )}
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <LocaleSwitcher className="auth-locale" />
        <div className="auth-card">
          <AuthForm mode="login" />
        </div>
      </section>
    </main>
  );
}
