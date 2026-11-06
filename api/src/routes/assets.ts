import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { query, queryOne, transaction } from '../db.js';
import {
  canViewEntry,
  getAsset,
  isStaff,
  requireEditableAsset,
  requireViewableAsset,
  visibilityRank,
  type Visibility,
} from '../lib/access.js';
import { audit } from '../lib/audit.js';
import { assetSelect, buildAssetSelect } from '../lib/asset-select.js';
import { ApiError, conflict, forbidden, notFound } from '../lib/errors.js';
import {
  decodeCursor,
  encodeCursor,
  iso,
  limitFrom,
  parseBody,
  parseQuery,
} from '../lib/http.js';
import { notify } from '../lib/notify.js';
import type { Locale } from '../lib/locale.js';
import { optionalViewer, requireViewer, type Viewer } from '../lib/session.js';
import { mapAsset, mapEntry, mapUserMini, mediaForEntries } from '../lib/serialize.js';

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  type: z.string().trim().max(60).optional(),
  visibility: z.enum(['private', 'selected', 'friends', 'public']).optional(),
  status: z.enum(['active', 'archived']).optional(),
  sort: z.enum(['recent', 'updated', 'title']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const discoverQuery = listQuery.extend({
  sort: z.enum(['recent', 'title']).default('recent'),
  q: z.string().trim().max(120).optional(),
});

const uuid = z.string().uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD biçiminde olmalı.');
const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Geçersiz tarih.');

const visibilityValues = ['private', 'selected', 'friends', 'public'] as const;

const createBody = z.object({
  typeId: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  visibility: z.enum(visibilityValues).default('private'),
  viewerIds: z.array(uuid).max(100).optional(),
  attributes: z.record(z.unknown()).default({}),
  locationName: z.string().trim().max(160).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  acquiredAt: dateOnly.optional().nullable(),
  coverMediaId: uuid.optional().nullable(),
  initialEntry: z
    .object({
      type: z
        .enum(['note', 'photo', 'maintenance', 'acquisition', 'measurement', 'health', 'event', 'document'])
        .default('note'),
      title: z.string().trim().max(140).optional().nullable(),
      body: z.string().trim().max(5000).optional().nullable(),
      occurredAt: isoDate.optional(),
      visibility: z.enum(['private', 'selected', 'friends', 'public']).optional(),
    })
    .optional()
    .nullable(),
});

const updateBody = z.object({
  typeId: z.string().trim().min(1).max(60).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  visibility: z.enum(visibilityValues).optional(),
  viewerIds: z.array(uuid).max(100).optional(),
  status: z.enum(['active', 'archived']).optional(),
  attributes: z.record(z.unknown()).optional(),
  locationName: z.string().trim().max(160).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  acquiredAt: dateOnly.optional().nullable(),
  coverMediaId: uuid.optional().nullable(),
  removeCover: z.boolean().optional(),
  // Konumu tamamen kaldırmak için; yalnızca null alanlar istemcide düşürülür.
  clearLocation: z.boolean().optional(),
});

const accessBody = z.object({
  username: z.string().trim().min(3).max(30),
});

async function loadAsset(assetId: string, locale: Locale) {
  const row = await queryOne<Record<string, any>>(`${assetSelect} WHERE a.id = $1`, [assetId]);
  if (!row) notFound('Varlık bulunamadı.');
  return mapAsset(row, locale);
}

async function assertLeafType(typeId: string): Promise<void> {
  const row = await queryOne<{ id: string; is_active: boolean; child_count: string }>(
    `SELECT t.id, t.is_active,
            (SELECT count(*) FROM asset_types c WHERE c.parent_id = t.id) AS child_count
     FROM asset_types t WHERE t.id = $1`,
    [typeId],
  );
  if (!row || !row.is_active) throw new ApiError(422, 'INVALID_TYPE', 'Varlık türü bulunamadı.');
  if (Number(row.child_count) > 0) {
    throw new ApiError(422, 'INVALID_TYPE', 'Lütfen alt kategori seçin.');
  }
}

async function assertCover(mediaId: string, viewerId: string): Promise<void> {
  const media = await queryOne<{ id: string; owner_id: string; status: string; kind: string }>(
    `SELECT id, owner_id, status, kind FROM media WHERE id = $1`,
    [mediaId],
  );
  if (!media || media.owner_id !== viewerId || media.status !== 'ready' || media.kind !== 'image') {
    throw new ApiError(422, 'INVALID_MEDIA', 'Kapak fotoğrafı geçerli değil.');
  }
}

async function resolveViewerIds(
  ownerId: string,
  viewerIds: string[] | undefined,
): Promise<string[] | null> {
  if (viewerIds === undefined) return null;
  const unique = [...new Set(viewerIds)].filter((value) => value !== ownerId);
  if (unique.length === 0) return [];
  const rows = await query<{ id: string }>(
    `SELECT id FROM users WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
    [unique],
  );
  if (rows.length !== unique.length) {
    throw new ApiError(422, 'INVALID_VIEWERS', 'Seçilen kişilerden bazıları bulunamadı.');
  }
  return unique;
}

async function countAssetViewers(assetId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*) FROM access_rules
     WHERE resource_type = 'asset' AND resource_id = $1 AND permission = 'view'`,
    [assetId],
  );
  return Number(row?.count ?? 0);
}

async function syncAssetViewers(
  assetId: string,
  ownerId: string,
  viewerIds: string[],
): Promise<string[]> {
  return transaction(async (client) => {
    const existing = await client.query<{ user_id: string }>(
      `SELECT user_id FROM access_rules
       WHERE resource_type = 'asset' AND resource_id = $1 AND permission = 'view'`,
      [assetId],
    );
    const existingIds = new Set(existing.rows.map((row) => row.user_id));
    await client.query(
      `DELETE FROM access_rules
       WHERE resource_type = 'asset' AND resource_id = $1
         AND NOT (user_id = ANY($2::uuid[]))`,
      [assetId, viewerIds],
    );
    if (viewerIds.length > 0) {
      await client.query(
        `INSERT INTO access_rules (resource_type, resource_id, user_id, created_by)
         SELECT 'asset', $1, candidate, $3 FROM unnest($2::uuid[]) AS candidate
         ON CONFLICT (resource_type, resource_id, user_id) DO NOTHING`,
        [assetId, viewerIds, ownerId],
      );
    }
    return viewerIds.filter((userId) => !existingIds.has(userId));
  });
}

async function notifyViewers(
  owner: Viewer,
  assetId: string,
  viewerIds: string[],
): Promise<void> {
  for (const userId of viewerIds) {
    await notify({
      userId,
      actorId: owner.id,
      type: 'system',
      entityType: 'asset',
      entityId: assetId,
      messageKey: '{actor} sizinle seçili erişimle bir varlık paylaştı.',
      messageParams: { actor: owner.displayName },
    });
  }
}

async function attachEntry(
  client: PoolClient,
  assetId: string,
  viewer: Viewer,
  assetVisibility: Visibility,
  input: z.infer<typeof createBody>['initialEntry'],
): Promise<string | null> {
  if (!input) return null;
  if (!input.body?.trim() && !input.title?.trim()) return null;
  const requested =
    input.visibility ?? (assetVisibility === 'friends' ? 'friends' : 'private');
  if (visibilityRank(requested) > visibilityRank(assetVisibility)) {
    throw new ApiError(
      422,
      'VISIBILITY_TOO_BROAD',
      'Kayıt görünürlüğü varlık görünürlüğünden daha açık olamaz.',
    );
  }
  // Varlık satırı henüz commit edilmediği için aynı transaction istemcisi kullanılmalı;
  // havuzdan ayrı bir bağlantı almak yabancı anahtar kontrolünde kilitlenmeye yol açar.
  const result = await client.query<{ id: string }>(
    `INSERT INTO journal_entries
       (asset_id, author_id, type, title, body, occurred_at, visibility)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7)
     RETURNING id`,
    [
      assetId,
      viewer.id,
      input.type ?? 'note',
      input.title?.trim() || null,
      input.body?.trim() || null,
      input.occurredAt ? new Date(input.occurredAt) : null,
      requested,
    ],
  );
  return result.rows[0]!.id;
}

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (req) => {
    const viewer = await requireViewer(req);
    const filters = parseQuery(listQuery, req.query);
    const offset = (filters.page - 1) * filters.limit;
    const params: unknown[] = [viewer.id];
    const clauses = ['a.owner_id = $1', 'a.deleted_at IS NULL'];
    let index = 2;

    if (filters.q) {
      clauses.push(`(a.title ILIKE $${index} OR a.description ILIKE $${index})`);
      params.push(`%${filters.q}%`);
      index += 1;
    }
    if (filters.type) {
      clauses.push(`(a.type_id = $${index} OR t.parent_id = $${index})`);
      params.push(filters.type);
      index += 1;
    }
    if (filters.visibility) {
      clauses.push(`a.visibility = $${index}`);
      params.push(filters.visibility);
      index += 1;
    }
    if (filters.status) {
      clauses.push(`a.status = $${index}`);
      params.push(filters.status);
      index += 1;
    }

    const order =
      filters.sort === 'title'
        ? 'a.title ASC, a.id ASC'
        : filters.sort === 'updated'
          ? 'a.updated_at DESC, a.id DESC'
          : 'a.created_at DESC, a.id DESC';

    const rows = await query<Record<string, any>>(
      `${assetSelect}
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${order}
       LIMIT $${index} OFFSET $${index + 1}`,
      [...params, filters.limit, offset],
    );
    const totalRow = await queryOne<{ count: string }>(
      `SELECT count(*) FROM assets a JOIN asset_types t ON t.id = a.type_id
       WHERE ${clauses.join(' AND ')}`,
      params,
    );

    return {
      data: {
        items: await Promise.all(rows.map((row) => mapAsset(row, req.locale))),
        page: filters.page,
        pageSize: filters.limit,
        total: Number(totalRow?.count ?? 0),
      },
    };
  });

  app.get('/discover', async (req) => {
    const viewer = await optionalViewer(req);
    const filters = parseQuery(discoverQuery, req.query);
    const offset = (filters.page - 1) * filters.limit;
    const params: unknown[] = [];
    const clauses = [`a.visibility = 'public'`, `a.deleted_at IS NULL`, `a.status = 'active'`];
    let index = 1;

    if (filters.q) {
      clauses.push(`(a.title ILIKE $${index} OR a.description ILIKE $${index})`);
      params.push(`%${filters.q}%`);
      index += 1;
    }
    if (filters.type) {
      clauses.push(`(a.type_id = $${index} OR t.parent_id = $${index})`);
      params.push(filters.type);
      index += 1;
    }
    if (viewer) {
      clauses.push(`NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = $${index} AND b.blocked_id = a.owner_id)
           OR (b.blocker_id = a.owner_id AND b.blocked_id = $${index})
      )`);
      params.push(viewer.id);
      index += 1;
    }

    const order =
      filters.sort === 'title' ? 'a.title ASC, a.id ASC' : 'a.updated_at DESC, a.id DESC';
    const rows = await query<Record<string, any>>(
      `${assetSelect}
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${order}
       LIMIT $${index} OFFSET $${index + 1}`,
      [...params, filters.limit, offset],
    );
    const totalRow = await queryOne<{ count: string }>(
      `SELECT count(*) FROM assets a JOIN asset_types t ON t.id = a.type_id
       WHERE ${clauses.join(' AND ')}`,
      params,
    );

    return {
      data: {
        items: await Promise.all(rows.map((row) => mapAsset(row, req.locale))),
        page: filters.page,
        pageSize: filters.limit,
        total: Number(totalRow?.count ?? 0),
      },
    };
  });

  app.post('/', async (req, reply) => {
    const viewer = await requireViewer(req);
    const body = parseBody(createBody, req.body);
    await assertLeafType(body.typeId);
    if ((body.latitude === undefined) !== (body.longitude === undefined)) {
      throw new ApiError(422, 'INVALID_LOCATION', 'Enlem ve boylam birlikte girilmeli.');
    }
    if (body.coverMediaId) await assertCover(body.coverMediaId, viewer.id);
    const viewerIds = await resolveViewerIds(viewer.id, body.viewerIds);
    if (body.visibility === 'selected' && (viewerIds?.length ?? 0) === 0) {
      throw new ApiError(
        422,
        'VIEWERS_REQUIRED',
        'Seçili kişiler görünürlüğü için en az bir kişi seçin.',
      );
    }

    const created = await transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO assets
           (owner_id, type_id, title, description, visibility, attributes, location_name,
            latitude, longitude, acquired_at, cover_media_id)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::date, $11)
         RETURNING id`,
        [
          viewer.id,
          body.typeId,
          body.title,
          body.description?.trim() || null,
          body.visibility,
          JSON.stringify(body.attributes ?? {}),
          body.locationName?.trim() || null,
          body.latitude ?? null,
          body.longitude ?? null,
          body.acquiredAt ?? null,
          body.coverMediaId ?? null,
        ],
      );
      if (body.coverMediaId) {
        await client.query(
          `UPDATE media SET asset_id = $1 WHERE id = $2 AND owner_id = $3`,
          [inserted.rows[0]!.id, body.coverMediaId, viewer.id],
        );
      }
      if (viewerIds && viewerIds.length > 0) {
        await client.query(
          `INSERT INTO access_rules (resource_type, resource_id, user_id, created_by)
           SELECT 'asset', $1, candidate, $3 FROM unnest($2::uuid[]) AS candidate
           ON CONFLICT (resource_type, resource_id, user_id) DO NOTHING`,
          [inserted.rows[0]!.id, viewerIds, viewer.id],
        );
      }
      const entryId = await attachEntry(
        client,
        inserted.rows[0]!.id,
        viewer,
        body.visibility,
        body.initialEntry,
      );
      return { id: inserted.rows[0]!.id, entryId };
    });

    await audit(viewer.id, 'asset.created', 'asset', created.id, { typeId: body.typeId }, req.ip);
    if (viewerIds && viewerIds.length > 0) {
      await notifyViewers(viewer, created.id, viewerIds);
    }
    const asset = await loadAsset(created.id, req.locale);
    return reply.status(201).send({ data: { asset } });
  });

  const sharedQuery = listQuery.pick({ q: true, type: true, page: true, limit: true }).extend({
    friends: z
      .string()
      .optional()
      .transform((value) => value === '1' || value === 'true'),
  });

  app.get('/shared', async (req) => {
    const viewer = await requireViewer(req);
    const filters = parseQuery(sharedQuery, req.query);
    const offset = (filters.page - 1) * filters.limit;
    const params: unknown[] = [viewer.id];
    let index = 2;

    const friendExpr = `EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = $1 AND f.addressee_id = a.owner_id)
          OR (f.requester_id = a.owner_id AND f.addressee_id = $1))
    )`;
    const clauses = [
      `a.owner_id <> $1`,
      `a.deleted_at IS NULL`,
      `a.status = 'active'`,
      `((a.visibility = 'friends' AND ${friendExpr})
        OR (a.visibility = 'public' AND ${friendExpr})
        OR (a.visibility = 'selected' AND ar.id IS NOT NULL))`,
      `NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = $1 AND b.blocked_id = a.owner_id)
           OR (b.blocker_id = a.owner_id AND b.blocked_id = $1)
      )`,
    ];

    if (filters.friends) {
      clauses.push(`a.visibility = 'friends' AND ${friendExpr}`);
    }
    if (filters.q) {
      clauses.push(`(a.title ILIKE $${index} OR a.description ILIKE $${index})`);
      params.push(`%${filters.q}%`);
      index += 1;
    }
    if (filters.type) {
      clauses.push(`(a.type_id = $${index} OR t.parent_id = $${index})`);
      params.push(filters.type);
      index += 1;
    }

    const select = buildAssetSelect(
      `ar.created_at AS shared_at, ${friendExpr} AS is_friend,`,
    );
    const rows = await query<Record<string, any>>(
      `${select}
       LEFT JOIN access_rules ar
         ON ar.resource_type = 'asset' AND ar.resource_id = a.id AND ar.user_id = $1
       WHERE ${clauses.join(' AND ')}
       ORDER BY CASE WHEN a.visibility = 'selected' THEN ar.created_at ELSE a.updated_at END DESC,
                a.id DESC
       LIMIT $${index} OFFSET $${index + 1}`,
      [...params, filters.limit, offset],
    );
    const totalRow = await queryOne<{ count: string }>(
      `SELECT count(*) FROM assets a
       JOIN asset_types t ON t.id = a.type_id
       LEFT JOIN access_rules ar
         ON ar.resource_type = 'asset' AND ar.resource_id = a.id AND ar.user_id = $1
       WHERE ${clauses.join(' AND ')}`,
      params,
    );

    return {
      data: {
        items: await Promise.all(
          rows.map(async (row) => ({
            ...(await mapAsset(row, req.locale)),
            relation:
              row.visibility === 'friends'
                ? 'friends'
                : row.visibility === 'public'
                  ? 'public'
                  : 'granted',
            sharedAt: iso(row.shared_at ?? row.updated_at),
            isFriend: Boolean(row.is_friend),
          })),
        ),
        page: filters.page,
        pageSize: filters.limit,
        total: Number(totalRow?.count ?? 0),
      },
    };
  });

  app.get('/:id', async (req) => {
    const viewer = await optionalViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const assetRow = await requireViewableAsset(viewer, id);
    const owner = await loadAsset(id, req.locale);
    const isOwner = viewer?.id === assetRow.owner_id;
    const staff = isStaff(viewer);

    const entryLimit = 20;
    const entryRows = await query<Record<string, any>>(
      `SELECT je.*, u.username AS author_username, u.display_name AS author_display_name,
              u.avatar_url AS author_avatar_url
       FROM journal_entries je
       JOIN users u ON u.id = je.author_id AND u.deleted_at IS NULL
       WHERE je.asset_id = $1 AND je.deleted_at IS NULL
         AND (
           $2::boolean OR $3::boolean OR je.author_id = $4
           OR je.visibility = 'public'
           OR (je.visibility = 'selected' AND (
             EXISTS (SELECT 1 FROM access_rules ar
                     WHERE ar.resource_type = 'entry' AND ar.resource_id = je.id AND ar.user_id = $4)
             OR EXISTS (SELECT 1 FROM access_rules ar
                     WHERE ar.resource_type = 'asset' AND ar.resource_id = je.asset_id AND ar.user_id = $4)
           ))
         )
       ORDER BY je.occurred_at DESC, je.id DESC
       LIMIT $5`,
      [id, isOwner, staff, viewer?.id ?? '00000000-0000-0000-0000-000000000000', entryLimit + 1],
    );
    const hasMoreEntries = entryRows.length > entryLimit;
    const entryPage = hasMoreEntries ? entryRows.slice(0, entryLimit) : entryRows;
    const lastEntry = entryPage[entryPage.length - 1];
    const entriesNextCursor =
      hasMoreEntries && lastEntry
        ? encodeCursor({ at: new Date(lastEntry.occurred_at).toISOString(), id: lastEntry.id })
        : null;
    const media = await mediaForEntries(entryPage.map((row) => row.id));
    const entries = await Promise.all(
      entryPage.map((row) => mapEntry(row, media.get(row.id) ?? [])),
    );

    const ownerships = isOwner || staff
      ? await query<Record<string, any>>(
          `SELECT o.*, u.username, u.display_name, u.avatar_url
           FROM ownerships o JOIN users u ON u.id = o.owner_id
           WHERE o.asset_id = $1 ORDER BY o.started_at DESC`,
          [id],
        )
      : [];

    const accessUsers = isOwner
      ? await query<Record<string, any>>(
          `SELECT u.id, u.username, u.display_name, u.avatar_url, ar.created_at
           FROM access_rules ar JOIN users u ON u.id = ar.user_id
           WHERE ar.resource_type = 'asset' AND ar.resource_id = $1
           ORDER BY ar.created_at DESC`,
          [id],
        )
      : [];

    const isShared =
      viewer && !isOwner && !staff
        ? assetRow.visibility === 'friends' ||
          Boolean(
            await queryOne(
              `SELECT 1 FROM access_rules WHERE resource_type = 'asset' AND resource_id = $1 AND user_id = $2`,
              [id, viewer.id],
            ),
          )
        : false;

    return {
      data: {
        asset: owner,
        entries,
        entriesNextCursor,
        ownerships: ownerships.map((row) => ({
          id: row.id,
          owner: mapUserMini(row),
          status: row.status,
          startedAt: row.started_at,
          endedAt: row.ended_at,
          note: row.note,
        })),
        access: {
          isOwner,
          isShared,
          viewers: accessUsers.map((row) => ({
            user: mapUserMini(row),
            grantedAt: iso(row.created_at),
          })),
        },
      },
    };
  });

  app.get('/:id/entries', async (req) => {
    const viewer = await optionalViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const params = parseQuery(
      z.object({ limit: z.string().optional(), cursor: z.string().optional() }),
      req.query,
    );
    const assetRow = await requireViewableAsset(viewer, id);
    const limit = limitFrom(params.limit, 20, 50);
    const cursor = decodeCursor(params.cursor);
    const isOwner = viewer?.id === assetRow.owner_id;
    const staff = isStaff(viewer);

    const rows = await query<Record<string, any>>(
      `SELECT je.*, u.username AS author_username, u.display_name AS author_display_name,
              u.avatar_url AS author_avatar_url
       FROM journal_entries je
       JOIN users u ON u.id = je.author_id AND u.deleted_at IS NULL
       WHERE je.asset_id = $1 AND je.deleted_at IS NULL
         AND (
           $2::boolean OR $3::boolean OR je.author_id = $4
           OR je.visibility = 'public'
           OR (je.visibility = 'selected' AND (
             EXISTS (SELECT 1 FROM access_rules ar
                     WHERE ar.resource_type = 'entry' AND ar.resource_id = je.id AND ar.user_id = $4)
             OR EXISTS (SELECT 1 FROM access_rules ar
                     WHERE ar.resource_type = 'asset' AND ar.resource_id = je.asset_id AND ar.user_id = $4)
           ))
         )
         AND ($5::timestamptz IS NULL OR (je.occurred_at, je.id) < ($5::timestamptz, $6::uuid))
       ORDER BY je.occurred_at DESC, je.id DESC
       LIMIT $7`,
      [
        id,
        isOwner,
        staff,
        viewer?.id ?? '00000000-0000-0000-0000-000000000000',
        cursor?.at ?? null,
        cursor?.id ?? null,
        limit + 1,
      ],
    );
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const media = await mediaForEntries(pageRows.map((row) => row.id));
    const last = pageRows[pageRows.length - 1];

    return {
      data: {
        items: await Promise.all(
          pageRows.map((row) => mapEntry(row, media.get(row.id) ?? [])),
        ),
        nextCursor:
          hasMore && last
            ? encodeCursor({ at: new Date(last.occurred_at).toISOString(), id: last.id })
            : null,
      },
    };
  });

  app.patch('/:id', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    await requireEditableAsset(viewer, id);
    const body = parseBody(updateBody, req.body);
    if (body.typeId) await assertLeafType(body.typeId);
    if (body.coverMediaId) await assertCover(body.coverMediaId, viewer.id);
    if ((body.latitude === undefined) !== (body.longitude === undefined)) {
      throw new ApiError(422, 'INVALID_LOCATION', 'Enlem ve boylam birlikte girilmeli.');
    }

    const current = await getAsset(id);
    const viewerIds = await resolveViewerIds(viewer.id, body.viewerIds);
    const nextVisibility = body.visibility ?? current.visibility;
    if (body.viewerIds !== undefined && nextVisibility === 'selected' && viewerIds!.length === 0) {
      throw new ApiError(
        422,
        'VIEWERS_REQUIRED',
        'Seçili kişiler görünürlüğü için en az bir kişi seçin.',
      );
    }
    if (
      body.viewerIds === undefined &&
      body.visibility === 'selected' &&
      (await countAssetViewers(id)) === 0
    ) {
      throw new ApiError(
        422,
        'VIEWERS_REQUIRED',
        'Seçili kişiler görünürlüğü için en az bir kişi seçin.',
      );
    }
    if (body.visibility && visibilityRank(body.visibility) < visibilityRank(current.visibility)) {
      await query(
        `UPDATE journal_entries
         SET visibility = CASE
           WHEN visibility = 'public' AND $1 <> 'public' THEN $1::visibility
           WHEN visibility = 'friends' AND $1 IN ('private', 'selected') THEN $1::visibility
           WHEN visibility = 'selected' AND $1 = 'private' THEN 'private'::visibility
           ELSE visibility
         END
         WHERE asset_id = $2 AND visibility <> 'private'`,
        [body.visibility, id],
      );
    }

    await query(
      `UPDATE assets SET
         type_id = COALESCE($2, type_id),
         title = COALESCE($3, title),
         description = CASE WHEN $4::boolean THEN $5 ELSE description END,
         visibility = COALESCE($6, visibility),
         status = COALESCE($7, status),
         attributes = COALESCE($8::jsonb, attributes),
         location_name = CASE
           WHEN $18::boolean THEN NULL
           WHEN $9::boolean THEN $10
           ELSE location_name
         END,
         latitude = CASE WHEN $18::boolean THEN NULL WHEN $11::boolean THEN $12 ELSE latitude END,
         longitude = CASE WHEN $18::boolean THEN NULL WHEN $11::boolean THEN $13 ELSE longitude END,
         acquired_at = CASE WHEN $14::boolean THEN $15::date ELSE acquired_at END,
         cover_media_id = CASE WHEN $16::boolean THEN NULL WHEN $17::uuid IS NOT NULL THEN $17 ELSE cover_media_id END
       WHERE id = $1`,
      [
        id,
        body.typeId ?? null,
        body.title ?? null,
        body.description !== undefined,
        body.description ?? null,
        body.visibility ?? null,
        body.status ?? null,
        body.attributes ? JSON.stringify(body.attributes) : null,
        body.locationName !== undefined || body.latitude !== undefined,
        body.locationName ?? null,
        body.latitude !== undefined,
        body.latitude ?? null,
        body.longitude ?? null,
        body.acquiredAt !== undefined,
        body.acquiredAt ?? null,
        Boolean(body.removeCover),
        body.coverMediaId ?? null,
        Boolean(body.clearLocation),
      ],
    );

    if (body.coverMediaId) {
      await query(`UPDATE media SET asset_id = $1 WHERE id = $2 AND owner_id = $3`, [
        id,
        body.coverMediaId,
        viewer.id,
      ]);
    }

    if (viewerIds) {
      const added = await syncAssetViewers(id, viewer.id, viewerIds);
      if (added.length > 0) await notifyViewers(viewer, id, added);
    }

    await audit(viewer.id, 'asset.updated', 'asset', id, { fields: Object.keys(body) }, req.ip);
    const asset = await loadAsset(id, req.locale);
    return { data: { asset } };
  });

  app.delete('/:id', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    await requireEditableAsset(viewer, id);

    await transaction(async (client) => {
      await client.query(`UPDATE assets SET deleted_at = now() WHERE id = $1`, [id]);
      await client.query(
        `UPDATE journal_entries SET deleted_at = now() WHERE asset_id = $1 AND deleted_at IS NULL`,
        [id],
      );
      await client.query(
        `UPDATE posts SET status = 'hidden' WHERE asset_id = $1 AND status = 'visible'`,
        [id],
      );
    });
    await audit(viewer.id, 'asset.deleted', 'asset', id, {}, req.ip);
    return reply.status(204).send();
  });

  app.get('/:id/access', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const asset = await getAsset(id);
    if (asset.owner_id !== viewer.id && viewer.role !== 'admin') {
      forbidden('Erişim listesini yalnızca varlık sahibi görebilir.');
    }
    const rows = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, ar.created_at
       FROM access_rules ar JOIN users u ON u.id = ar.user_id
       WHERE ar.resource_type = 'asset' AND ar.resource_id = $1
       ORDER BY ar.created_at DESC`,
      [id],
    );
    return {
      data: {
        items: rows.map((row) => ({ user: mapUserMini(row), grantedAt: iso(row.created_at) })),
      },
    };
  });

  app.post('/:id/access', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const body = parseBody(accessBody, req.body);
    const asset = await getAsset(id);
    if (asset.owner_id !== viewer.id) forbidden('Erişim yalnızca varlık sahibi tarafından verilebilir.');

    const target = await queryOne<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string;
    }>(
      `SELECT id, username, display_name, avatar_url FROM users
       WHERE (username = $1 OR email = $1) AND deleted_at IS NULL`,
      [body.username.toLowerCase()],
    );
    if (!target) notFound('Kullanıcı bulunamadı.');
    if (target.id === viewer.id) conflict('Kendinize erişim veremezsiniz.');

    await query(
      `INSERT INTO access_rules (resource_type, resource_id, user_id, created_by)
       VALUES ('asset', $1, $2, $3)
       ON CONFLICT (resource_type, resource_id, user_id) DO NOTHING`,
      [id, target.id, viewer.id],
    );
    await notify({
      userId: target.id,
      actorId: viewer.id,
      type: 'system',
      entityType: 'asset',
      entityId: id,
      messageKey:
        asset.visibility === 'selected'
          ? '{actor} sizinle seçili erişimle bir varlık paylaştı.'
          : '{actor} sizinle bir varlık paylaştı.',
      messageParams: { actor: viewer.displayName },
    });
    await audit(viewer.id, 'asset.access_granted', 'asset', id, { userId: target.id }, req.ip);
    return reply.status(201).send({ data: { user: mapUserMini(target) } });
  });

  app.delete('/:id/access/:userId', async (req, reply) => {
    const viewer = await requireViewer(req);
    const params = z.object({ id: uuid, userId: uuid }).parse(req.params);
    const asset = await getAsset(params.id);
    if (asset.owner_id !== viewer.id) forbidden('Erişim yalnızca varlık sahibi tarafından kaldırılabilir.');
    await query(
      `DELETE FROM access_rules
       WHERE resource_type = 'asset' AND resource_id = $1 AND user_id = $2`,
      [params.id, params.userId],
    );
    await audit(viewer.id, 'asset.access_revoked', 'asset', params.id, { userId: params.userId }, req.ip);
    return reply.status(204).send();
  });
}
