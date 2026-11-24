import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ProfileScreen } from '@/components/ProfileScreen';
import { ApiError, api, requireViewer } from '@/lib/api';
import { adConfig } from '@/lib/ads';
import { getT } from '@/lib/i18n/server';
import { showsAds } from '@/lib/plan';
import type { CursorPage, FeedPost, ProfileData } from '@/lib/types';

type Params = Promise<{ username: string }>;

async function loadProfile(username: string): Promise<ProfileData | null> {
  try {
    return await api<ProfileData>(`/v1/users/${encodeURIComponent(username)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getT();
  const { username } = await params;
  try {
    const data = await api<ProfileData>(`/v1/users/${encodeURIComponent(username)}`);
    return {
      title: data.user.displayName,
      description: data.user.bio ?? `${data.user.displayName} · @${data.user.username}`,
    };
  } catch {
    return { title: t('Profil') };
  }
}

export default async function UserProfilePage({ params }: { params: Params }) {
  const viewer = await requireViewer();
  const { username } = await params;
  if (username === viewer.username) redirect('/profil');

  const profile = await loadProfile(username);
  if (!profile) notFound();

  const feed = await api<CursorPage<FeedPost>>(
    `/v1/feed?scope=explore&author=${encodeURIComponent(username)}&limit=20`,
  );
  const ads = showsAds(viewer) ? adConfig() : null;

  return (
    <ProfileScreen
      user={profile.user}
      assets={profile.assets}
      posts={feed.items}
      adSlot={
        showsAds(viewer)
          ? { client: ads?.client ?? '', slot: ads?.slots.profile ?? '' }
          : null
      }
    />
  );
}
