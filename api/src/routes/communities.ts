import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { query, queryOne, transaction } from '../db.js';
import { communityRole } from '../lib/access.js';
import { audit } from '../lib/audit.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { iso, parseBody, parseQuery } from '../lib/http.js';
import { notify } from '../lib/notify.js';
import { optionalViewer, requireViewer } from '../lib/session.js';
import { mapCommunity, mapUserMini } from '../lib/serialize.js';

const slugPattern = /^[a-z0-9-]{3,60}$/;

function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
    Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
  };
  return value
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  mine: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(20),
});

const createBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional().nullable(),
  visibility: z.enum(['public', 'private']).default('public'),
  slug: z.string().trim().regex(slugPattern).optional(),
  coverUrl: z.string().url().max(500).optional().nullable(),
});

const communitySelect = `
  SELECT c.*, u.username AS owner_username, u.display_name AS owner_display_name,
         u.avatar_url AS owner_avatar_url,
         (SELECT count(*) FROM memberships m WHERE m.community_id = c.id) AS member_count,
         (SELECT count(*) FROM posts p
          WHERE p.community_id = c.id AND p.status = 'visible') AS post_count
  FROM communities c
  JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
`;

export async function communityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (req) => {
    const viewer = await optionalViewer(req);
    const params = parseQuery(listQuery, req.query);
    const offset = (params.page - 1) * params.limit;
    const sqlParams: unknown[] = [];
    const clauses = ['c.deleted_at IS NULL'];
    let index = 1;

    if (params.mine === 'true') {
      if (!viewer) return { data: { items: [], page: 1, pageSize: params.limit, total: 0 } };
      clauses.push(`EXISTS (SELECT 1 FROM memberships m WHERE m.community_id = c.id AND m.user_id = $${index})`);
      sqlParams.push(viewer.id);
      index += 1;
    } else {
      clauses.push(`(c.visibility = 'public' OR EXISTS (
        SELECT 1 FROM memberships m WHERE m.community_id = c.id AND m.user_id = $${index}
      ))`);
      sqlParams.push(viewer?.id ?? '00000000-0000-0000-0000-000000000000');
      index += 1;
    }
    if (params.q) {
      clauses.push(`(c.name ILIKE $${index} OR c.description ILIKE $${index})`);
      sqlParams.push(`%${params.q}%`);
      index += 1;
    }

    const rows = await query<Record<string, any>>(
      `${communitySelect}
       WHERE ${clauses.join(' AND ')}
       ORDER BY c.created_at DESC
       LIMIT $${index} OFFSET $${index + 1}`,
      [...sqlParams, params.limit, offset],
    );
    const total = await queryOne<{ count: string }>(
      `SELECT count(*) FROM communities c WHERE ${clauses.join(' AND ')}`,
      sqlParams,
    );
    const withRoles = await Promise.all(
      rows.map(async (row) => {
        const role = viewer ? await communityRole(row.id, viewer.id) : null;
        return mapCommunity({ ...row, role });
      }),
    );
    return {
      data: {
        items: withRoles,
        page: params.page,
        pageSize: params.limit,
        total: Number(total?.count ?? 0),
      },
    };
  });

  app.post('/', async (req, reply) => {
    const viewer = await requireViewer(req);
    const body = parseBody(createBody, req.body);
    let slug = body.slug ?? slugify(body.name);
    if (!slugPattern.test(slug)) slug = `topluluk-${randomBytes(3).toString('hex')}`;

    const exists = await queryOne<{ id: string }>(`SELECT id FROM communities WHERE slug = $1`, [slug]);
    if (exists) {
      if (body.slug) conflict('Bu topluluk adresi zaten kullanılıyor.');
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    const community = await transaction(async (client) => {
      const inserted = await client.query<Record<string, any>>(
        `INSERT INTO communities (slug, name, description, visibility, cover_url, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [slug, body.name, body.description?.trim() || null, body.visibility, body.coverUrl ?? null, viewer.id],
      );
      const id = inserted.rows[0]!.id;
      await client.query(
        `INSERT INTO memberships (community_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [id, viewer.id],
      );
      return inserted.rows[0]!;
    });

    await audit(viewer.id, 'community.created', 'community', community.id, {}, req.ip);
    return reply.status(201).send({
      data: {
        community: mapCommunity({
          ...community,
          owner_username: viewer.username,
          owner_display_name: viewer.displayName,
          owner_avatar_url: viewer.avatarUrl,
          member_count: 1,
          post_count: 0,
          role: 'owner',
        }),
      },
    });
  });

  app.get('/:slug', async (req) => {
    const viewer = await optionalViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const row = await queryOne<Record<string, any>>(`${communitySelect} WHERE c.slug = $1 AND c.deleted_at IS NULL`, [
      slug,
    ]);
    if (!row) notFound('Topluluk bulunamadı.');
    const role = viewer ? await communityRole(row.id, viewer.id) : null;
    if (
      row.visibility === 'private' &&
      !role &&
      viewer?.role !== 'admin' &&
      viewer?.role !== 'moderator'
    ) {
      forbidden('Bu topluluk özeldir.');
    }

    const members = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, m.role, m.joined_at
       FROM memberships m JOIN users u ON u.id = m.user_id AND u.deleted_at IS NULL
       WHERE m.community_id = $1
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, m.joined_at
       LIMIT 12`,
      [row.id],
    );

    return {
      data: {
        community: mapCommunity({ ...row, role }),
        members: members.map((member) => ({
          user: mapUserMini(member),
          role: member.role,
          joinedAt: iso(member.joined_at),
        })),
        isMember: Boolean(role),
        canPost: Boolean(role),
      },
    };
  });

  app.patch('/:slug', async (req) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const body = parseBody(
      z.object({
        name: z.string().trim().min(2).max(80).optional(),
        description: z.string().trim().max(1000).optional().nullable(),
        visibility: z.enum(['public', 'private']).optional(),
        coverUrl: z.string().url().max(500).optional().nullable(),
      }),
      req.body,
    );
    const row = await queryOne<{ id: string; owner_id: string }>(
      `SELECT id, owner_id FROM communities WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!row) notFound('Topluluk bulunamadı.');
    const role = await communityRole(row.id, viewer.id);
    if (row.owner_id !== viewer.id && role !== 'moderator' && viewer.role !== 'admin') {
      forbidden('Topluluğu yalnızca sahibi veya moderatörü düzenleyebilir.');
    }
    await query(
      `UPDATE communities SET
         name = COALESCE($2, name),
         description = CASE WHEN $3::boolean THEN $4 ELSE description END,
         visibility = COALESCE($5, visibility),
         cover_url = CASE WHEN $6::boolean THEN $7 ELSE cover_url END
       WHERE id = $1`,
      [
        row.id,
        body.name ?? null,
        body.description !== undefined,
        body.description ?? null,
        body.visibility ?? null,
        body.coverUrl !== undefined,
        body.coverUrl ?? null,
      ],
    );
    await audit(viewer.id, 'community.updated', 'community', row.id, {}, req.ip);
    const updated = await queryOne<Record<string, any>>(`${communitySelect} WHERE c.id = $1`, [row.id]);
    return { data: { community: mapCommunity({ ...updated, role }) } };
  });

  app.post('/:slug/join', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const community = await queryOne<{ id: string; name: string; owner_id: string; visibility: string }>(
      `SELECT id, name, owner_id, visibility FROM communities WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!community) notFound('Topluluk bulunamadı.');
    if (community.visibility === 'private') {
      forbidden('Özel topluluklara katılım davetle yapılır.');
    }
    const inserted = await query(
      `INSERT INTO memberships (community_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING community_id`,
      [community.id, viewer.id],
    );
    if (inserted.length > 0) {
      await notify({
        userId: community.owner_id,
        actorId: viewer.id,
        type: 'community_join',
        entityType: 'community',
        entityId: community.id,
        message: `${viewer.displayName}, ${community.name} topluluğuna katıldı.`,
      });
      await audit(viewer.id, 'community.joined', 'community', community.id, {}, req.ip);
    }
    return reply.status(201).send({ data: { joined: true } });
  });

  app.delete('/:slug/join', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const community = await queryOne<{ id: string; owner_id: string }>(
      `SELECT id, owner_id FROM communities WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!community) notFound('Topluluk bulunamadı.');
    if (community.owner_id === viewer.id) {
      conflict('Topluluk sahibi topluluktan ayrılamaz. Önce sahipliği devredin.');
    }
    await query(`DELETE FROM memberships WHERE community_id = $1 AND user_id = $2`, [
      community.id,
      viewer.id,
    ]);
    await audit(viewer.id, 'community.left', 'community', community.id, {}, req.ip);
    return reply.status(204).send();
  });

  app.get('/:slug/members', async (req) => {
    const viewer = await optionalViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const params = parseQuery(
      z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(48).default(24) }),
      req.query,
    );
    const community = await queryOne<{ id: string; visibility: string }>(
      `SELECT id, visibility FROM communities WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!community) notFound('Topluluk bulunamadı.');
    const role = viewer ? await communityRole(community.id, viewer.id) : null;
    if (community.visibility === 'private' && !role && viewer?.role !== 'admin' && viewer?.role !== 'moderator') {
      forbidden();
    }
    const offset = (params.page - 1) * params.limit;
    const rows = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, m.role, m.joined_at
       FROM memberships m JOIN users u ON u.id = m.user_id AND u.deleted_at IS NULL
       WHERE m.community_id = $1
       ORDER BY m.joined_at DESC
       LIMIT $2 OFFSET $3`,
      [community.id, params.limit, offset],
    );
    return {
      data: {
        items: rows.map((row) => ({
          user: mapUserMini(row),
          role: row.role,
          joinedAt: iso(row.joined_at),
        })),
      },
    };
  });

  app.get('/:slug/membership', async (req) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const community = await queryOne<{ id: string }>(
      `SELECT id FROM communities WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!community) notFound('Topluluk bulunamadı.');
    const role = await communityRole(community.id, viewer.id);
    return { data: { isMember: Boolean(role), role } };
  });
}
