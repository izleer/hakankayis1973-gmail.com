import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { iso, parseBody } from '../lib/http.js';
import { requireViewer } from '../lib/session.js';

const uuid = z.string().uuid();

async function findUserByUsername(username: string) {
  const row = await queryOne<{ id: string; username: string; display_name: string }>(
    `SELECT id, username, display_name FROM users WHERE username = $1 AND deleted_at IS NULL`,
    [username],
  );
  if (!row) notFound('Kullanıcı bulunamadı.');
  return row;
}

const reportBody = z.object({
  targetType: z.enum(['post', 'comment', 'user', 'asset', 'entry']),
  targetId: uuid,
  reason: z.string().trim().min(3).max(120),
  details: z.string().trim().max(2000).optional().nullable(),
});

async function targetExists(targetType: string, targetId: string): Promise<boolean> {
  const table =
    targetType === 'post'
      ? 'posts'
      : targetType === 'comment'
        ? 'comments'
        : targetType === 'user'
          ? 'users'
          : targetType === 'asset'
            ? 'assets'
            : 'journal_entries';
  const row = await queryOne<{ exists: boolean }>(
    `SELECT true AS exists FROM ${table} WHERE id = $1`,
    [targetId],
  );
  return Boolean(row);
}

export async function safetyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/users/:username/block', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { username } = z.object({ username: z.string().min(1).max(30) }).parse(req.params);
    const target = await findUserByUsername(username);
    if (target.id === viewer.id) conflict('Kendinizi engelleyemezsiniz.');

    await query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [viewer.id, target.id],
    );
    await query(
      `DELETE FROM follows
       WHERE (follower_id = $1 AND following_id = $2)
          OR (follower_id = $2 AND following_id = $1)`,
      [viewer.id, target.id],
    );
    await audit(viewer.id, 'user.blocked', 'user', target.id, {}, req.ip);
    return reply.status(201).send({ data: { blocked: true } });
  });

  app.delete('/users/:username/block', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { username } = z.object({ username: z.string().min(1).max(30) }).parse(req.params);
    const target = await findUserByUsername(username);
    await query(`DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`, [
      viewer.id,
      target.id,
    ]);
    await audit(viewer.id, 'user.unblocked', 'user', target.id, {}, req.ip);
    return reply.status(204).send();
  });

  app.post('/reports', async (req, reply) => {
    const viewer = await requireViewer(req);
    const body = parseBody(reportBody, req.body);
    if (body.targetType === 'user' && body.targetId === viewer.id) {
      forbidden('Kendi hesabınızı bildiremezsiniz.');
    }
    if (!(await targetExists(body.targetType, body.targetId))) {
      notFound('Bildirilecek içerik bulunamadı.');
    }

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM reports
       WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3
         AND status IN ('open', 'reviewing')`,
      [viewer.id, body.targetType, body.targetId],
    );
    if (existing) conflict('Bu içerik için zaten açık bir bildiriminiz var.');

    const rows = await query<Record<string, any>>(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [viewer.id, body.targetType, body.targetId, body.reason, body.details?.trim() || null],
    );
    await audit(viewer.id, 'report.created', 'report', rows[0]!.id, {
      targetType: body.targetType,
      targetId: body.targetId,
    }, req.ip);
    return reply.status(201).send({
      data: {
        report: {
          id: rows[0]!.id,
          status: rows[0]!.status,
          createdAt: iso(rows[0]!.created_at),
        },
      },
    });
  });

  app.get('/reports/mine', async (req) => {
    const viewer = await requireViewer(req);
    const rows = await query<Record<string, any>>(
      `SELECT id, target_type, target_id, reason, status, created_at
       FROM reports WHERE reporter_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [viewer.id],
    );
    return {
      data: {
        items: rows.map((row) => ({
          id: row.id,
          targetType: row.target_type,
          targetId: row.target_id,
          reason: row.reason,
          status: row.status,
          createdAt: iso(row.created_at),
        })),
      },
    };
  });
}
