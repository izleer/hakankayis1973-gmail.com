import type { Metadata } from 'next';
import Link from 'next/link';
import { api, requireViewer } from '@/lib/api';
import { getI18n } from '@/lib/i18n/server';
import type { SocialConnectionsResponse } from '@/lib/types';
import { SocialSettings } from '@/components/SocialSettings';

type SearchParams = Promise<{ social?: string; reason?: string; accounts?: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Sosyal hesaplar') };
}

export default async function SocialSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireViewer();
  const { t } = await getI18n();
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
        {t('Profil')}
      </Link>

      <header className="page-head">
        <span className="eyebrow">{t('BAĞLANTILAR')}</span>
        <h1>{t('Sosyal hesaplar')}</h1>
        <p>
          {t(
            'Varlıklarını Facebook Sayfanda ve Instagram Business hesabında gönderi, hikâye veya Reels olarak paylaş. Varlık sahipliğin ve gizlilik ayarların değişmez; yalnızca seçtiğin anı dışarı taşırsın.',
          )}
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
