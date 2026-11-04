import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Hesabı oluştur') };
}

export default async function RegisterPage() {
  const t = await getT();
  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="auth-photo" style={{ backgroundImage: "url('/files/seed/luna.jpg')" }} />
        <div className="auth-visual-shade" />
        <div className="auth-visual-content">
          <span className="eyebrow eyebrow-light">{t('Yeni bir hafıza')}</span>
          <blockquote>
            {t('Birlikte geçen zaman,')}
            <br />
            {t('kayıt altına alınınca görünür.')}
          </blockquote>
          <p>
            {t('İlk varlığını ekle, ilk fotoğrafı yükle ve değişimi yıllar sonra yan yana gör.')}
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <LocaleSwitcher className="auth-locale" />
        <div className="auth-card">
          <AuthForm mode="register" />
        </div>
      </section>
    </main>
  );
}
