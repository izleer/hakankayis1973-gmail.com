import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db.js';
import { assetSelect } from '../lib/asset-select.js';
import { parseQuery } from '../lib/http.js';
import { hydratePosts, postSelect } from '../lib/posts.js';
import { requireViewer } from '../lib/session.js';
import { mapAsset, mapCommunity, mapUserMini } from '../lib/serialize.js';

const searchQuery = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (req) => {
    const viewer = await requireViewer(req);
    const params = parseQuery(searchQuery, req.query);
    const pattern = `%${params.q}%`;
    const limit = params.limit;

    const [users, assets, communities, posts] = await Promise.all([
      query<Record<string, any>>(
        `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
                (SELECT count(*) FROM follows f WHERE f.following_id = u.id) AS follower_count
         FROM users u
         WHERE u.deleted_at IS NULL
           AND (u.username ILIKE $1 OR u.display_name ILIKE $1)
           AND NOT EXISTS (
             SELECT 1 FROM blocks b
             WHERE (b.blocker_id = $2 AND b.blocked_id = u.id)
                OR (b.blocker_id = u.id AND b.blocked_id = $2)
           )
         ORDER BY follower_count DESC
         LIMIT $3`,
        [pattern, viewer.id, limit],
      ),
      query<Record<string, any>>(
        `${assetSelect}
         WHERE a.deleted_at IS NULL AND a.status = 'active'
           AND (a.title ILIKE $1 OR a.description ILIKE $1)
           AND (a.visibility = 'public' OR a.owner_id = $2)
         ORDER BY a.updated_at DESC
         LIMIT $3`,
        [pattern, viewer.id, limit],
      ),
      query<Record<string, any>>(
        `SELECT c.*, u.username AS owner_username, u.display_name AS owner_display_name,
                u.avatar_url AS owner_avatar_url,
                (SELECT count(*) FROM memberships m WHERE m.community_id = c.id) AS member_count,
                (SELECT count(*) FROM posts p
                 WHERE p.community_id = c.id AND p.status = 'visible') AS post_count,
                (SELECT role FROM memberships m WHERE m.community_id = c.id AND m.user_id = $2) AS role
         FROM communities c
         JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
         WHERE c.deleted_at IS NULL
           AND (c.name ILIKE $1 OR c.description ILIKE $1)
           AND (c.visibility = 'public'
                OR EXISTS (SELECT 1 FROM memberships m WHERE m.community_id = c.id AND m.user_id = $2))
         ORDER BY member_count DESC
         LIMIT $3`,
        [pattern, viewer.id, limit],
      ),
      query<Record<string, any>>(
        `${postSelect}
         WHERE p.status = 'visible' AND p.audience = 'public'
           AND (p.body ILIKE $2 OR a.title ILIKE $2 OR u.display_name ILIKE $2)
           AND (a.id IS NULL OR a.visibility = 'public')
           AND NOT EXISTS (
             SELECT 1 FROM blocks b
             WHERE (b.blocker_id = $1 AND b.blocked_id = p.author_id)
                OR (b.blocker_id = p.author_id AND b.blocked_id = $1)
           )
         ORDER BY p.created_at DESC
         LIMIT $3`,
        [viewer.id, pattern, limit],
      ),
    ]);

    return {
      data: {
        query: params.q,
        users: users.map((row) => ({
          ...mapUserMini(row),
          bio: row.bio,
          followerCount: Number(row.follower_count),
        })),
        assets: await Promise.all(assets.map((row) => mapAsset(row, req.locale))),
        communities: communities.map((row) => mapCommunity(row)),
        posts: await hydratePosts(posts, req.locale),
      },
    };
  });
}
