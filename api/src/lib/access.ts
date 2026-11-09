import { query, queryOne } from '../db.js';
import { forbidden, notFound } from './errors.js';
import type { Viewer } from './session.js';

export type Visibility = 'private' | 'selected' | 'friends' | 'public';

export type AssetAccessRow = {
  id: string;
  owner_id: string;
  visibility: Visibility;
  status: 'active' | 'archived';
  deleted_at: Date | null;
};

export type EntryAccessRow = {
  id: string;
  asset_id: string;
  author_id: string;
  visibility: Visibility;
  deleted_at: Date | null;
};

const rank: Record<Visibility, number> = { private: 0, selected: 1, friends: 2, public: 3 };

export function visibilityRank(value: Visibility): number {
  return rank[value];
}

export function stricterVisibility(a: Visibility, b: Visibility): Visibility {
  return rank[a] <= rank[b] ? a : b;
}

export function isStaff(viewer: Viewer | null | undefined): boolean {
  return viewer?.role === 'moderator' || viewer?.role === 'admin';
}

export async function hasAccessRule(
  viewerId: string,
  resourceType: 'asset' | 'entry',
  resourceId: string,
): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    `SELECT true AS exists FROM access_rules
     WHERE resource_type = $1 AND resource_id = $2 AND user_id = $3 AND permission = 'view'
     LIMIT 1`,
    [resourceType, resourceId, viewerId],
  );
  return Boolean(row);
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const row = await queryOne<{ exists: boolean }>(
    `SELECT true AS exists FROM friendships
     WHERE status = 'accepted'
       AND ((requester_id = $1 AND addressee_id = $2)
         OR (requester_id = $2 AND addressee_id = $1))
     LIMIT 1`,
    [a, b],
  );
  return Boolean(row);
}

export async function canViewAsset(
  viewer: Viewer | null,
  asset: AssetAccessRow,
): Promise<boolean> {
  if (!viewer) return false;
  if (isStaff(viewer)) return true;
  if (asset.owner_id === viewer.id) return true;
  if (asset.deleted_at) return false;
  // Engel ilişkisi her iki yönde de doğrudan erişimi kapatır; keşfet/arama
  // sorguları zaten engelli kullanıcıları dışlar, ID ile erişim de tutarlı olmalı.
  if (await isBlocked(viewer.id, asset.owner_id)) return false;
  if (asset.visibility === 'public') return true;
  if (asset.visibility === 'selected') {
    return hasAccessRule(viewer.id, 'asset', asset.id);
  }
  if (asset.visibility === 'friends') {
    return areFriends(viewer.id, asset.owner_id);
  }
  return false;
}

export async function canViewEntry(
  viewer: Viewer | null,
  entry: EntryAccessRow,
  asset: AssetAccessRow,
): Promise<boolean> {
  if (!viewer) return false;
  if (isStaff(viewer)) return true;
  if (entry.deleted_at) return false;
  if (asset.owner_id === viewer.id || entry.author_id === viewer.id) return true;
  if (!(await canViewAsset(viewer, asset))) return false;

  if (entry.visibility === 'public') return true;
  if (entry.visibility === 'friends') {
    // Engel kontrolü canViewAsset içinde zaten yapıldı.
    return areFriends(viewer.id, asset.owner_id);
  }
  if (entry.visibility === 'selected') {
    if (await hasAccessRule(viewer.id, 'entry', entry.id)) return true;
    return hasAccessRule(viewer.id, 'asset', asset.id);
  }
  return false;
}

/**
 * `canViewEntry()` ile aynı görünürlük kurallarını SQL'e taşır.
 *
 * Liste sorgularında kayıtları veritabanında filtrelemek için kullanılır.
 * Parametre adları `$1` gibi yer tutuculardır; `entryAlias` ile kayıt
 * tablosunun alias'ı değiştirilebilir.
 *
 * ÖNEMLİ: Buradaki kurallar `canViewEntry()` ile birlikte güncellenmelidir.
 */
export function entryVisibilitySql(options: {
  isOwnerParam: string;
  staffParam: string;
  viewerParam: string;
  ownerParam: string;
  entryAlias?: string;
}): string {
  const entry = options.entryAlias ?? 'je';
  const { isOwnerParam, staffParam, viewerParam, ownerParam } = options;

  return `(
    ${isOwnerParam}::boolean
    OR ${staffParam}::boolean
    OR ${entry}.author_id = ${viewerParam}
    OR ${entry}.visibility = 'public'
    OR (${entry}.visibility = 'selected' AND (
      EXISTS (
        SELECT 1 FROM access_rules ar
        WHERE ar.resource_type = 'entry' AND ar.resource_id = ${entry}.id
          AND ar.user_id = ${viewerParam}
      )
      OR EXISTS (
        SELECT 1 FROM access_rules ar
        WHERE ar.resource_type = 'asset' AND ar.resource_id = ${entry}.asset_id
          AND ar.user_id = ${viewerParam}
      )
    ))
    OR (${entry}.visibility = 'friends'
      AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = ${viewerParam} AND b.blocked_id = ${ownerParam})
           OR (b.blocker_id = ${ownerParam} AND b.blocked_id = ${viewerParam})
      )
      AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = ${viewerParam} AND f.addressee_id = ${ownerParam})
            OR (f.requester_id = ${ownerParam} AND f.addressee_id = ${viewerParam}))
      ))
  )`;
}

