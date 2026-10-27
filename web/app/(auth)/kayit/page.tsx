import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Hesap oluştur' };

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="auth-photo" style={{ backgroundImage: "url('/files/seed/luna.jpg')" }} />
        <div className="auth-visual-shade" />
        <div className="auth-visual-content">
          <span className="eyebrow eyebrow-light">Yeni bir hafıza</span>
          <blockquote>
            “Birlikte geçen zaman,
            <br />
            kayıt altına alınınca görünür.”
          </blockquote>
          <p>
            İlk varlığını ekle, ilk fotoğrafı yükle ve değişimi yıllar sonra
            yan yana gör.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <AuthForm mode="register" />
        </div>
      </section>
    </main>
  );
}
