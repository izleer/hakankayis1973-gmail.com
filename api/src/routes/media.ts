import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { env } from '../env.js';
import { getAsset } from '../lib/access.js';
import { audit } from '../lib/audit.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import {
  decodeCursor,
  encodeCursor,
  limitFrom,
  parseBody,
  parseQuery,
} from '../lib/http.js';
import { requireViewer } from '../lib/session.js';
import { mapMedia } from '../lib/serialize.js';
import { translate } from '../lib/i18n/index.js';
import { translateTypeLabel } from '../lib/taxonomy.js';
import {
  ALLOWED_MIME_TYPES,
  MIME_EXTENSIONS,
  newStorageKey,
  objectExists,
  presignedPutUrl,
  saveBuffer,
} from '../lib/storage.js';

const uuid = z.string().uuid();

const uploadBody = z.object({
  filename: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().min(3).max(120),
  dataBase64: z.string().min(1),
  assetId: uuid.optional().nullable(),
  entryId: uuid.optional().nullable(),
  postId: uuid.optional().nullable(),
});

const presignBody = z.object({
  filename: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().min(3).max(120),
  byteSize: z.coerce.number().int().positive(),
});

function kindFor(mimeType: string): 'image' | 'video' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

function assertMime(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ApiError(422, 'UNSUPPORTED_MEDIA', 'Bu dosya türü desteklenmiyor.');
  }
}

