import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db.js';
import { decodeCursor, encodeCursor, limitFrom, parseQuery } from '../lib/http.js';
import { hydratePosts, postSelect } from '../lib/posts.js';
import { optionalViewer, requireViewer } from '../lib/session.js';

const feedQuery = z.object({
  scope: z.enum(['home', 'explore']).default('home'),
  q: z.string().trim().max(120).optional(),
  community: z.string().trim().max(60).optional(),
  author: z.string().trim().max(30).optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export async function feedRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (req) => {
    const params = parseQuery(feedQuery, req.query);
    const viewer = await optionalViewer(req);
    const limit = limitFrom(params.limit, 20, 50);
    const cursor = decodeCursor(params.cursor);
    const viewerId = viewer?.id ?? null;
    const sqlParams: unknown[] = [viewerId];
    const clauses: string[] = [`p.status = 'visible'`];
    let index = 2;

    if (params.community) {
      clauses.push(`c.slug = $${index}`);
      sqlParams.push(params.community);
      index += 1;
      // Grup akışı yalnızca etkin üyelere açıktır.
      clauses.push(`EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.community_id = c.id AND m.user_id = $${index} AND m.status = 'active'
      )`);
      sqlParams.push(viewerId ?? '00000000-0000-0000-0000-000000000000');
      index += 1;
      if (viewerId) {
        clauses.push(`NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = $${index} AND b.blocked_id = p.author_id)
             OR (b.blocker_id = p.author_id AND b.blocked_id = $${index})
        )`);
        sqlParams.push(viewerId);
        index += 1;
      }
      clauses.push(`(a.id IS NULL OR a.visibility = 'public' OR a.owner_id = $${index}
        OR EXISTS (
          SELECT 1 FROM group_assets ga
          WHERE ga.community_id = c.id AND ga.asset_id = a.id AND ga.status = 'active'
        ))`);
      sqlParams.push(viewerId ?? '00000000-0000-0000-0000-000000000000');
      index += 1;
    } else if (params.scope === 'explore') {
      clauses.push(`p.audience = 'public'`);
      clauses.push(`(a.id IS NULL OR a.visibility = 'public')`);
      if (params.author) {
        clauses.push(`u.username = $${index}`);
        sqlParams.push(params.author);
        index += 1;
      }
      if (params.q) {
        clauses.push(`(p.body ILIKE $${index} OR a.title ILIKE $${index} OR u.display_name ILIKE $${index})`);
        sqlParams.push(`%${params.q}%`);
        index += 1;
      }
      if (viewerId) {
        clauses.push(`NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = $${index} AND b.blocked_id = p.author_id)
             OR (b.blocker_id = p.author_id AND b.blocked_id = $${index})
        )`);
        sqlParams.push(viewerId);
        index += 1;
      }
    } else {
      if (!viewerId) {
        return { data: { items: [], nextCursor: null } };
      }
      clauses.push(`(
        p.author_id = $${index}
        OR (p.audience = 'public' AND EXISTS (
          SELECT 1 FROM follows f
          WHERE f.follower_id = $${index} AND f.following_id = p.author_id
        ))
        OR (p.audience = 'community' AND EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = $${index} AND m.community_id = p.community_id
            AND m.status = 'active'
        ))
      )`);
      sqlParams.push(viewerId);
      index += 1;
      clauses.push(`NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = $${index} AND b.blocked_id = p.author_id)
           OR (b.blocker_id = p.author_id AND b.blocked_id = $${index})
      )`);
      sqlParams.push(viewerId);
      index += 1;
      clauses.push(`(a.id IS NULL OR a.visibility = 'public' OR a.owner_id = $${index}
        OR EXISTS (
          SELECT 1 FROM group_assets ga
          WHERE ga.community_id = p.community_id AND ga.asset_id = a.id AND ga.status = 'active'
        ))`);
      sqlParams.push(viewerId);
      index += 1;
    }

    if (cursor) {
      clauses.push(`(p.created_at, p.id) < ($${index}::timestamptz, $${index + 1}::uuid)`);
      sqlParams.push(cursor.at, cursor.id);
      index += 2;
    }

    const rows = await query<Record<string, any>>(
      `${postSelect}
       WHERE ${clauses.join(' AND ')}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT $${index}`,
      [...sqlParams, limit + 1],
    );
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
      data: {
        items: await hydratePosts(pageRows),
        nextCursor:
          hasMore && last
            ? encodeCursor({ at: new Date(last.created_at).toISOString(), id: last.id })
            : null,
      },
    };
  });
}