export async function getAsset(assetId: string): Promise<AssetAccessRow> {
  const row = await queryOne<AssetAccessRow>(
    `SELECT id, owner_id, visibility, status, deleted_at FROM assets WHERE id = $1`,
    [assetId],
  );
  if (!row) notFound('Varlık bulunamadı.');
  return row;
}

export async function requireViewableAsset(
  viewer: Viewer | null,
  assetId: string,
): Promise<AssetAccessRow> {
  const asset = await getAsset(assetId);
  if (asset.deleted_at) notFound('Varlık bulunamadı.');
  if (!(await canViewAsset(viewer, asset))) {
    forbidden('Bu varlık sizinle paylaşılmamış.');
  }
  return asset;
}

export async function requireEditableAsset(viewer: Viewer, assetId: string): Promise<AssetAccessRow> {
  const asset = await getAsset(assetId);
  if (asset.deleted_at) notFound('Varlık bulunamadı.');
  if (asset.owner_id !== viewer.id && viewer.role !== 'admin') {
    forbidden('Yalnızca varlık sahibi bu işlemi yapabilir.');
  }
  return asset;
}

export async function isBlocked(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const row = await queryOne<{ exists: boolean }>(
    `SELECT true AS exists FROM blocks
     WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [a, b],
  );
  return Boolean(row);
}

export async function assertNotBlocked(a: string, b: string): Promise<void> {
  if (await isBlocked(a, b)) {
    forbidden('Bu kullanıcıyla etkileşim kurulamıyor.');
  }
}

export async function postIsVisibleTo(
  viewer: Viewer | null,
  post: {
    author_id: string;
    audience: 'public' | 'community';
    community_id: string | null;
    status: 'visible' | 'hidden' | 'deleted';
  },
): Promise<boolean> {
  if (post.status !== 'visible') return isStaff(viewer);
  if (!viewer) return false;
  if (isStaff(viewer)) return true;
  if (post.author_id === viewer.id) return true;
  if (await isBlocked(viewer.id, post.author_id)) return false;
  if (post.audience === 'public') return true;
  if (!post.community_id) return false;

  // Grup içeriği yalnızca etkin üyelere açıktır. Grubun herkese açık olması
  // yalnızca keşfedilebilirliği belirler, gönderileri herkese açmaz.
  const community = await queryOne<{ is_member: boolean }>(
    `SELECT EXISTS (
              SELECT 1 FROM memberships m
              WHERE m.community_id = c.id AND m.user_id = $2 AND m.status = 'active'
            ) AS is_member
     FROM communities c
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [post.community_id, viewer.id],
  );
  return Boolean(community?.is_member);
}

export async function assertPostVisible(
  viewer: Viewer | null,
  postId: string,
): Promise<void> {
  const post = await queryOne<{
    id: string;
    author_id: string;
    audience: 'public' | 'community';
    community_id: string | null;
    status: 'visible' | 'hidden' | 'deleted';
  }>(`SELECT id, author_id, audience, community_id, status FROM posts WHERE id = $1`, [postId]);
  if (!post) notFound('Gönderi bulunamadı.');
  if (!(await postIsVisibleTo(viewer, post))) forbidden('Bu gönderiyi görüntüleme yetkiniz yok.');
}

export type CommunityRole = 'member' | 'moderator' | 'admin' | 'owner';

export async function communityRole(
  communityId: string,
  userId: string,
): Promise<CommunityRole | null> {
  const row = await queryOne<{ role: CommunityRole }>(
    `SELECT role FROM memberships
     WHERE community_id = $1 AND user_id = $2 AND status = 'active'`,
    [communityId, userId],
  );
  return row?.role ?? null;
}

export async function requireMembership(communityId: string, userId: string): Promise<void> {
  const row = await queryOne<{ exists: boolean }>(
    `SELECT true AS exists FROM memberships
     WHERE community_id = $1 AND user_id = $2 AND status = 'active'`,
    [communityId, userId],
  );
  if (!row) forbidden('Bu topluluğa katılmanız gerekiyor.');
}

export function canManageCommunity(role: CommunityRole | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'moderator';
}
