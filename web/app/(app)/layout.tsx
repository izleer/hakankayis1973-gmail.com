import Script from 'next/script';
import { AppShell } from '@/components/AppShell';
import { requireViewer } from '@/lib/api';
import { adConfig } from '@/lib/ads';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireViewer();
  // Premium kullanıcılar için AdSense betiği hiç yüklenmez; reklam alanları
  // da sayfalarda oluşturulmaz.
  const ads = user.plan === 'premium' ? null : adConfig();
  return (
    <>
      <AppShell user={user}>{children}</AppShell>
      {ads ? (
        <Script
          id="adsbygoogle-script"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}`}
        />
      ) : null}
    </>
  );
}
