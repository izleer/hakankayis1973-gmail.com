import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AssetDetail } from '@/components/AssetDetail';
import { ApiError, api, requireViewer } from '@/lib/api';
import { loadAttributeLabels } from '@/lib/asset-types';
import { getT } from '@/lib/i18n/server';
import type {
  AssetDetailData,
  Group,
  Measurement,
  Paged,
  SocialConnectionsResponse,
} from '@/lib/types';

type Params = Promise<{ id: string }>;

async function loadAsset(
  id: string,
): Promise<{ data: AssetDetailData; measurements: Measurement[] } | null> {
  try {
    const data = await api<AssetDetailData>(`/v1/assets/${id}`);
    const measurements = await api<{ items: Measurement[] }>(
      `/v1/assets/${id}/measurements`,
    ).catch(() => ({ items: [] as Measurement[] }));
    return { data, measurements: measurements.items };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getT();
  const { id } = await params;
  try {
    const data = await api<AssetDetailData>(`/v1/assets/${id}`);
    return {
      title: data.asset.title,
      description:
        data.asset.description ?? t('{type} hafızası', { type: data.asset.type.label }),
    };
  } catch {
    return { title: t('Varlık') };
  }
}

export default async function AssetDetailPage({ params }: { params: Params }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const loaded = await loadAsset(id);
  if (!loaded) notFound();
  const attributeLabels = await loadAttributeLabels(loaded.data.asset.type.id);
  const [socialEnabled, myGroups] = await Promise.all([
    api<SocialConnectionsResponse>('/v1/social/connections')
      .then((response) => Boolean(response.config?.configured))
      .catch(() => false),
    // Ortak yönetim yalnızca özel gruplara atanabildiği için yalnızca onları
    // sahibine sun. Liste yalnızca varlık sahibi için gerekli.
    loaded.data.access.isOwner
      ? api<Paged<Group>>('/v1/communities?mine=true&limit=48')
          .then((response) => response.items.filter((group) => group.visibility === 'private'))
          .catch(() => [] as Group[])
      : Promise.resolve([] as Group[]),
  ]);

  return (
    <AssetDetail
      data={loaded.data}
      measurements={loaded.measurements}
      viewer={viewer}
      attributeLabels={attributeLabels}
      socialEnabled={socialEnabled}
      groups={myGroups}
    />
  );
}
