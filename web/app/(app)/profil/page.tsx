import type { Metadata } from 'next';
import { ProfileScreen } from '@/components/ProfileScreen';
import { api, requireViewer } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import type {
  CursorPage,
  FeedPost,
  ProfileData,
  SocialConnectionsResponse,
} from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Profil') };
}

export default async function OwnProfilePage() {
  const viewer = await requireViewer();
  const [profile, feed, social] = await Promise.all([
    api<ProfileData>(`/v1/users/${viewer.username}`),
    api<CursorPage<FeedPost>>('/v1/feed?scope=home&limit=40'),
    api<SocialConnectionsResponse>('/v1/social/connections').catch(() => null),
  ]);

  const posts = feed.items.filter((post) => post.author.id === viewer.id);

  return (
    <ProfileScreen
      user={profile.user}
      assets={profile.assets}
      posts={posts}
      social={social}
    />
  );
}
