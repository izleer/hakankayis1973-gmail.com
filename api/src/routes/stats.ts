import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../db.js';
import { requireViewer } from '../lib/session.js';
import { mapEntry, mediaForEntries } from '../lib/serialize.js';
import { translateTypeLabel } from '../lib/taxonomy.js';

export async function statsRoutes(app: FastifyInstance): Promise<void> {
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
