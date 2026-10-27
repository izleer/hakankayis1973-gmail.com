import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { decodeCursor, encodeCursor, limitFrom, parseQuery } from '../lib/http.js';
import { optionalViewer, requireViewer } from '../lib/session.js';
import { mapUserMini } from '../lib/serialize.js';

const uuid = z.string().uuid();

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (req) => {
    const viewer = await requireViewer(req);
    const params = parseQuery(
      z.object({
        unreadOnly: z.enum(['true', 'false']).default('false'),
        limit: z.string().optional(),
        cursor: z.string().optional(),
      }),
      req.query,
    );
    const limit = limitFrom(params.limit, 20, 50);
    const cursor = decodeCursor(params.cursor);
    const sqlParams: unknown[] = [viewer.id];
    const clauses = ['n.user_id = $1'];
    let index = 2;
    if (params.unreadOnly === 'true') clauses.push('n.read_at IS NULL');
    if (cursor) {
      clauses.push(`(n.created_at, n.id) < ($${index}::timestamptz, $${index + 1}::uuid)`);
      sqlParams.push(cursor.at, cursor.id);
      index += 2;
    }

    const rows = await query<Record<string, any>>(
      `SELECT n.*, u.username AS actor_username, u.display_name AS actor_display_name,
              u.avatar_url AS actor_avatar_url
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT $${index}`,
      [...sqlParams, limit + 1],
    );
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];
    const unread = await queryOne<{ count: string }>(
      `SELECT count(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [viewer.id],
    );

    return {
      data: {
        items: pageRows.map((row) => ({
          id: row.id,
          type: row.type,
          entityType: row.entity_type,
          entityId: row.entity_id,
          message: row.message,
          readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
          createdAt: new Date(row.created_at).toISOString(),
          actor: row.actor_id ? mapUserMini(row, 'actor_') : null,
        })),
        unreadCount: Number(unread?.count ?? 0),
        nextCursor:
          hasMore && last
            ? encodeCursor({ at: new Date(last.created_at).toISOString(), id: last.id })
            : null,
      },
    };
  });

  app.post('/read-all', async (req) => {
    const viewer = await requireViewer(req);
    await query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [
      viewer.id,
    ]);
    return { data: { ok: true } };
  });

  app.post('/:id/read', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    await query(`UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2`, [
      id,
      viewer.id,
    ]);
    return { data: { ok: true } };
  });
}
