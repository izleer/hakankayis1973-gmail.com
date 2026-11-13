import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../db.js';
import { iso } from '../lib/http.js';
import { requireViewer } from '../lib/session.js';
import { mapEntry, mediaForEntries } from '../lib/serialize.js';
import { mediaRefUrl } from '../lib/storage.js';
import { translateTypeLabel } from '../lib/taxonomy.js';

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  // Paneldeki grup özeti: üyenin grupları ve son ziyaretinden bu yana
  // okunmamış akış ile eklenen/çıkarılan varlık sayıları.
  app.get('/groups', async (req) => {
    const viewer = await requireViewer(req);

    const rows = await query<Record<string, any>>(
      `SELECT * FROM (
         SELECT c.id, c.slug, c.name, c.cover_url, m.last_seen_at,
                (SELECT count(*) FROM memberships mm
                 WHERE mm.community_id = c.id AND mm.status = 'active') AS member_count,
                (SELECT count(*) FROM posts p
                 WHERE p.community_id = c.id AND p.status = 'visible'
                   AND p.author_id <> $1
                   AND p.created_at > m.last_seen_at
                   AND NOT EXISTS (
                     SELECT 1 FROM blocks b
                     WHERE (b.blocker_id = $1 AND b.blocked_id = p.author_id)
                        OR (b.blocker_id = p.author_id AND b.blocked_id = $1)
                   )) AS unread_posts,
                (SELECT count(*) FROM group_assets ga
                 WHERE ga.community_id = c.id AND ga.status = 'active'
                   AND ga.shared_at > m.last_seen_at) AS added_assets,
                (SELECT count(*) FROM group_assets ga
                 WHERE ga.community_id = c.id AND ga.status = 'removed'
                   AND ga.removed_at > m.last_seen_at) AS removed_assets
         FROM memberships m
         JOIN communities c ON c.id = m.community_id AND c.deleted_at IS NULL
         WHERE m.user_id = $1 AND m.status = 'active'
       ) s
       ORDER BY (s.unread_posts + s.added_assets + s.removed_assets) DESC,
                s.name ASC
       LIMIT 50`,
      [viewer.id],
    );

    return {
      data: {
        total: rows.length,
        items: rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          coverUrl: mediaRefUrl(row.cover_url),
          memberCount: Number(row.member_count ?? 0),
          lastSeenAt: iso(row.last_seen_at),
          unreadPosts: Number(row.unread_posts ?? 0),
          addedAssets: Number(row.added_assets ?? 0),
          removedAssets: Number(row.removed_assets ?? 0),
        })),
      },
    };
  });

  app.get('/', async (req) => {
    const viewer = await requireViewer(req);

    const counts = await queryOne<Record<string, string>>(
      `SELECT
         (SELECT count(*) FROM assets
          WHERE owner_id = $1 AND deleted_at IS NULL) AS assets,
         (SELECT count(*) FROM assets
          WHERE owner_id = $1 AND deleted_at IS NULL AND status = 'archived') AS archived_assets,
         (SELECT count(*) FROM assets
          WHERE owner_id = $1 AND deleted_at IS NULL AND visibility = 'public') AS public_assets,
         (SELECT count(*) FROM journal_entries je
          JOIN assets a ON a.id = je.asset_id AND a.deleted_at IS NULL
          WHERE a.owner_id = $1 AND je.deleted_at IS NULL) AS entries,
         (SELECT count(*) FROM media m
          JOIN assets a ON a.id = m.asset_id AND a.deleted_at IS NULL
          WHERE a.owner_id = $1 AND m.status = 'ready') AS media,
         (SELECT count(*) FROM media m
          JOIN assets a ON a.id = m.asset_id AND a.deleted_at IS NULL
          WHERE a.owner_id = $1 AND m.status = 'ready' AND m.kind = 'image') AS images,
         (SELECT count(*) FROM media m
          JOIN assets a ON a.id = m.asset_id AND a.deleted_at IS NULL
          WHERE a.owner_id = $1 AND m.status = 'ready' AND m.kind = 'document') AS documents,
         (SELECT count(*) FROM media m
          JOIN assets a ON a.id = m.asset_id AND a.deleted_at IS NULL
          WHERE a.owner_id = $1 AND m.status = 'ready' AND m.kind = 'video') AS videos,
         (SELECT count(*) FROM assets a
          WHERE a.owner_id <> $1 AND a.deleted_at IS NULL AND a.status = 'active'
            AND (
              (a.visibility = 'selected' AND EXISTS (
                SELECT 1 FROM access_rules ar
                WHERE ar.resource_type = 'asset' AND ar.resource_id = a.id AND ar.user_id = $1
              ))
              OR (a.visibility = 'friends' AND EXISTS (
                SELECT 1 FROM friendships f
                WHERE f.status = 'accepted'
                  AND ((f.requester_id = $1 AND f.addressee_id = a.owner_id)
                    OR (f.requester_id = a.owner_id AND f.addressee_id = $1))
              ))
            )
            AND NOT EXISTS (
              SELECT 1 FROM blocks b
              WHERE (b.blocker_id = $1 AND b.blocked_id = a.owner_id)
                 OR (b.blocker_id = a.owner_id AND b.blocked_id = $1)
            )) AS shared_with_me,
         (SELECT count(*) FROM follows f WHERE f.following_id = $1) AS followers,
         (SELECT count(*) FROM follows f WHERE f.follower_id = $1) AS following`,
      [viewer.id],
    );

    const entryRows = await query<Record<string, any>>(
      `SELECT je.*, u.username AS author_username, u.display_name AS author_display_name,
              u.avatar_url AS author_avatar_url,
              a.title AS asset_title, a.type_id AS asset_type_id,
              t.label AS asset_type_label
       FROM journal_entries je
       JOIN assets a ON a.id = je.asset_id AND a.deleted_at IS NULL
       JOIN asset_types t ON t.id = a.type_id
       JOIN users u ON u.id = je.author_id AND u.deleted_at IS NULL
       WHERE a.owner_id = $1 AND je.deleted_at IS NULL
       ORDER BY je.occurred_at DESC, je.id DESC
       LIMIT 6`,
      [viewer.id],
    );
    const media = await mediaForEntries(entryRows.map((row) => row.id));
    const recentEntries = await Promise.all(
      entryRows.map(async (row) => ({
        ...(await mapEntry(row, media.get(row.id) ?? [])),
        asset: {
          id: row.asset_id,
          title: row.asset_title,
          typeId: row.asset_type_id,
          typeLabel: translateTypeLabel(req.locale, row.asset_type_label),
        },
      })),
    );

    return {
      data: {
        assets: Number(counts?.assets ?? 0),
        archivedAssets: Number(counts?.archived_assets ?? 0),
        publicAssets: Number(counts?.public_assets ?? 0),
        entries: Number(counts?.entries ?? 0),
        media: Number(counts?.media ?? 0),
        images: Number(counts?.images ?? 0),
        documents: Number(counts?.documents ?? 0),
        videos: Number(counts?.videos ?? 0),
        sharedWithMe: Number(counts?.shared_with_me ?? 0),
        followers: Number(counts?.followers ?? 0),
        following: Number(counts?.following ?? 0),
        recentEntries,
      },
    };
  });
}
