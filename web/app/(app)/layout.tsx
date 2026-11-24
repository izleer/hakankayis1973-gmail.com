import Script from 'next/script';
import { AppShell } from '@/components/AppShell';
import { requireViewer } from '@/lib/api';
import { adConfig } from '@/lib/ads';
import { showsAds } from '@/lib/plan';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireViewer();
  // Ücretsiz plan dışında AdSense betiği hiç yüklenmez; reklam alanları
  // da sayfalarda oluşturulmaz.
  const ads = showsAds(user) ? adConfig() : null;
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
