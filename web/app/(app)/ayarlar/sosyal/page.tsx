import type { Metadata } from 'next';
import Link from 'next/link';
import { api, requireViewer } from '@/lib/api';
import type { SocialConnectionsResponse } from '@/lib/types';
import { SocialSettings } from '@/components/SocialSettings';

type SearchParams = Promise<{ social?: string; reason?: string; accounts?: string }>;

export const metadata: Metadata = {
  title: 'Sosyal hesaplar',
};

export default async function SocialSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireViewer();
  const params = await searchParams;

  let initial: SocialConnectionsResponse | null = null;
  try {
    initial = await api<SocialConnectionsResponse>('/v1/social/connections');
  } catch {
    initial = null;
  }

  return (
    <main className="page page-social">
      <Link href="/profil" className="back-link">
        Profil
      </Link>

      <header className="page-head">
        <span className="eyebrow">BAĞLANTILAR</span>
        <h1>Sosyal hesaplar</h1>
        <p>
          Varlıklarını Facebook Sayfanda ve Instagram Business hesabında gönderi,
          hikâye veya Reels olarak paylaş. Varlık sahipliğin ve gizlilik ayarların
          değişmez; yalnızca seçtiğin anı dışarı taşırsın.
        </p>
      </header>

      <SocialSettings
        initial={initial}
        result={{
          social: params.social ?? null,
          reason: params.reason ?? null,
          accounts: params.accounts ? Number(params.accounts) : null,
        }}
      />
    </main>
  );
}
