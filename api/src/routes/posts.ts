import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import {
  assertNotBlocked,
  canManageCommunity,
  communityRole,
  getAsset,
} from '../lib/access.js';
import { audit } from '../lib/audit.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import { getGroupAsset, groupScopeAllowsEntry } from '../lib/groups.js';
import { iso, parseBody, parseQuery } from '../lib/http.js';
import { attachMedia } from '../lib/media.js';
import { notify } from '../lib/notify.js';
import { getAccessiblePost, hydratePost, loadPostRow } from '../lib/posts.js';
import { optionalViewer, requireViewer } from '../lib/session.js';
import { mapUserMini } from '../lib/serialize.js';

const uuid = z.string().uuid();

const createBody = z
  .object({
    body: z.string().trim().max(3000).default(''),
    audience: z.enum(['public', 'community']).default('public'),
    communityId: uuid.optional().nullable(),
    assetId: uuid.optional().nullable(),
    entryId: uuid.optional().nullable(),
    mediaIds: z.array(uuid).max(8).optional(),
  })
  .refine((body) => Boolean(body.body.trim() || body.assetId || body.entryId), {
    message: 'Gönderi için bir metin, varlık veya kayıt gerekli.',
    path: ['body'],
  });

const commentBody = z.object({
  body: z.string().trim().min(1).max(1000),
  parentId: uuid.optional().nullable(),
});

async function mapComment(row: Record<string, any>) {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    body: row.body,
    status: row.status,
    author: mapUserMini(row, 'author_'),
    createdAt: iso(row.created_at),
  };
}

async function assertShareableAsset(
  assetId: string | null | undefined,
  communityId: string | null | undefined,
): Promise<void> {
  if (!assetId) return;
  const asset = await getAsset(assetId);
  if (asset.deleted_at) notFound('Varlık bulunamadı.');
  if (asset.visibility === 'public') return;
  if (communityId) {
    const shared = await getGroupAsset(communityId, assetId);
    if (shared?.status === 'active') return;
  }
  throw new ApiError(
    422,
    'ASSET_NOT_SHARED',
    'Gönderiye yalnızca herkese açık veya bu grupla paylaşılmış varlıklar eklenebilir.',
  );
}

