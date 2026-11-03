import { query } from '../db.js';
import { isStaff, postIsVisibleTo } from './access.js';
import { forbidden, notFound } from './errors.js';
import { getGroupAsset, groupScopeAllowsEntry } from './groups.js';
import { mapPost, mediaForPosts } from './serialize.js';
import type { Viewer } from './session.js';

export const postSelect = `
  SELECT p.*,
         u.username AS author_username, u.display_name AS author_display_name,
         u.avatar_url AS author_avatar_url,
         a.title AS asset_title, a.visibility AS asset_visibility, a.owner_id AS asset_owner,
         a.cover_url AS asset_cover_url, acm.storage_key AS asset_cover_storage_key,
         at.label AS asset_type_label,
         je.title AS entry_title, je.type AS entry_type, je.occurred_at AS entry_occurred_at,
         je.visibility AS entry_visibility,
         c.slug AS community_slug, c.name AS community_name,
         (SELECT count(*) FROM likes l WHERE l.post_id = p.id)::int AS like_count,
         (SELECT count(*) FROM comments cm
          WHERE cm.post_id = p.id AND cm.deleted_at IS NULL AND cm.status = 'visible')::int AS comment_count,
         EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1::uuid) AS liked_by_me
  FROM posts p
  JOIN users u ON u.id = p.author_id AND u.deleted_at IS NULL
  LEFT JOIN assets a ON a.id = p.asset_id AND a.deleted_at IS NULL
  LEFT JOIN media acm ON acm.id = a.cover_media_id
  LEFT JOIN asset_types at ON at.id = a.type_id
  LEFT JOIN journal_entries je ON je.id = p.entry_id AND je.deleted_at IS NULL
  LEFT JOIN communities c ON c.id = p.community_id AND c.deleted_at IS NULL
`;

export async function hydratePosts(rows: Record<string, any>[]): Promise<Record<string, unknown>[]> {
  const media = await mediaForPosts(rows.map((row) => row.id));
  return Promise.all(rows.map((row) => mapPost(row, media.get(row.id) ?? [])));
}

export async function loadPostRow(
  postId: string,
  viewerId: string | null,
): Promise<Record<string, any> | null> {
  const rows = await query<Record<string, any>>(
    `${postSelect} WHERE p.id = $2`,
    [viewerId, postId],
  );
  return rows[0] ?? null;
}

/**
 * Gönderi + bağlı varlık görünürlüğünü birlikte doğrular.
 * Herkese açık gönderi, özel bir varlığın başlığını sızdırmamalıdır.
 */
export async function getAccessiblePost(
  viewer: Viewer | null,
  postId: string,
): Promise<Record<string, any>> {
  const row = await loadPostRow(postId, viewer?.id ?? null);
  if (!row) notFound('Gönderi bulunamadı.');
  if (
    !(await postIsVisibleTo(viewer, {
      author_id: row.author_id,
      audience: row.audience,
      community_id: row.community_id,
      status: row.status,
    }))
  ) {
    forbidden('Bu gönderiyi görüntüleme yetkiniz yok.');
  }
  if (
    row.asset_id &&
    row.asset_visibility !== 'public' &&
    row.asset_owner !== viewer?.id &&
    !isStaff(viewer)
  ) {
    const shared = row.community_id
      ? await getGroupAsset(row.community_id, row.asset_id)
      : null;
    if (!shared || shared.status !== 'active') {
      forbidden('Bu gönderiye bağlı varlığı görüntüleme yetkiniz yok.');
    }
  }
  if (
    row.entry_id &&
    row.community_id &&
    row.asset_visibility !== 'public' &&
    row.asset_owner !== viewer?.id &&
    !isStaff(viewer)
  ) {
    const shared = await getGroupAsset(row.community_id, row.asset_id);
    if (
      !shared ||
      shared.status !== 'active' ||
      !groupScopeAllowsEntry(shared.visibility_scope, row.entry_visibility)
    ) {
      forbidden('Bu gönderiye bağlı kaydı görüntüleme yetkiniz yok.');
    }
  }
  return row;
}

export async function hydratePost(row: Record<string, any>): Promise<Record<string, unknown>> {
  const media = await mediaForPosts([row.id]);
  return mapPost(row, media.get(row.id) ?? []);
}
