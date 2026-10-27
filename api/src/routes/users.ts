import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne, transaction } from '../db.js';
import { assertNotBlocked, isBlocked, isStaff } from '../lib/access.js';
import { assetSelect } from '../lib/asset-select.js';
import { audit } from '../lib/audit.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { iso, parseBody, parseQuery } from '../lib/http.js';
import { notify } from '../lib/notify.js';
import { optionalViewer, requireViewer, type Viewer } from '../lib/session.js';
import { mapAsset, mapUser, mapUserMini } from '../lib/serialize.js';
import { revokeAllSessions } from '../lib/session.js';

const usernameParam = z.object({ username: z.string().trim().min(1).max(30) });

async function findUser(username: string) {
  const row = await queryOne<Record<string, any>>(
    `SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL`,
    [username],
  );
  if (!row) notFound('Kullanıcı bulunamadı.');
  return row;
}

async function profileStats(userId: string, viewer: Viewer | null) {
  const own = viewer?.id === userId || isStaff(viewer);
  const assetVisibility = own ? '' : `AND visibility = 'public'`;
  const entryVisibility = own ? '' : `AND je.visibility = 'public'`;
  const postVisibility = own ? `p.status = 'visible'` : `p.status = 'visible' AND p.audience = 'public'`;

  const stats = await queryOne<{
    asset_count: string;
    entry_count: string;
    post_count: string;
    follower_count: string;
    following_count: string;
  }>(
    `SELECT
       (SELECT count(*) FROM assets a WHERE a.owner_id = $1 AND a.deleted_at IS NULL ${assetVisibility}) AS asset_count,
       (SELECT count(*) FROM journal_entries je
        JOIN assets a ON a.id = je.asset_id AND a.deleted_at IS NULL
        WHERE a.owner_id = $1 AND je.deleted_at IS NULL ${entryVisibility}) AS entry_count,
       (SELECT count(*) FROM posts p WHERE p.author_id = $1 AND ${postVisibility}) AS post_count,
       (SELECT count(*) FROM follows f WHERE f.following_id = $1) AS follower_count,
       (SELECT count(*) FROM follows f WHERE f.follower_id = $1) AS following_count`,
    [userId],
  );
  return {
    assets: Number(stats?.asset_count ?? 0),
    entries: Number(stats?.entry_count ?? 0),
    posts: Number(stats?.post_count ?? 0),
    followers: Number(stats?.follower_count ?? 0),
    following: Number(stats?.following_count ?? 0),
  };
}

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users/suggestions', async (req) => {
    const viewer = await requireViewer(req);
    const rows = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
              (SELECT count(*) FROM follows f WHERE f.following_id = u.id) AS follower_count,
              EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id) AS is_following
       FROM users u
       WHERE u.deleted_at IS NULL AND u.id <> $1
         AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id)
         AND NOT EXISTS (
           SELECT 1 FROM blocks b
           WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
              OR (b.blocker_id = u.id AND b.blocked_id = $1)
         )
       ORDER BY follower_count DESC, u.created_at ASC
       LIMIT 8`,
      [viewer.id],
    );
    return {
      data: {
        items: rows.map((row) => ({
          ...mapUserMini(row),
          bio: row.bio,
          followerCount: Number(row.follower_count),
          isFollowing: Boolean(row.is_following),
        })),
      },
    };
  });

  app.get('/users/:username', async (req) => {
    const viewer = await optionalViewer(req);
    const { username } = usernameParam.parse(req.params);
    const row = await findUser(username);
    const isSelf = viewer?.id === row.id;
    const staff = isStaff(viewer);

    const [stats, following, blockedByMe, blockedMe, assetRows] = await Promise.all([
      profileStats(row.id, viewer),
      viewer
        ? queryOne<{ exists: boolean }>(
            `SELECT true AS exists FROM follows WHERE follower_id = $1 AND following_id = $2`,
            [viewer.id, row.id],
          )
        : Promise.resolve(null),
      viewer ? isBlocked(viewer.id, row.id) : Promise.resolve(false),
      viewer
        ? queryOne<{ exists: boolean }>(
            `SELECT true AS exists FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
            [row.id, viewer.id],
          )
        : Promise.resolve(null),
      query<Record<string, any>>(
        `${assetSelect}
         WHERE a.owner_id = $1 AND a.deleted_at IS NULL AND a.status = 'active'
           AND ($2::boolean OR a.visibility = 'public')
         ORDER BY a.updated_at DESC LIMIT 8`,
        [row.id, isSelf || staff],
      ),
    ]);

    return {
      data: {
        user: {
          ...mapUser(row),
          email: isSelf ? row.email : undefined,
          stats,
          isFollowing: Boolean(following),
          isBlocked: blockedByMe,
          blockedBy: Boolean(blockedMe),
          isSelf,
        },
        assets: await Promise.all(assetRows.map((asset) => mapAsset(asset))),
      },
    };
  });

  app.get('/users/:username/assets', async (req) => {
    const viewer = await optionalViewer(req);
    const { username } = usernameParam.parse(req.params);
    const user = await findUser(username);
    const params = parseQuery(
      z.object({
        q: z.string().trim().max(120).optional(),
        type: z.string().trim().max(60).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(48).default(12),
      }),
      req.query,
    );
    const own = viewer?.id === user.id || isStaff(viewer);
    const offset = (params.page - 1) * params.limit;
    const sqlParams: unknown[] = [user.id, own];
    const clauses = [
      'a.owner_id = $1',
      'a.deleted_at IS NULL',
      'a.status = \'active\'',
      '($2::boolean OR a.visibility = \'public\')',
    ];
    let index = 3;
    if (params.q) {
      clauses.push(`(a.title ILIKE $${index} OR a.description ILIKE $${index})`);
      sqlParams.push(`%${params.q}%`);
      index += 1;
    }
    if (params.type) {
      clauses.push(`(a.type_id = $${index} OR t.parent_id = $${index})`);
      sqlParams.push(params.type);
      index += 1;
    }
    const rows = await query<Record<string, any>>(
      `${assetSelect} WHERE ${clauses.join(' AND ')}
       ORDER BY a.updated_at DESC, a.id DESC
       LIMIT $${index} OFFSET $${index + 1}`,
      [...sqlParams, params.limit, offset],
    );
    const total = await queryOne<{ count: string }>(
      `SELECT count(*) FROM assets a JOIN asset_types t ON t.id = a.type_id
       WHERE ${clauses.join(' AND ')}`,
      sqlParams,
    );
    return {
      data: {
        items: await Promise.all(rows.map((asset) => mapAsset(asset))),
        page: params.page,
        pageSize: params.limit,
        total: Number(total?.count ?? 0),
      },
    };
  });

  app.post('/users/:username/follow', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { username } = usernameParam.parse(req.params);
    const target = await findUser(username);
    if (target.id === viewer.id) conflict('Kendinizi takip edemezsiniz.');
    await assertNotBlocked(viewer.id, target.id);

    const inserted = await query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING following_id`,
      [viewer.id, target.id],
    );
    if (inserted.length > 0) {
      await notify({
        userId: target.id,
        actorId: viewer.id,
        type: 'follow',
        entityType: 'user',
        entityId: viewer.id,
        message: `${viewer.displayName} seni takip etmeye başladı.`,
      });
      await audit(viewer.id, 'user.followed', 'user', target.id, {}, req.ip);
    }
    return reply.status(201).send({ data: { following: true } });
  });

  app.delete('/users/:username/follow', async (req) => {
    const viewer = await requireViewer(req);
    const { username } = usernameParam.parse(req.params);
    const target = await findUser(username);
    await query(`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`, [
      viewer.id,
      target.id,
    ]);
    await audit(viewer.id, 'user.unfollowed', 'user', target.id, {}, req.ip);
    return { data: { following: false } };
  });

  app.get('/users/:username/followers', async (req) => {
    const viewer = await optionalViewer(req);
    const { username } = usernameParam.parse(req.params);
    const user = await findUser(username);
    const params = parseQuery(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(48).default(20),
      }),
      req.query,
    );
    const offset = (params.page - 1) * params.limit;
    const rows = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, f.created_at,
              EXISTS (SELECT 1 FROM follows f2 WHERE f2.follower_id = $3 AND f2.following_id = u.id) AS is_following
       FROM follows f JOIN users u ON u.id = f.follower_id AND u.deleted_at IS NULL
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC LIMIT $2 OFFSET $4`,
      [user.id, params.limit, viewer?.id ?? '00000000-0000-0000-0000-000000000000', offset],
    );
    return {
      data: {
        items: rows.map((row) => ({
          ...mapUserMini(row),
          bio: row.bio,
          followedAt: iso(row.created_at),
          isFollowing: Boolean(row.is_following),
        })),
      },
    };
  });

  app.get('/users/:username/following', async (req) => {
    const viewer = await optionalViewer(req);
    const { username } = usernameParam.parse(req.params);
    const user = await findUser(username);
    const params = parseQuery(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(48).default(20),
      }),
      req.query,
    );
    const offset = (params.page - 1) * params.limit;
    const rows = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, f.created_at,
              EXISTS (SELECT 1 FROM follows f2 WHERE f2.follower_id = $3 AND f2.following_id = u.id) AS is_following
       FROM follows f JOIN users u ON u.id = f.following_id AND u.deleted_at IS NULL
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC LIMIT $2 OFFSET $4`,
      [user.id, params.limit, viewer?.id ?? '00000000-0000-0000-0000-000000000000', offset],
    );
    return {
      data: {
        items: rows.map((row) => ({
          ...mapUserMini(row),
          bio: row.bio,
          followedAt: iso(row.created_at),
          isFollowing: Boolean(row.is_following),
        })),
      },
    };
  });

  app.get('/me/summary', async (req) => {
    const viewer = await requireViewer(req);
    const stats = await profileStats(viewer.id, viewer);
    const unread = await queryOne<{ count: string }>(
      `SELECT count(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [viewer.id],
    );
    const assets = await query<Record<string, any>>(
      `${assetSelect} WHERE a.owner_id = $1 AND a.deleted_at IS NULL
       ORDER BY a.updated_at DESC LIMIT 4`,
      [viewer.id],
    );
    return {
      data: {
        stats: { ...stats, unreadNotifications: Number(unread?.count ?? 0) },
        recentAssets: await Promise.all(assets.map((asset) => mapAsset(asset))),
      },
    };
  });

  app.patch('/me', async (req) => {
    const viewer = await requireViewer(req);
    const body = parseBody(
      z.object({
        displayName: z.string().trim().min(1).max(80).optional(),
        bio: z.string().trim().max(500).optional().nullable(),
        avatarUrl: z.string().url().max(500).optional().nullable(),
        interests: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
        onboarded: z.boolean().optional(),
      }),
      req.body,
    );
    await query(
      `UPDATE users SET
         display_name = COALESCE($2, display_name),
         bio = CASE WHEN $3::boolean THEN $4 ELSE bio END,
         avatar_url = CASE WHEN $5::boolean THEN $6 ELSE avatar_url END,
         interests = COALESCE($7, interests),
         onboarded_at = CASE WHEN $8 THEN COALESCE(onboarded_at, now()) ELSE onboarded_at END
       WHERE id = $1`,
      [
        viewer.id,
        body.displayName ?? null,
        body.bio !== undefined,
        body.bio ?? null,
        body.avatarUrl !== undefined,
        body.avatarUrl ?? null,
        body.interests ? body.interests : null,
        body.onboarded ?? false,
      ],
    );
    await audit(viewer.id, 'user.updated', 'user', viewer.id, { fields: Object.keys(body) }, req.ip);
    const row = await queryOne<Record<string, any>>(`SELECT * FROM users WHERE id = $1`, [viewer.id]);
    return { data: { user: mapUser(row!) } };
  });

  app.post('/me/onboarding', async (req) => {
    const viewer = await requireViewer(req);
    const body = parseBody(
      z.object({
        displayName: z.string().trim().min(1).max(80).optional(),
        bio: z.string().trim().max(500).optional().nullable(),
        interests: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
      }),
      req.body,
    );
    await query(
      `UPDATE users SET
         display_name = COALESCE($2, display_name),
         bio = COALESCE($3, bio),
         interests = $4,
         onboarded_at = now()
       WHERE id = $1`,
      [viewer.id, body.displayName ?? null, body.bio ?? null, body.interests],
    );
    const row = await queryOne<Record<string, any>>(`SELECT * FROM users WHERE id = $1`, [viewer.id]);
    return { data: { user: mapUser(row!) } };
  });

  app.get('/me/blocks', async (req) => {
    const viewer = await requireViewer(req);
    const rows = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, b.created_at
       FROM blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC`,
      [viewer.id],
    );
    return {
      data: {
        items: rows.map((row) => ({ ...mapUserMini(row), blockedAt: iso(row.created_at) })),
      },
    };
  });

  app.get('/me/export', async (req) => {
    const viewer = await requireViewer(req);
    const [profile, assets, entries, posts, comments, follows, memberships, notifications] =
      await Promise.all([
        queryOne<Record<string, any>>(
          `SELECT id, email, username, display_name, bio, avatar_url, role, interests,
                  onboarded_at, created_at FROM users WHERE id = $1`,
          [viewer.id],
        ),
        query<Record<string, any>>(
          `SELECT * FROM assets WHERE owner_id = $1 ORDER BY created_at`,
          [viewer.id],
        ),
        query<Record<string, any>>(
          `SELECT je.* FROM journal_entries je JOIN assets a ON a.id = je.asset_id
           WHERE a.owner_id = $1 OR je.author_id = $1 ORDER BY je.occurred_at`,
          [viewer.id],
        ),
        query<Record<string, any>>(`SELECT * FROM posts WHERE author_id = $1 ORDER BY created_at`, [
          viewer.id,
        ]),
        query<Record<string, any>>(
          `SELECT * FROM comments WHERE author_id = $1 ORDER BY created_at`,
          [viewer.id],
        ),
        query<Record<string, any>>(
          `SELECT * FROM follows WHERE follower_id = $1 OR following_id = $1`,
          [viewer.id],
        ),
        query<Record<string, any>>(
          `SELECT * FROM memberships WHERE user_id = $1`,
          [viewer.id],
        ),
        query<Record<string, any>>(
          `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at`,
          [viewer.id],
        ),
      ]);

    return {
      data: {
        exportedAt: new Date().toISOString(),
        profile,
        assets,
        entries,
        posts,
        comments,
        follows,
        memberships,
        notifications,
      },
    };
  });

  app.delete('/me', async (req, reply) => {
    const viewer = await requireViewer(req);
    await revokeAllSessions(viewer.id);
    await transaction(async (client) => {
      await client.query(`UPDATE posts SET status = 'deleted' WHERE author_id = $1`, [viewer.id]);
      await client.query(`UPDATE comments SET status = 'deleted', deleted_at = now() WHERE author_id = $1`, [
        viewer.id,
      ]);
      await client.query(
        `UPDATE journal_entries SET deleted_at = now() WHERE author_id = $1 AND deleted_at IS NULL`,
        [viewer.id],
      );
      await client.query(
        `UPDATE assets SET deleted_at = now() WHERE owner_id = $1 AND deleted_at IS NULL`,
        [viewer.id],
      );
      await client.query(`DELETE FROM follows WHERE follower_id = $1 OR following_id = $1`, [viewer.id]);
      await client.query(`DELETE FROM memberships WHERE user_id = $1`, [viewer.id]);
      await client.query(`DELETE FROM access_rules WHERE user_id = $1 OR created_by = $1`, [viewer.id]);
      await client.query(`DELETE FROM blocks WHERE blocker_id = $1 OR blocked_id = $1`, [viewer.id]);
      await client.query(
        `UPDATE users SET
           deleted_at = now(),
           email = concat('deleted+', id, '@invalid.local'),
           username = concat('silinmis_', left(replace(id::text, '-', ''), 12)),
           display_name = 'Silinmiş kullanıcı',
           bio = NULL,
           avatar_url = NULL,
           interests = '{}',
           password_hash = encode(gen_random_bytes(32), 'hex')
         WHERE id = $1`,
        [viewer.id],
      );
    });
    await audit(viewer.id, 'user.deleted', 'user', viewer.id, {}, req.ip);
    return reply.status(204).send();
  });
}