export async function postRoutes(app: FastifyInstance): Promise<void> {
  app.post('/posts', async (req, reply) => {
    const viewer = await requireViewer(req);
    const body = parseBody(createBody, req.body);

    if (body.communityId) {
      const community = await queryOne<{ id: string; owner_id: string; visibility: string }>(
        `SELECT id, owner_id, visibility FROM communities WHERE id = $1 AND deleted_at IS NULL`,
        [body.communityId],
      );
      if (!community) notFound('Topluluk bulunamadı.');
      if (!(await communityRole(body.communityId, viewer.id))) {
        forbidden('Gönderi paylaşmak için topluluğa üye olmalısınız.');
      }
    }
    if (body.audience === 'community' && !body.communityId) {
      throw new ApiError(422, 'COMMUNITY_REQUIRED', 'Topluluk gönderisi için topluluk seçin.');
    }
    if (body.audience === 'public' && body.communityId) {
      throw new ApiError(422, 'COMMUNITY_NOT_ALLOWED', 'Herkese açık gönderide topluluk seçilemez.');
    }

    let assetId = body.assetId ?? null;
    if (body.entryId) {
      const entry = await queryOne<{
        asset_id: string;
        visibility: 'private' | 'selected' | 'friends' | 'public';
        deleted_at: Date | null;
      }>(`SELECT asset_id, visibility, deleted_at FROM journal_entries WHERE id = $1`, [
        body.entryId,
      ]);
      if (!entry || entry.deleted_at) notFound('Kayıt bulunamadı.');
      if (assetId && assetId !== entry.asset_id) {
        throw new ApiError(422, 'ASSET_MISMATCH', 'Kayıt seçilen varlığa ait değil.');
      }
      assetId = entry.asset_id;

      if (entry.visibility !== 'public') {
        const shared = body.communityId
          ? await getGroupAsset(body.communityId, assetId)
          : null;
        if (
          !shared ||
          shared.status !== 'active' ||
          !groupScopeAllowsEntry(shared.visibility_scope, entry.visibility)
        ) {
          throw new ApiError(
            422,
            'ENTRY_NOT_SHARED',
            'Bu kayıt grubun paylaşım kapsamında değil.',
          );
        }
      }
    }
    await assertShareableAsset(assetId, body.communityId);

    const rows = await query<{ id: string }>(
      `INSERT INTO posts (author_id, asset_id, entry_id, community_id, audience, body)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        viewer.id,
        assetId,
        body.entryId ?? null,
        body.communityId ?? null,
        body.audience,
        body.body.trim(),
      ],
    );
    const postId = rows[0]!.id;
    await attachMedia(body.mediaIds, viewer.id, { postId });
    await audit(viewer.id, 'post.created', 'post', postId, { audience: body.audience }, req.ip);

    if (body.communityId) {
      const community = await queryOne<{ owner_id: string; name: string }>(
        `SELECT owner_id, name FROM communities WHERE id = $1`,
        [body.communityId],
      );
      if (community && community.owner_id !== viewer.id) {
        await notify({
          userId: community.owner_id,
          actorId: viewer.id,
          type: 'community_post',
          entityType: 'post',
          entityId: postId,
          messageKey: '{actor}, {community} topluluğunda yeni bir gönderi paylaştı.',
          messageParams: { actor: viewer.displayName, community: community.name },
        });
      }
    }

    const row = await loadPostRow(postId, viewer.id);
    return reply.status(201).send({ data: { post: await hydratePost(row!, req.locale) } });
  });

  app.get('/posts/:id', async (req) => {
    const viewer = await optionalViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await getAccessiblePost(viewer, id);
    return { data: { post: await hydratePost(row, req.locale) } };
  });

  app.patch('/posts/:id', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const body = parseBody(z.object({ body: z.string().trim().max(3000) }), req.body);
    const row = await getAccessiblePost(viewer, id);
    if (row.author_id !== viewer.id && viewer.role !== 'admin') {
      forbidden('Bu gönderiyi düzenleme yetkiniz yok.');
    }
    await query(`UPDATE posts SET body = $2 WHERE id = $1`, [id, body.body]);
    await audit(viewer.id, 'post.updated', 'post', id, {}, req.ip);
    const updated = await getAccessiblePost(viewer, id);
    return { data: { post: await hydratePost(updated, req.locale) } };
  });

  app.delete('/posts/:id', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await getAccessiblePost(viewer, id);
    const groupRole = row.community_id
      ? await communityRole(row.community_id, viewer.id)
      : null;
    if (
      row.author_id !== viewer.id &&
      viewer.role !== 'admin' &&
      !canManageCommunity(groupRole)
    ) {
      forbidden('Bu gönderiyi silme yetkiniz yok.');
    }
    await query(`UPDATE posts SET status = 'deleted' WHERE id = $1`, [id]);
    await audit(viewer.id, 'post.deleted', 'post', id, {}, req.ip);
    return reply.status(204).send();
  });

  app.post('/posts/:id/like', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await getAccessiblePost(viewer, id);
    await assertNotBlocked(viewer.id, row.author_id);

    const inserted = await query<{ post_id: string }>(
      `INSERT INTO likes (user_id, post_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING post_id`,
      [viewer.id, id],
    );
    if (inserted.length > 0) {
      await notify({
        userId: row.author_id,
        actorId: viewer.id,
        type: 'like',
        entityType: 'post',
        entityId: id,
        messageKey: '{actor} gönderini beğendi.',
        messageParams: { actor: viewer.displayName },
      });
      await audit(viewer.id, 'post.liked', 'post', id, {}, req.ip);
    }
    const count = await queryOne<{ count: string }>(
      `SELECT count(*) FROM likes WHERE post_id = $1`,
      [id],
    );
    return reply.status(201).send({ data: { liked: true, likeCount: Number(count?.count ?? 0) } });
  });

  app.delete('/posts/:id/like', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    await getAccessiblePost(viewer, id);
    await query(`DELETE FROM likes WHERE user_id = $1 AND post_id = $2`, [viewer.id, id]);
    const count = await queryOne<{ count: string }>(
      `SELECT count(*) FROM likes WHERE post_id = $1`,
      [id],
    );
    return { data: { liked: false, likeCount: Number(count?.count ?? 0) } };
  });

  app.get('/posts/:id/comments', async (req) => {
    const viewer = await optionalViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    await getAccessiblePost(viewer, id);
    const params = parseQuery(
      z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }),
      req.query,
    );
    const rows = await query<Record<string, any>>(
      `SELECT c.*, u.username AS author_username, u.display_name AS author_display_name,
              u.avatar_url AS author_avatar_url
       FROM comments c
       JOIN users u ON u.id = c.author_id AND u.deleted_at IS NULL
       WHERE c.post_id = $1 AND c.deleted_at IS NULL AND c.status = 'visible'
       ORDER BY c.created_at ASC
       LIMIT $2`,
      [id, params.limit],
    );
    return { data: { items: await Promise.all(rows.map(mapComment)) } };
  });

  app.post('/posts/:id/comments', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const body = parseBody(commentBody, req.body);
    const post = await getAccessiblePost(viewer, id);
    await assertNotBlocked(viewer.id, post.author_id);

    if (body.parentId) {
      const parent = await queryOne<{ id: string; author_id: string }>(
        `SELECT id, author_id FROM comments
         WHERE id = $1 AND post_id = $2 AND deleted_at IS NULL`,
        [body.parentId, id],
      );
      if (!parent) notFound('Yanıtlanan yorum bulunamadı.');
      await notify({
        userId: parent.author_id,
        actorId: viewer.id,
        type: 'comment',
        entityType: 'post',
        entityId: id,
        messageKey: '{actor} yorumunuza yanıt verdi.',
        messageParams: { actor: viewer.displayName },
      });
    }

    const rows = await query<Record<string, any>>(
      `INSERT INTO comments (post_id, author_id, parent_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, viewer.id, body.parentId ?? null, body.body],
    );
    await notify({
      userId: post.author_id,
      actorId: viewer.id,
      type: 'comment',
      entityType: 'post',
      entityId: id,
      messageKey: '{actor} gönderine yorum yaptı.',
      messageParams: { actor: viewer.displayName },
    });
    await audit(viewer.id, 'comment.created', 'comment', rows[0]!.id, { postId: id }, req.ip);

    const comment = await queryOne<Record<string, any>>(
      `SELECT c.*, u.username AS author_username, u.display_name AS author_display_name,
              u.avatar_url AS author_avatar_url
       FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = $1`,
      [rows[0]!.id],
    );
    return reply.status(201).send({ data: { comment: await mapComment(comment!) } });
  });

  app.delete('/comments/:id', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await queryOne<{ id: string; post_id: string; author_id: string }>(
      `SELECT id, post_id, author_id FROM comments WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!row) notFound('Yorum bulunamadı.');
    const post = await getAccessiblePost(viewer, row.post_id);
    const groupRole = post.community_id
      ? await communityRole(post.community_id, viewer.id)
      : null;
    if (
      row.author_id !== viewer.id &&
      post.author_id !== viewer.id &&
      viewer.role === 'user' &&
      !canManageCommunity(groupRole)
    ) {
      forbidden('Bu yorumu silme yetkiniz yok.');
    }
    await query(
      `UPDATE comments SET deleted_at = now(), status = 'deleted' WHERE id = $1`,
      [id],
    );
    await audit(viewer.id, 'comment.deleted', 'comment', id, { postId: row.post_id }, req.ip);
    return reply.status(204).send();
  });
}
