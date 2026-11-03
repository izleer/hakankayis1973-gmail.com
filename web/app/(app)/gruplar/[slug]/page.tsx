import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GroupDetail } from '@/components/GroupDetail';
import { ApiError, api, requireViewer } from '@/lib/api';
import type {
  Asset,
  CursorPage,
  FeedPost,
  GroupAsset,
  GroupDetailData,
  GroupRequests,
  Paged,
} from '@/lib/types';

type Params = Promise<{ slug: string }>;

async function loadGroup(slug: string): Promise<GroupDetailData | null> {
  try {
    return await api<GroupDetailData>(`/v1/communities/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await api<GroupDetailData>(`/v1/communities/${encodeURIComponent(slug)}`);
    return {
      title: data.community.name,
      description: data.community.description ?? `${data.community.name} grubu`,
    };
  } catch {
    return { title: 'Grup' };
  }
}

export default async function GroupDetailPage({ params }: { params: Params }) {
  const viewer = await requireViewer();
  const { slug } = await params;
  const data = await loadGroup(slug);
  if (!data) notFound();

  const [feed, sharedAssets, requests, ownAssets] = await Promise.all([
    data.isMember
      ? api<CursorPage<FeedPost>>(
          `/v1/feed?community=${encodeURIComponent(slug)}&limit=30`,
        ).catch(() => ({ items: [] as FeedPost[], nextCursor: null }))
      : Promise.resolve({ items: [] as FeedPost[], nextCursor: null }),
    data.isMember
      ? api<{ items: GroupAsset[] }>(
          `/v1/communities/${encodeURIComponent(slug)}/assets`,
        ).catch(() => ({ items: [] as GroupAsset[] }))
      : Promise.resolve({ items: [] as GroupAsset[] }),
    data.canManage
      ? api<GroupRequests>(`/v1/communities/${encodeURIComponent(slug)}/requests`).catch(
          () => null,
        )
      : Promise.resolve(null),
    api<Paged<Asset>>('/v1/assets?limit=48&sort=updated').catch(() => ({
      items: [] as Asset[],
      page: 1,
      pageSize: 48,
      total: 0,
    })),
  ]);

  return (
    <GroupDetail
      data={data}
      initialPosts={feed.items}
      initialAssets={sharedAssets.items}
      initialRequests={requests}
      myAssets={ownAssets.items}
      viewer={viewer}
    />
  );
}