async function assertTargetPermission(
  viewerId: string,
  role: string,
  target: { assetId?: string | null; entryId?: string | null; postId?: string | null },
): Promise<void> {
  if (target.assetId) {
    const asset = await getAsset(target.assetId);
    if (asset.owner_id !== viewerId && role !== 'admin') {
      forbidden('Bu varlığa medya ekleyemezsiniz.');
    }
  }
  if (target.entryId) {
    const entry = await queryOne<{ author_id: string; asset_id: string }>(
      `SELECT author_id, asset_id FROM journal_entries WHERE id = $1 AND deleted_at IS NULL`,
      [target.entryId],
    );
    if (!entry) notFound('Kayıt bulunamadı.');
    const asset = await getAsset(entry.asset_id);
    if (entry.author_id !== viewerId && asset.owner_id !== viewerId && role !== 'admin') {
      forbidden('Bu kayda medya ekleyemezsiniz.');
    }
  }
  if (target.postId) {
    const post = await queryOne<{ author_id: string }>(`SELECT author_id FROM posts WHERE id = $1`, [
      target.postId,
    ]);
    if (!post) notFound('Gönderi bulunamadı.');
    if (post.author_id !== viewerId && role !== 'admin') {
      forbidden('Bu gönderiye medya ekleyemezsiniz.');
    }
  }
}

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  app.post('/upload', async (req, reply) => {
    const viewer = await requireViewer(req);
    const body = parseBody(uploadBody, req.body);
    assertMime(body.mimeType);
    await assertTargetPermission(viewer.id, viewer.role, body);

    const base64 = body.dataBase64.replace(/^data:[^;]+;base64,/, '');
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      throw new ApiError(422, 'INVALID_MEDIA', 'Dosya verisi okunamadı.');
    }
    if (buffer.length === 0) throw new ApiError(422, 'INVALID_MEDIA', 'Dosya boş.');
    if (buffer.length > env.maxUploadBytes) {
      throw new ApiError(
        413,
        'UPLOAD_TOO_LARGE',
        translate(req.locale, 'Dosya en fazla {limit} MB olabilir.', {
          limit: env.MAX_UPLOAD_MB,
        }),
      );
    }

    const key = newStorageKey(body.mimeType);
    await saveBuffer(key, buffer, body.mimeType);

    const rows = await query<Record<string, any>>(
      `INSERT INTO media
         (owner_id, kind, status, storage_key, original_name, mime_type, byte_size,
          asset_id, entry_id, post_id)
       VALUES ($1, $2, 'ready', $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        viewer.id,
        kindFor(body.mimeType),
        key,
        body.filename?.slice(0, 255) ?? `dosya.${MIME_EXTENSIONS[body.mimeType]}`,
        body.mimeType,
        buffer.length,
        body.assetId ?? null,
        body.entryId ?? null,
        body.postId ?? null,
      ],
    );
    const media = await mapMedia(rows[0]!);
    await audit(viewer.id, 'media.uploaded', 'media', media.id, { bytes: buffer.length }, req.ip);
    return reply.status(201).send({ data: { media } });
  });

  app.post('/presign', async (req, reply) => {
    const viewer = await requireViewer(req);
    const body = parseBody(presignBody, req.body);
    assertMime(body.mimeType);
    if (env.STORAGE_DRIVER !== 's3') {
      throw new ApiError(
        409,
        'DIRECT_UPLOAD_REQUIRED',
        'Yerel depolamada doğrudan yükleme kullanılmalıdır.',
      );
    }
    if (body.byteSize > env.maxUploadBytes) {
      throw new ApiError(
        413,
        'UPLOAD_TOO_LARGE',
        translate(req.locale, 'Dosya en fazla {limit} MB olabilir.', {
          limit: env.MAX_UPLOAD_MB,
        }),
      );
    }

    const key = newStorageKey(body.mimeType);
    const rows = await query<Record<string, any>>(
      `INSERT INTO media
         (owner_id, kind, status, storage_key, original_name, mime_type, byte_size)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6)
       RETURNING *`,
      [
        viewer.id,
        kindFor(body.mimeType),
        key,
        body.filename?.slice(0, 255) ?? `dosya.${MIME_EXTENSIONS[body.mimeType]}`,
        body.mimeType,
        body.byteSize,
      ],
    );
    const uploadUrl = await presignedPutUrl(key, body.mimeType, body.byteSize);
    return reply.status(201).send({
      data: { media: await mapMedia(rows[0]!), upload: { method: 'PUT', url: uploadUrl, expiresIn: 900 } },
    });
  });

  app.post('/:id/complete', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await queryOne<Record<string, any>>(
      `SELECT * FROM media WHERE id = $1 AND owner_id = $2`,
      [id, viewer.id],
    );
    if (!row) notFound('Medya bulunamadı.');
    if (!row.storage_key || !(await objectExists(row.storage_key))) {
      throw new ApiError(422, 'UPLOAD_MISSING', 'Yükleme tamamlanmamış.');
    }
    const updated = await query<Record<string, any>>(
      `UPDATE media SET status = 'ready' WHERE id = $1 RETURNING *`,
      [id],
    );
    await audit(viewer.id, 'media.completed', 'media', id, {}, req.ip);
    return { data: { media: await mapMedia(updated[0]!) } };
  });

  app.get('/', async (req) => {
    const viewer = await requireViewer(req);
    const params = parseQuery(
      z.object({
        kind: z.enum(['all', 'image', 'document', 'video']).default('all'),
        q: z.string().trim().max(120).optional(),
        assetId: uuid.optional(),
        limit: z.string().optional(),
        cursor: z.string().optional(),
      }),
      req.query,
    );
    const limit = limitFrom(params.limit, 24, 60);
    const cursor = decodeCursor(params.cursor);
    const clauses = [`a.owner_id = $1`, `a.deleted_at IS NULL`, `m.status = 'ready'`];
    const filterParams: unknown[] = [viewer.id];
    let index = 2;

    if (params.kind !== 'all') {
      clauses.push(`m.kind = $${index}::media_kind`);
      filterParams.push(params.kind);
      index += 1;
    }
    if (params.assetId) {
      clauses.push(`m.asset_id = $${index}`);
      filterParams.push(params.assetId);
      index += 1;
    }
    if (params.q) {
      clauses.push(`(a.title ILIKE $${index} OR m.original_name ILIKE $${index})`);
      filterParams.push(`%${params.q}%`);
      index += 1;
    }

    const pageClauses = [...clauses];
    const pageParams = [...filterParams];
    let pageIndex = index;
    if (cursor) {
      pageClauses.push(
        `(m.created_at, m.id) < ($${pageIndex}::timestamptz, $${pageIndex + 1}::uuid)`,
      );
      pageParams.push(cursor.at, cursor.id);
      pageIndex += 2;
    }

    const [rows, counts] = await Promise.all([
      query<Record<string, any>>(
        `SELECT m.*, a.title AS asset_title, a.type_id AS asset_type_id,
                t.label AS asset_type_label,
                je.title AS entry_title, je.occurred_at AS entry_occurred_at
         FROM media m
         JOIN assets a ON a.id = m.asset_id
         JOIN asset_types t ON t.id = a.type_id
         LEFT JOIN journal_entries je ON je.id = m.entry_id AND je.deleted_at IS NULL
         WHERE ${pageClauses.join(' AND ')}
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT $${pageIndex}`,
        [...pageParams, limit + 1],
      ),
      queryOne<Record<string, string>>(
        `SELECT count(*) AS total,
                count(*) FILTER (WHERE m.kind = 'image') AS images,
                count(*) FILTER (WHERE m.kind = 'document') AS documents,
                count(*) FILTER (WHERE m.kind = 'video') AS videos
         FROM media m
         JOIN assets a ON a.id = m.asset_id
         WHERE ${clauses.join(' AND ')}`,
        filterParams,
      ),
    ]);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
      data: {
        items: await Promise.all(
          pageRows.map(async (row) => ({
            ...(await mapMedia(row)),
            asset: {
              id: row.asset_id,
              title: row.asset_title,
              typeId: row.asset_type_id,
              typeLabel: translateTypeLabel(req.locale, row.asset_type_label),
            },
            entry: row.entry_id
              ? {
                  id: row.entry_id,
                  title: row.entry_title,
                  occurredAt: row.entry_occurred_at
                    ? new Date(row.entry_occurred_at).toISOString()
                    : null,
                }
              : null,
          })),
        ),
        nextCursor:
          hasMore && last ? encodeCursor({ at: new Date(last.created_at).toISOString(), id: last.id }) : null,
        counts: {
          total: Number(counts?.total ?? 0),
          images: Number(counts?.images ?? 0),
          documents: Number(counts?.documents ?? 0),
          videos: Number(counts?.videos ?? 0),
        },
      },
    };
  });

  app.get('/:id', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await queryOne<Record<string, any>>(
      `SELECT m.*, a.visibility AS asset_visibility, a.owner_id AS asset_owner,
              p.author_id AS post_author, p.audience AS post_audience
       FROM media m
       LEFT JOIN assets a ON a.id = m.asset_id
       LEFT JOIN posts p ON p.id = m.post_id
       WHERE m.id = $1`,
      [id],
    );
    if (!row) notFound('Medya bulunamadı.');
    const visible =
      row.owner_id === viewer.id ||
      viewer.role === 'admin' ||
      (row.asset_visibility === 'public' && row.asset_owner) ||
      (row.post_id && row.post_audience === 'public');
    if (!visible) forbidden('Bu medyayı görüntüleme yetkiniz yok.');
    return { data: { media: await mapMedia(row) } };
  });
}
