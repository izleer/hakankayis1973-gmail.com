import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { audit } from '../lib/audit.js';
import { notFound } from '../lib/errors.js';
import { iso, parseBody, parseQuery } from '../lib/http.js';
import { requireStaff } from '../lib/session.js';
import { mapUserMini } from '../lib/serialize.js';

const uuid = z.string().uuid();

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/stats', async (req) => {
    await requireStaff(req);
    const row = await queryOne<Record<string, string>>(
      `SELECT
         (SELECT count(*) FROM users WHERE deleted_at IS NULL) AS users,
         (SELECT count(*) FROM assets WHERE deleted_at IS NULL) AS assets,
         (SELECT count(*) FROM journal_entries WHERE deleted_at IS NULL) AS entries,
         (SELECT count(*) FROM posts WHERE status = 'visible') AS posts,
         (SELECT count(*) FROM communities WHERE deleted_at IS NULL) AS communities,
         (SELECT count(*) FROM reports WHERE status IN ('open', 'reviewing')) AS open_reports,
         (SELECT count(*) FROM reports WHERE status = 'resolved') AS resolved_reports`,
    );
    return {
      data: {
        users: Number(row?.users ?? 0),
        assets: Number(row?.assets ?? 0),
        entries: Number(row?.entries ?? 0),
        posts: Number(row?.posts ?? 0),
        communities: Number(row?.communities ?? 0),
        openReports: Number(row?.open_reports ?? 0),
        resolvedReports: Number(row?.resolved_reports ?? 0),
      },
    };
  });

  app.get('/reports', async (req) => {
    await requireStaff(req);
    const params = parseQuery(
      z.object({
        status: z.enum(['open', 'reviewing', 'resolved', 'dismissed', 'all']).default('open'),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      }),
      req.query,
    );
    const offset = (params.page - 1) * params.limit;
    const sqlParams: unknown[] = [];
    const clauses: string[] = [];
    let index = 1;
    if (params.status !== 'all') {
      clauses.push(`r.status = $${index}`);
      sqlParams.push(params.status);
      index += 1;
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = await query<Record<string, any>>(
      `SELECT r.*, u.username AS reporter_username, u.display_name AS reporter_display_name,
              u.avatar_url AS reporter_avatar_url,
              CASE r.target_type
                WHEN 'post' THEN (SELECT left(p.body, 180) FROM posts p WHERE p.id = r.target_id)
                WHEN 'comment' THEN (SELECT left(c.body, 180) FROM comments c WHERE c.id = r.target_id)
                WHEN 'user' THEN (SELECT u2.username::text FROM users u2 WHERE u2.id = r.target_id)
                WHEN 'asset' THEN (SELECT a.title FROM assets a WHERE a.id = r.target_id)
                WHEN 'entry' THEN (SELECT je.title FROM journal_entries je WHERE je.id = r.target_id)
              END AS target_preview
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       ${where}
       ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
                r.created_at ASC
       LIMIT $${index} OFFSET $${index + 1}`,
      [...sqlParams, params.limit, offset],
    );
    const total = await queryOne<{ count: string }>(
      `SELECT count(*) FROM reports r ${where}`,
      sqlParams,
    );

    return {
      data: {
        items: rows.map((row) => ({
          id: row.id,
          targetType: row.target_type,
          targetId: row.target_id,
          targetPreview: row.target_preview,
          reason: row.reason,
          details: row.details,
          status: row.status,
          reporter: mapUserMini(row, 'reporter_'),
          handledBy: row.handled_by,
          handledAt: iso(row.handled_at),
          resolutionNote: row.resolution_note,
          createdAt: iso(row.created_at),
        })),
        page: params.page,
        pageSize: params.limit,
        total: Number(total?.count ?? 0),
      },
    };
  });

  app.patch('/reports/:id', async (req) => {
    const viewer = await requireStaff(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const body = parseBody(
      z.object({
        status: z.enum(['reviewing', 'resolved', 'dismissed']),
        resolutionNote: z.string().trim().max(1000).optional().nullable(),
        hideTarget: z.boolean().default(false),
      }),
      req.body,
    );
    const report = await queryOne<Record<string, any>>(`SELECT * FROM reports WHERE id = $1`, [id]);
    if (!report) notFound('Bildirim bulunamadı.');

    await query(
      `UPDATE reports SET status = $2, handled_by = $3, handled_at = now(),
         resolution_note = COALESCE($4, resolution_note)
       WHERE id = $1`,
      [id, body.status, viewer.id, body.resolutionNote?.trim() || null],
    );

    if (body.hideTarget && body.status === 'resolved') {
      if (report.target_type === 'post') {
        await query(`UPDATE posts SET status = 'hidden' WHERE id = $1`, [report.target_id]);
      } else if (report.target_type === 'comment') {
        await query(`UPDATE comments SET status = 'hidden' WHERE id = $1`, [report.target_id]);
      } else if (report.target_type === 'asset') {
        await query(`UPDATE assets SET status = 'archived' WHERE id = $1`, [report.target_id]);
      } else if (report.target_type === 'entry') {
        await query(`UPDATE journal_entries SET deleted_at = now() WHERE id = $1`, [
          report.target_id,
        ]);
      }
    }

    await audit(viewer.id, 'report.reviewed', 'report', id, {
      status: body.status,
      hideTarget: body.hideTarget,
    }, req.ip);

    const updated = await queryOne<Record<string, any>>(`SELECT * FROM reports WHERE id = $1`, [id]);
    return {
      data: {
        report: {
          id: updated!.id,
          status: updated!.status,
          handledAt: iso(updated!.handled_at),
          resolutionNote: updated!.resolution_note,
        },
      },
    };
  });

  app.post('/posts/:id/hide', async (req) => {
    const viewer = await requireStaff(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    await query(`UPDATE posts SET status = 'hidden' WHERE id = $1`, [id]);
    await audit(viewer.id, 'post.hidden', 'post', id, {}, req.ip);
    return { data: { hidden: true } };
  });

  app.post('/posts/:id/unhide', async (req) => {
    const viewer = await requireStaff(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    await query(`UPDATE posts SET status = 'visible' WHERE id = $1`, [id]);
    await audit(viewer.id, 'post.unhidden', 'post', id, {}, req.ip);
    return { data: { hidden: false } };
  });

  app.get('/users', async (req) => {
    await requireStaff(req);
    const params = parseQuery(
      z.object({ q: z.string().trim().max(80).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) }),
      req.query,
    );
    const rows = await query<Record<string, any>>(
      `SELECT id, username, display_name, avatar_url, role, created_at
       FROM users
       WHERE deleted_at IS NULL
         AND ($1::text IS NULL OR username ILIKE $1 OR display_name ILIKE $1)
       ORDER BY created_at DESC LIMIT $2`,
      [params.q ? `%${params.q}%` : null, params.limit],
    );
    return {
      data: {
        items: rows.map((row) => ({
          ...mapUserMini(row),
          role: row.role,
          createdAt: iso(row.created_at),
        })),
      },
    };
  });
}
