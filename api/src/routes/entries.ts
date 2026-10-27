import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne, transaction } from '../db.js';
import {
  canViewAsset,
  canViewEntry,
  getAsset,
  visibilityRank,
  type EntryAccessRow,
} from '../lib/access.js';
import { audit } from '../lib/audit.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import { iso, parseBody } from '../lib/http.js';
import { attachMedia } from '../lib/media.js';
import { optionalViewer, requireViewer } from '../lib/session.js';
import { mapEntry, mediaForEntries } from '../lib/serialize.js';

const uuid = z.string().uuid();
const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Geçersiz tarih.');

const measurement = z.object({
  metric: z.string().trim().min(1).max(60),
  value: z.coerce.number(),
  unit: z.string().trim().min(1).max(20),
  measuredAt: isoDate.optional(),
});

const entryFields = {
  type: z
    .enum(['note', 'photo', 'maintenance', 'acquisition', 'measurement', 'health', 'event', 'document'])
    .default('note'),
  title: z.string().trim().max(140).optional().nullable(),
  body: z.string().trim().max(5000).optional().nullable(),
  occurredAt: isoDate.optional(),
  visibility: z.enum(['private', 'selected', 'public']).default('private'),
  locationName: z.string().trim().max(160).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  attributes: z.record(z.unknown()).default({}),
  mediaIds: z.array(uuid).max(8).optional(),
  measurements: z.array(measurement).max(20).optional(),
};

const createBody = z.object(entryFields).refine((body) => Boolean(body.title?.trim() || body.body?.trim()), {
  message: 'Kayıt için bir başlık veya açıklama gerekli.',
  path: ['body'],
});

const updateBody = z
  .object({
    type: entryFields.type.optional(),
    title: entryFields.title,
    body: entryFields.body,
    occurredAt: entryFields.occurredAt,
    visibility: entryFields.visibility.optional(),
    locationName: entryFields.locationName,
    latitude: entryFields.latitude,
    longitude: entryFields.longitude,
    attributes: entryFields.attributes.optional(),
    mediaIds: entryFields.mediaIds,
    measurements: entryFields.measurements,
  })
  .refine(
    (body) =>
      body.title === undefined ||
      body.body === undefined ||
      Boolean(body.title?.trim() || body.body?.trim()),
    { message: 'Kayıt için bir başlık veya açıklama gerekli.', path: ['body'] },
  );

async function loadContext(entryId: string) {
  const row = await queryOne<Record<string, any>>(
    `SELECT je.*, u.username AS author_username, u.display_name AS author_display_name,
            u.avatar_url AS author_avatar_url,
            a.owner_id AS asset_owner_id, a.visibility AS asset_visibility,
            a.status AS asset_status, a.deleted_at AS asset_deleted_at,
            a.title AS asset_title
     FROM journal_entries je
     JOIN users u ON u.id = je.author_id AND u.deleted_at IS NULL
     JOIN assets a ON a.id = je.asset_id
     WHERE je.id = $1 AND je.deleted_at IS NULL`,
    [entryId],
  );
  if (!row) notFound('Kayıt bulunamadı.');
  return row;
}

function entryAccess(row: Record<string, any>): EntryAccessRow {
  return {
    id: row.id,
    asset_id: row.asset_id,
    author_id: row.author_id,
    visibility: row.visibility,
    deleted_at: row.deleted_at,
  };
}

async function assertVisibilityAllowed(assetVisibility: EntryAccessRow['visibility'], requested: EntryAccessRow['visibility']) {
  if (visibilityRank(requested) > visibilityRank(assetVisibility)) {
    throw new ApiError(
      422,
      'VISIBILITY_TOO_BROAD',
      'Kayıt görünürlüğü varlık görünürlüğünden daha açık olamaz.',
    );
  }
}

