import { queryOne } from '../db.js';
import { notFound } from './errors.js';
import type { Visibility } from './access.js';

export type GroupAssetScope = 'summary' | 'timeline' | 'all';

export type GroupAssetRow = {
  id: string;
  community_id: string;
  asset_id: string;
  added_by_user_id: string;
  visibility_scope: GroupAssetScope;
  status: 'active' | 'removed';
  shared_at: Date;
};

export async function getGroupAsset(
  communityId: string,
  assetId: string,
): Promise<GroupAssetRow | null> {
  return queryOne<GroupAssetRow>(
    `SELECT id, community_id, asset_id, added_by_user_id, visibility_scope, status, shared_at
     FROM group_assets
     WHERE community_id = $1 AND asset_id = $2`,
    [communityId, assetId],
  );
}

export async function requireActiveGroupAsset(
  communityId: string,
  assetId: string,
): Promise<GroupAssetRow> {
  const row = await getGroupAsset(communityId, assetId);
  if (!row || row.status !== 'active') notFound('Bu varlık gruba eklenmemiş.');
  return row;
}

/**
 * Grup üyesinin paylaşılan varlığın bir kaydını görebilmesi için hem paylaşım
 * kapsamı hem de kaydın kendi görünürlüğü birlikte değerlendirilir.
 * - summary: yalnızca varlık özeti
 * - timeline: herkese açık kayıtlar
 * - all: sahibinin açıkça paylaştığı tüm kayıtlar
 */
export function groupScopeAllowsEntry(
  scope: GroupAssetScope,
  entryVisibility: Visibility,
): boolean {
  if (scope === 'summary') return false;
  if (scope === 'all') return true;
  return entryVisibility === 'public';
}

export function groupScopeLabel(scope: GroupAssetScope): string {
  if (scope === 'summary') return 'Yalnızca özet';
  if (scope === 'timeline') return 'Herkese açık kayıtlar';
  return 'Tüm hikâye';
}
