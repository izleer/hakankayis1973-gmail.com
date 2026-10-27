import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AssetDetail } from '@/components/AssetDetail';
import { ApiError, api, requireViewer } from '@/lib/api';
import type { AssetDetailData, Measurement } from '@/lib/types';

type Params = Promise<{ id: string }>;

async function loadAsset(id: string): Promise<{ data: AssetDetailData; measurements: Measurement[] } | null> {
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
  const { id } = await params;
  try {
    const data = await api<AssetDetailData>(`/v1/assets/${id}`);
    return {
      title: data.asset.title,
      description: data.asset.description ?? `${data.asset.type.label} hafızası`,
    };
  } catch {
    return { title: 'Varlık' };
  }
}

export default async function AssetDetailPage({ params }: { params: Params }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const loaded = await loadAsset(id);
  if (!loaded) notFound();

  return (
    <AssetDetail
      data={loaded.data}
      measurements={loaded.measurements}
      viewer={viewer}
    />
  );
}