export async function entryRoutes(app: FastifyInstance): Promise<void> {
  app.post('/assets/:id/entries', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const body = parseBody(createBody, req.body);
    const asset = await getAsset(id);
    if (asset.deleted_at) notFound('Varlık bulunamadı.');
    if (asset.owner_id !== viewer.id && viewer.role !== 'admin') {
      forbidden('Bu varlığa yalnızca sahibi kayıt ekleyebilir.');
    }
    if ((body.latitude === undefined) !== (body.longitude === undefined)) {
      throw new ApiError(422, 'INVALID_LOCATION', 'Enlem ve boylam birlikte girilmeli.');
    }
    await assertVisibilityAllowed(asset.visibility, body.visibility);

    const entryId = await transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO journal_entries
           (asset_id, author_id, type, title, body, occurred_at, visibility,
            location_name, latitude, longitude, attributes)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7, $8, $9, $10, $11::jsonb)
         RETURNING id`,
        [
          id,
          viewer.id,
          body.type,
          body.title?.trim() || null,
          body.body?.trim() || null,
          body.occurredAt ? new Date(body.occurredAt) : null,
          body.visibility,
          body.locationName?.trim() || null,
          body.latitude ?? null,
          body.longitude ?? null,
          JSON.stringify(body.attributes ?? {}),
        ],
      );
      const newId = inserted.rows[0]!.id;
      if (body.measurements?.length) {
        for (const item of body.measurements) {
          await client.query(
            `INSERT INTO asset_measurements (asset_id, entry_id, metric, value, unit, measured_at)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))`,
            [
              id,
              newId,
              item.metric,
              item.value,
              item.unit,
              item.measuredAt ? new Date(item.measuredAt) : null,
            ],
          );
        }
      }
      return newId;
    });

    await attachMedia(body.mediaIds, viewer.id, { assetId: id, entryId });
    await audit(viewer.id, 'entry.created', 'entry', entryId, { assetId: id }, req.ip);

    const row = await loadContext(entryId);
    const media = await mediaForEntries([entryId]);
    return reply.status(201).send({
      data: { entry: await mapEntry(row, media.get(entryId) ?? []) },
    });
  });

  app.get('/entries/:id', async (req) => {
    const viewer = await optionalViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await loadContext(id);
    const asset = await getAsset(row.asset_id);
    if (!(await canViewEntry(viewer, entryAccess(row), asset))) {
      forbidden('Bu kaydı görüntüleme yetkiniz yok.');
    }
    const media = await mediaForEntries([id]);
    return { data: { entry: await mapEntry(row, media.get(id) ?? []) } };
  });

  app.patch('/entries/:id', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const body = parseBody(updateBody, req.body);
    const row = await loadContext(id);
    const asset = await getAsset(row.asset_id);

    if (row.author_id !== viewer.id && asset.owner_id !== viewer.id && viewer.role !== 'admin') {
      forbidden('Bu kaydı düzenleme yetkiniz yok.');
    }
    if (body.visibility) await assertVisibilityAllowed(asset.visibility, body.visibility);
    if ((body.latitude === undefined) !== (body.longitude === undefined)) {
      throw new ApiError(422, 'INVALID_LOCATION', 'Enlem ve boylam birlikte girilmeli.');
    }

    await query(
      `UPDATE journal_entries SET
         type = COALESCE($2, type),
         title = CASE WHEN $3::boolean THEN $4 ELSE title END,
         body = CASE WHEN $5::boolean THEN $6 ELSE body END,
         occurred_at = COALESCE($7::timestamptz, occurred_at),
         visibility = COALESCE($8, visibility),
         location_name = CASE WHEN $9::boolean THEN $10 ELSE location_name END,
         latitude = CASE WHEN $11::boolean THEN $12 ELSE latitude END,
         longitude = CASE WHEN $11::boolean THEN $13 ELSE longitude END,
         attributes = COALESCE($14::jsonb, attributes)
       WHERE id = $1`,
      [
        id,
        body.type ?? null,
        body.title !== undefined,
        body.title?.trim() || null,
        body.body !== undefined,
        body.body?.trim() || null,
        body.occurredAt ? new Date(body.occurredAt) : null,
        body.visibility ?? null,
        body.locationName !== undefined || body.latitude !== undefined,
        body.locationName ?? null,
        body.latitude !== undefined,
        body.latitude ?? null,
        body.longitude ?? null,
        body.attributes ? JSON.stringify(body.attributes) : null,
      ],
    );

    if (body.mediaIds) {
      await attachMedia(body.mediaIds, viewer.id, { assetId: row.asset_id, entryId: id });
    }
    if (body.measurements) {
      await transaction(async (client) => {
        await client.query(`DELETE FROM asset_measurements WHERE entry_id = $1`, [id]);
        for (const item of body.measurements ?? []) {
          await client.query(
            `INSERT INTO asset_measurements (asset_id, entry_id, metric, value, unit, measured_at)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))`,
            [
              row.asset_id,
              id,
              item.metric,
              item.value,
              item.unit,
              item.measuredAt ? new Date(item.measuredAt) : null,
            ],
          );
        }
      });
    }

    await audit(viewer.id, 'entry.updated', 'entry', id, { assetId: row.asset_id }, req.ip);
    const updated = await loadContext(id);
    const media = await mediaForEntries([id]);
    return { data: { entry: await mapEntry(updated, media.get(id) ?? []) } };
  });

  app.delete('/entries/:id', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await loadContext(id);
    const asset = await getAsset(row.asset_id);
    if (row.author_id !== viewer.id && asset.owner_id !== viewer.id && viewer.role !== 'admin') {
      forbidden('Bu kaydı silme yetkiniz yok.');
    }
    await query(
      `UPDATE journal_entries SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    await query(`UPDATE posts SET status = 'hidden' WHERE entry_id = $1 AND status = 'visible'`, [id]);
    await audit(viewer.id, 'entry.deleted', 'entry', id, { assetId: row.asset_id }, req.ip);
    return reply.status(204).send();
  });

  app.get('/entries/:id/media', async (req) => {
    const viewer = await optionalViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await loadContext(id);
    const asset = await getAsset(row.asset_id);
    if (!(await canViewEntry(viewer, entryAccess(row), asset))) forbidden();
    const media = await mediaForEntries([id]);
    return { data: { items: media.get(id) ?? [] } };
  });

  app.get('/assets/:id/measurements', async (req) => {
    const viewer = await optionalViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const asset = await getAsset(id);
    if (asset.deleted_at) notFound('Varlık bulunamadı.');
    const allowed = await canViewAsset(viewer, asset);
    if (!allowed) forbidden();
    const rows = await query<Record<string, any>>(
      `SELECT * FROM asset_measurements WHERE asset_id = $1 ORDER BY measured_at DESC`,
      [id],
    );
    return {
      data: {
        items: rows.map((row) => ({
          id: row.id,
          metric: row.metric,
          value: Number(row.value),
          unit: row.unit,
          measuredAt: iso(row.measured_at),
        })),
      },
    };
  });
}
