import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AssetReport } from '@/components/AssetReport';
import { ApiError, api, requireViewer } from '@/lib/api';
import { loadAttributeLabels } from '@/lib/asset-types';
import { getT } from '@/lib/i18n/server';
import type { AssetDetailData, CursorPage, Entry, Measurement } from '@/lib/types';

type Params = Promise<{ id: string }>;

const ENTRY_PAGE_SIZE = 50;
const ENTRY_PAGE_LIMIT = 4;

async function loadEntries(
  id: string,
): Promise<{ items: Entry[]; truncated: boolean }> {
  const items: Entry[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < ENTRY_PAGE_LIMIT; page += 1) {
    const query: string = cursor
      ? `?limit=${ENTRY_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`
      : `?limit=${ENTRY_PAGE_SIZE}`;
    const data: CursorPage<Entry> = await api<CursorPage<Entry>>(
      `/v1/assets/${id}/entries${query}`,
    );
    items.push(...data.items);
    cursor = data.nextCursor;
    if (!cursor) return { items, truncated: false };
  }

  return { items, truncated: true };
}

async function loadReport(id: string) {
  try {
    const data = await api<AssetDetailData>(`/v1/assets/${id}`);
    const [entries, measurements, attributeLabels] = await Promise.all([
      loadEntries(id),
      api<{ items: Measurement[] }>(`/v1/assets/${id}/measurements`).catch(() => ({
        items: [] as Measurement[],
      })),
      loadAttributeLabels(data.asset.type.id),
    ]);
    return { data, ...entries, measurements: measurements.items, attributeLabels };
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
      title: t('{title} raporu', { title: data.asset.title }),
      description: t('{type} hafızasından yazdırılabilir varlık raporu.', {
        type: data.asset.type.label,
      }),
    };
  } catch {
    return { title: t('Varlık raporu') };
  }
}

export default async function AssetReportPage({ params }: { params: Params }) {
  await requireViewer();
  const { id } = await params;
  const report = await loadReport(id);
  if (!report) notFound();

  return (
    <AssetReport
      asset={report.data.asset}
      access={report.data.access}
      entries={report.items}
      entriesTruncated={report.truncated}
      measurements={report.measurements}
      attributeLabels={report.attributeLabels}
    />
  );
}
