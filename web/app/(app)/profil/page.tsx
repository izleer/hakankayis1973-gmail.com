import type { Metadata } from 'next';
import { ProfileScreen } from '@/components/ProfileScreen';
import { api, requireViewer } from '@/lib/api';
import type { CursorPage, FeedPost, ProfileData } from '@/lib/types';

export const metadata: Metadata = { title: 'Profil' };

export default async function OwnProfilePage() {
  const viewer = await requireViewer();
  const [profile, feed] = await Promise.all([
    api<ProfileData>(`/v1/users/${viewer.username}`),
    api<CursorPage<FeedPost>>('/v1/feed?scope=home&limit=40'),
  ]);

  const posts = feed.items.filter((post) => post.author.id === viewer.id);

  return <ProfileScreen user={profile.user} assets={profile.assets} posts={posts} />;
}
