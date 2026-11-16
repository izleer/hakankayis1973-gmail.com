import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne, transaction } from '../db.js';
import { audit } from '../lib/audit.js';
import { badRequest, notFound } from '../lib/errors.js';
import { iso, parseBody, parseQuery } from '../lib/http.js';
import { LIMIT_KEYS, clearUserOverrideCache, refreshPlanLimits } from '../lib/plans.js';
import { requireAdmin, requireStaff } from '../lib/session.js';
import { mapUserMini } from '../lib/serialize.js';

const uuid = z.string().uuid();

const OVERRIDE_SCOPES = ['all', 'image', 'video', 'document'] as const;

function mapOverride(row: Record<string, any>) {
  return {
    limitKey: row.limit_key,
    scope: row.scope ?? 'all',
    maxValue: row.max_value === null ? null : Number(row.max_value),
    mode: row.mode,
    warningPct: Number(row.warning_pct),
    active: row.active,
    note: row.note ?? null,
    expiresAt: iso(row.expires_at),
    updatedAt: iso(row.updated_at),
    updatedBy: row.updated_by ?? null,
    updatedByUsername: row.updated_by_username ?? null,
  };
}

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

  // -------------------------------------------------------------------------
  // Plan limitleri — yalnızca admin. Değişiklikler denetim kaydına yazılır ve
  // API önbelleği anında tazelenir.
  // -------------------------------------------------------------------------

  app.get('/plan-limits', async (req) => {
    await requireAdmin(req);
    await refreshPlanLimits();
    const rows = await query<Record<string, any>>(
      `SELECT r.plan, r.limit_key, r.scope, r.max_value, r.mode, r.warning_pct,
              r.active, r.updated_at, r.updated_by, u.username AS updated_by_username
       FROM plan_limit_rules r
       LEFT JOIN users u ON u.id = r.updated_by
       ORDER BY r.plan, r.limit_key, r.scope`,
    );
    return {
      data: {
        rules: rows.map((row) => ({
          plan: row.plan,
          limitKey: row.limit_key,
          scope: row.scope,
          maxValue: row.max_value === null ? null : Number(row.max_value),
          mode: row.mode,
          warningPct: Number(row.warning_pct),
          active: row.active,
          updatedAt: iso(row.updated_at),
          updatedBy: row.updated_by ?? null,
          updatedByUsername: row.updated_by_username ?? null,
        })),
        keys: LIMIT_KEYS,
      },
    };
  });

  app.patch('/plan-limits', async (req) => {
    const viewer = await requireAdmin(req);
    const body = parseBody(
      z.object({
        updates: z
          .array(
            z.object({
              plan: z.enum(['free', 'premium']),
              limitKey: z.enum(LIMIT_KEYS),
              scope: z.string().trim().min(1).max(40).default('all'),
              maxValue: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
              mode: z.enum(['enforce', 'warn', 'shadow']),
              warningPct: z.number().int().min(1).max(100),
              active: z.boolean(),
            }),
          )
          .min(1)
          .max(50),
      }),
      req.body,
    );

    const changes: Record<string, unknown>[] = [];
    await transaction(async (client) => {
      for (const update of body.updates) {
        const before = await client.query(
          `SELECT max_value, mode, warning_pct, active
           FROM plan_limit_rules
           WHERE plan = $1 AND limit_key = $2 AND scope = $3
           FOR UPDATE`,
          [update.plan, update.limitKey, update.scope],
        );
        await client.query(
          `INSERT INTO plan_limit_rules
             (plan, limit_key, scope, max_value, mode, warning_pct, active, updated_at, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8)
           ON CONFLICT (plan, limit_key, scope) DO UPDATE SET
             max_value = EXCLUDED.max_value,
             mode = EXCLUDED.mode,
             warning_pct = EXCLUDED.warning_pct,
             active = EXCLUDED.active,
             updated_at = now(),
             updated_by = EXCLUDED.updated_by`,
          [
            update.plan,
            update.limitKey,
            update.scope,
            update.maxValue,
            update.mode,
            update.warningPct,
            update.active,
            viewer.id,
          ],
        );
        changes.push({
          plan: update.plan,
          limitKey: update.limitKey,
          scope: update.scope,
          before: before.rows[0] ?? null,
          after: update,
        });
      }
    });

    await audit(viewer.id, 'plan_limits.updated', 'plan_limit_rules', null, { changes }, req.ip);
    await refreshPlanLimits(true);
    return { data: { updated: changes.length } };
  });

  app.get('/plan-limits/history', async (req) => {
    await requireAdmin(req);
    const params = parseQuery(
      z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) }),
      req.query,
    );
    const rows = await query<Record<string, any>>(
      `SELECT e.id, e.action, e.metadata, e.created_at, e.actor_id,
              u.username AS actor_username, u.display_name AS actor_display_name
       FROM audit_events e
       LEFT JOIN users u ON u.id = e.actor_id
       WHERE e.entity_type = 'plan_limit_rules'
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT $1`,
      [params.limit],
    );
    return {
      data: {
        items: rows.map((row) => ({
          id: Number(row.id),
          action: row.action,
          metadata: row.metadata,
          createdAt: iso(row.created_at),
          actor: row.actor_id
            ? {
                id: row.actor_id,
                username: row.actor_username,
                displayName: row.actor_display_name,
              }
            : null,
        })),
      },
    };
  });

  // -------------------------------------------------------------------------
  // Kullanıcıya özel limit istisnaları — yalnızca admin. Plan kuralından
  // önce uygulanır; değişiklikler denetlenir ve kullanıcı önbelleği temizlenir.
  // -------------------------------------------------------------------------

  app.get('/users/:id/limit-overrides', async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const user = await queryOne<Record<string, any>>(
      `SELECT id, username, display_name, avatar_url, plan
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!user) notFound('Kullanıcı bulunamadı.');
    const rows = await query<Record<string, any>>(
      `SELECT o.limit_key, o.scope, o.max_value, o.mode, o.warning_pct, o.active,
              o.note, o.expires_at, o.updated_at, o.updated_by,
              u.username AS updated_by_username
       FROM user_limit_overrides o
       LEFT JOIN users u ON u.id = o.updated_by
       WHERE o.user_id = $1
       ORDER BY o.limit_key, o.scope`,
      [id],
    );
    return {
      data: {
        user: { ...mapUserMini(user), plan: user.plan },
        items: rows.map(mapOverride),
        scopes: OVERRIDE_SCOPES,
      },
    };
  });

  app.patch('/users/:id/limit-overrides', async (req) => {
    const viewer = await requireAdmin(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const body = parseBody(
      z.object({
        limitKey: z.enum(LIMIT_KEYS),
        scope: z.enum(OVERRIDE_SCOPES).default('all'),
        maxValue: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
        mode: z.enum(['enforce', 'warn', 'shadow']).default('enforce'),
        warningPct: z.number().int().min(1).max(100).default(80),
        active: z.boolean().default(true),
        note: z.string().trim().max(500).nullable().optional(),
        expiresAt: z.string().trim().max(40).nullable().optional(),
      }),
      req.body,
    );
    if (body.scope !== 'all' && body.limitKey !== 'max_file_bytes') {
      badRequest('Türe özel kapsam yalnızca tek dosya boyutu sınırı için kullanılabilir.');
    }
    const user = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!user) notFound('Kullanıcı bulunamadı.');

    let expiresAt: Date | null = null;
    if (body.expiresAt) {
      expiresAt = new Date(body.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) badRequest('Geçersiz son kullanma tarihi.');
    }

    let before: Record<string, unknown> | null = null;
    await transaction(async (client) => {
      const previous = await client.query(
        `SELECT max_value, mode, warning_pct, active, note, expires_at
         FROM user_limit_overrides
         WHERE user_id = $1 AND limit_key = $2 AND scope = $3
         FOR UPDATE`,
        [id, body.limitKey, body.scope],
      );
      before = previous.rows[0] ?? null;
      await client.query(
        `INSERT INTO user_limit_overrides
           (user_id, limit_key, scope, max_value, mode, warning_pct, active, note,
            expires_at, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10)
         ON CONFLICT (user_id, limit_key, scope) DO UPDATE SET
           max_value = EXCLUDED.max_value,
           mode = EXCLUDED.mode,
           warning_pct = EXCLUDED.warning_pct,
           active = EXCLUDED.active,
           note = EXCLUDED.note,
           expires_at = EXCLUDED.expires_at,
           updated_at = now(),
           updated_by = EXCLUDED.updated_by`,
        [
          id,
          body.limitKey,
          body.scope,
          body.maxValue,
          body.mode,
          body.warningPct,
          body.active,
          body.note?.trim() || null,
          expiresAt,
          viewer.id,
        ],
      );
    });

    await audit(
      viewer.id,
      'plan_override.updated',
      'user_limit_overrides',
      id,
      {
        limitKey: body.limitKey,
        scope: body.scope,
        before,
        after: {
          maxValue: body.maxValue,
          mode: body.mode,
          warningPct: body.warningPct,
          active: body.active,
          note: body.note ?? null,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
        },
      },
      req.ip,
    );
    clearUserOverrideCache(id);
    const row = await queryOne<Record<string, any>>(
      `SELECT o.limit_key, o.scope, o.max_value, o.mode, o.warning_pct, o.active,
              o.note, o.expires_at, o.updated_at, o.updated_by,
              u.username AS updated_by_username
       FROM user_limit_overrides o
       LEFT JOIN users u ON u.id = o.updated_by
       WHERE o.user_id = $1 AND o.limit_key = $2 AND o.scope = $3`,
      [id, body.limitKey, body.scope],
    );
    return { data: { override: row ? mapOverride(row) : null } };
  });

  app.delete('/users/:id/limit-overrides', async (req) => {
    const viewer = await requireAdmin(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const params = parseQuery(
      z.object({
        limitKey: z.enum(LIMIT_KEYS),
        scope: z.enum(OVERRIDE_SCOPES).default('all'),
      }),
      req.query,
    );
    const removed = await queryOne<Record<string, any>>(
      `DELETE FROM user_limit_overrides
       WHERE user_id = $1 AND limit_key = $2 AND scope = $3
       RETURNING limit_key, scope, max_value, mode, warning_pct, active`,
      [id, params.limitKey, params.scope],
    );
    if (!removed) notFound('Bu kullanıcı için böyle bir istisna yok.');
    await audit(
      viewer.id,
      'plan_override.deleted',
      'user_limit_overrides',
      id,
      { limitKey: params.limitKey, scope: params.scope, before: removed },
      req.ip,
    );
    clearUserOverrideCache(id);
    return { data: { deleted: true } };
  });
}
