import { ApiError, api } from './api';
import { loadAttributeLabels } from './asset-types';
import type { AssetDetailData, CursorPage, Entry, Measurement } from './types';

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

export async function loadAssetReport(id: string) {
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
