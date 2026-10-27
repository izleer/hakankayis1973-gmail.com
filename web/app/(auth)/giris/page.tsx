import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Giriş' };

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="auth-photo" style={{ backgroundImage: "url('/files/seed/bonsai.jpg')" }} />
        <div className="auth-visual-shade" />
        <div className="auth-visual-content">
          <span className="eyebrow eyebrow-light">Varlık Hafızası</span>
          <blockquote>
            “Bir şeyi saklamak,
            <br />
            ona yeniden bakmak içindir.”
          </blockquote>
          <p>
            Bonsai, evcil hayvan, tablo, ev ya da bir çiçek… Bakımı, fotoğrafları ve
            hikâyesiyle birlikte kalsın.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <AuthForm mode="login" />
        </div>
      </section>
    </main>
  );
}
