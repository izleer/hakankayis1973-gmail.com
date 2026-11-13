import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { query, queryOne, transaction } from '../db.js';
import {
  canManageCommunity,
  communityRole,
  type CommunityRole,
} from '../lib/access.js';
import { audit } from '../lib/audit.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import {
  getGroupAsset,
  requireActiveGroupAsset,
  type GroupAssetScope,
} from '../lib/groups.js';
import { iso, parseBody, parseQuery } from '../lib/http.js';
import {
  mapAsset,
  mapCommunity,
  mapEntry,
  mapUserMini,
  mediaForEntries,
} from '../lib/serialize.js';
import { notify } from '../lib/notify.js';
import { optionalViewer, requireViewer } from '../lib/session.js';
import { canonicalMediaRef, mediaRefUrl } from '../lib/storage.js';

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

const coverUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === '' || /^https?:\/\//.test(value) || value.startsWith('/files/'),
    'Kapak adresi geçerli değil.',
  );

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(60).optional(),
  mine: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(20),
});

const createBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  rules: z.string().trim().max(2000).optional().nullable(),
  visibility: z.enum(['public', 'private']).default('public'),
  joinPolicy: z.enum(['open', 'approval']).default('open'),
  slug: z.string().trim().regex(slugPattern).optional(),
  coverUrl: coverUrl.optional().nullable(),
});

const editBody = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  rules: z.string().trim().max(2000).optional().nullable(),
  visibility: z.enum(['public', 'private']).optional(),
  joinPolicy: z.enum(['open', 'approval']).optional(),
  coverUrl: coverUrl.optional().nullable(),
});

const scope = z.enum(['summary', 'timeline', 'all']);

const assetBody = z.object({
  assetId: z.string().uuid(),
  scope: scope.default('summary'),
});

const assetEditBody = z.object({
  scope: scope.optional(),
  status: z.enum(['active', 'removed']).optional(),
});

const communitySelect = `
  SELECT c.*, u.username AS owner_username, u.display_name AS owner_display_name,
         u.avatar_url AS owner_avatar_url,
         (SELECT count(*) FROM memberships m
          WHERE m.community_id = c.id AND m.status = 'active') AS member_count,
         (SELECT count(*) FROM posts p
          WHERE p.community_id = c.id AND p.status = 'visible') AS post_count,
         (SELECT count(DISTINCT x.asset_id) FROM (
            SELECT ga.asset_id FROM group_assets ga
            WHERE ga.community_id = c.id AND ga.status = 'active'
            UNION
            SELECT ma.id FROM assets ma
            WHERE ma.manager_community_id = c.id AND ma.deleted_at IS NULL
              AND c.visibility = 'private'
          ) x) AS asset_count
  FROM communities c
  JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
`;

const sharedAssetSelect = `
  SELECT ga.id AS share_id, ga.visibility_scope, ga.shared_at, ga.added_by_user_id,
         a.*, u.username AS owner_username, u.display_name AS owner_display_name,
         u.avatar_url AS owner_avatar_url,
         mc.id AS manager_id, mc.slug AS manager_slug, mc.name AS manager_name,
         t.label AS type_label, t.parent_id AS type_parent_id, t.icon AS type_icon,
         cm.storage_key AS cover_storage_key,
         ab.id AS added_by_id,
         ab.username AS added_by_username, ab.display_name AS added_by_display_name,
         ab.avatar_url AS added_by_avatar_url,
         (SELECT count(*) FROM journal_entries je
          WHERE je.asset_id = a.id AND je.deleted_at IS NULL) AS entry_count
  FROM group_assets ga
  JOIN assets a ON a.id = ga.asset_id AND a.deleted_at IS NULL
  JOIN users u ON u.id = a.owner_id AND u.deleted_at IS NULL
  JOIN asset_types t ON t.id = a.type_id
  LEFT JOIN communities mc ON mc.id = a.manager_community_id AND mc.deleted_at IS NULL
  LEFT JOIN media cm ON cm.id = a.cover_media_id
  JOIN users ab ON ab.id = ga.added_by_user_id AND ab.deleted_at IS NULL
`;

const managedAssetSelect = `
  SELECT a.*, u.username AS owner_username, u.display_name AS owner_display_name,
         u.avatar_url AS owner_avatar_url,
         mc.id AS manager_id, mc.slug AS manager_slug, mc.name AS manager_name,
         t.label AS type_label, t.parent_id AS type_parent_id, t.icon AS type_icon,
         cm.storage_key AS cover_storage_key,
         (SELECT count(*) FROM journal_entries je
          WHERE je.asset_id = a.id AND je.deleted_at IS NULL) AS entry_count
  FROM assets a
  JOIN users u ON u.id = a.owner_id AND u.deleted_at IS NULL
  JOIN asset_types t ON t.id = a.type_id
  LEFT JOIN communities mc ON mc.id = a.manager_community_id AND mc.deleted_at IS NULL
  LEFT JOIN media cm ON cm.id = a.cover_media_id
`;

async function loadCommunity(slug: string) {
  const row = await queryOne<Record<string, any>>(
    `${communitySelect} WHERE c.slug = $1 AND c.deleted_at IS NULL`,
    [slug],
  );
  if (!row) notFound('Topluluk bulunamadı.');
  return row;
}

async function requireManager(communityId: string, viewer: { id: string; role: string }) {
  const role = await communityRole(communityId, viewer.id);
  if (!canManageCommunity(role) && viewer.role !== 'admin') {
    forbidden('Bu işlem için grup yöneticisi olmalısınız.');
  }
  return role;
}

async function requireMember(communityId: string, viewerId: string): Promise<CommunityRole> {
  const role = await communityRole(communityId, viewerId);
  if (!role) forbidden('Bu grubun içeriğini görmek için üye olmalısınız.');
  return role;
}

function mapSharedAsset(row: Record<string, any>, asset: Record<string, unknown>) {
  return {
    ...asset,
    shareId: row.share_id,
    scope: row.visibility_scope as GroupAssetScope,
    sharedAt: iso(row.shared_at),
    addedBy: mapUserMini(row, 'added_by_'),
    managed: false,
  };
}

function mapManagedAsset(row: Record<string, any>, asset: Record<string, unknown>) {
  return {
    ...asset,
    shareId: null,
    scope: 'all' as GroupAssetScope,
    sharedAt: iso(row.created_at),
    addedBy: mapUserMini(row, 'owner_'),
    managed: true,
  };
}

async function loadSharedAsset(communityId: string, assetId: string) {
  const row = await queryOne<Record<string, any>>(
    `${sharedAssetSelect}
     WHERE ga.community_id = $1 AND ga.asset_id = $2
       AND ga.status = 'active' AND a.deleted_at IS NULL`,
    [communityId, assetId],
  );
  if (!row) notFound('Bu varlık gruba eklenmemiş.');
  return row;
}

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
      clauses.push(`EXISTS (SELECT 1 FROM memberships m
        WHERE m.community_id = c.id AND m.user_id = $${index} AND m.status = 'active')`);
      sqlParams.push(viewer.id);
      index += 1;
    } else {
      clauses.push(`(c.visibility = 'public' OR EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.community_id = c.id AND m.user_id = $${index} AND m.status = 'active'
      ))`);
      sqlParams.push(viewer?.id ?? '00000000-0000-0000-0000-000000000000');
      index += 1;
    }
    if (params.q) {
      clauses.push(`(c.name ILIKE $${index} OR c.description ILIKE $${index})`);
      sqlParams.push(`%${params.q}%`);
      index += 1;
    }
    if (params.category) {
      clauses.push(`c.category = $${index}`);
      sqlParams.push(params.category);
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
        const pending = viewer
          ? await queryOne<{ exists: boolean }>(
              `SELECT true AS exists FROM memberships
               WHERE community_id = $1 AND user_id = $2 AND status = 'pending'`,
              [row.id, viewer.id],
            )
          : null;
        return mapCommunity({ ...row, role, membership_pending: Boolean(pending) });
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
        `INSERT INTO communities
           (slug, name, description, category, rules, visibility, join_policy, cover_url, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          slug,
          body.name,
          body.description?.trim() || null,
          body.category?.trim() || null,
          body.rules?.trim() || null,
          body.visibility,
          body.joinPolicy,
          canonicalMediaRef(body.coverUrl) || null,
          viewer.id,
        ],
      );
      const id = inserted.rows[0]!.id;
      await client.query(
        `INSERT INTO memberships (community_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')`,
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
          asset_count: 0,
          role: 'owner',
        }),
      },
    });
  });

  // Davetler — grup detayından önce tanımlanır.
  app.get('/invitations/mine', async (req) => {
    const viewer = await requireViewer(req);
    const rows = await query<Record<string, any>>(
      `SELECT gi.*, c.slug AS community_slug, c.name AS community_name,
              c.cover_url AS community_cover_url,
              iu.username AS inviter_username, iu.display_name AS inviter_display_name,
              iu.avatar_url AS inviter_avatar_url
       FROM group_invitations gi
       JOIN communities c ON c.id = gi.community_id AND c.deleted_at IS NULL
       JOIN users iu ON iu.id = gi.inviter_id AND iu.deleted_at IS NULL
       WHERE gi.invitee_id = $1 AND gi.status = 'pending' AND gi.expires_at > now()
       ORDER BY gi.created_at DESC`,
      [viewer.id],
    );
    return {
      data: {
        items: rows.map((row) => ({
          id: row.id,
          createdAt: iso(row.created_at),
          expiresAt: iso(row.expires_at),
          community: {
            id: row.community_id,
            slug: row.community_slug,
            name: row.community_name,
            coverUrl: mediaRefUrl(row.community_cover_url),
          },
          inviter: mapUserMini(row, 'inviter_'),
        })),
      },
    };
  });

  app.post('/invitations/:id/accept', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const invitation = await queryOne<Record<string, any>>(
      `SELECT gi.*, c.slug AS community_slug, c.name AS community_name
       FROM group_invitations gi
       JOIN communities c ON c.id = gi.community_id AND c.deleted_at IS NULL
       WHERE gi.id = $1 AND gi.invitee_id = $2`,
      [id, viewer.id],
    );
    if (!invitation) notFound('Davet bulunamadı.');
    if (invitation.status !== 'pending') conflict('Bu davet artık geçerli değil.');
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      conflict('Davetin süresi dolmuş.');
    }

    await query(
      `INSERT INTO memberships (community_id, user_id, role, status, invited_by)
       VALUES ($1, $2, 'member', 'active', $3)
       ON CONFLICT (community_id, user_id)
       DO UPDATE SET status = 'active', invited_by = EXCLUDED.invited_by`,
      [invitation.community_id, viewer.id, invitation.inviter_id],
    );
    await query(
      `UPDATE group_invitations SET status = 'accepted', responded_at = now() WHERE id = $1`,
      [id],
    );
    await notify({
      userId: invitation.inviter_id,
      actorId: viewer.id,
      type: 'community_approved',
      entityType: 'community',
      entityId: invitation.community_id,
      messageKey: '{actor}, {community} grubuna katıldı.',
      messageParams: { actor: viewer.displayName, community: invitation.community_name },
    });
    await audit(viewer.id, 'community.invitation_accepted', 'community', invitation.community_id, {}, req.ip);
    return {
      data: {
        community: {
          id: invitation.community_id,
          slug: invitation.community_slug,
          name: invitation.community_name,
        },
      },
    };
  });

  app.post('/invitations/:id/decline', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const invitation = await queryOne<Record<string, any>>(
      `SELECT * FROM group_invitations WHERE id = $1 AND invitee_id = $2`,
      [id, viewer.id],
    );
    if (!invitation) notFound('Davet bulunamadı.');
    await query(
      `UPDATE group_invitations SET status = 'declined', responded_at = now()
       WHERE id = $1 AND status = 'pending'`,
      [id],
    );
    return { data: { ok: true } };
  });

  app.get('/:slug', async (req) => {
    const viewer = await optionalViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const row = await loadCommunity(slug);
    const role = viewer ? await communityRole(row.id, viewer.id) : null;
    const pending = viewer
      ? await queryOne<{ exists: boolean }>(
          `SELECT true AS exists FROM memberships
           WHERE community_id = $1 AND user_id = $2 AND status = 'pending'`,
          [row.id, viewer.id],
        )
      : null;
    const isStaff = viewer?.role === 'admin' || viewer?.role === 'moderator';
    if (row.visibility === 'private' && !role && !pending && !isStaff) {
      forbidden('Bu topluluk özeldir.');
    }

    const members = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, m.role, m.joined_at
       FROM memberships m JOIN users u ON u.id = m.user_id AND u.deleted_at IS NULL
       WHERE m.community_id = $1 AND m.status = 'active'
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,
                m.joined_at
       LIMIT 24`,
      [row.id],
    );

    return {
      data: {
        community: mapCommunity({
          ...row,
          role,
          membership_pending: Boolean(pending),
        }),
        members: members.map((member) => ({
          user: mapUserMini(member),
          role: member.role as CommunityRole,
          joinedAt: iso(member.joined_at),
        })),
        isMember: Boolean(role),
        isOwner: row.owner_id === viewer?.id,
        canPost: Boolean(role),
        canManage: canManageCommunity(role) || viewer?.role === 'admin',
        membershipStatus: role ? 'active' : pending ? 'pending' : null,
      },
    };
  });

  app.patch('/:slug', async (req) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const body = parseBody(editBody, req.body);
    const row = await queryOne<{ id: string; owner_id: string }>(
      `SELECT id, owner_id FROM communities WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!row) notFound('Topluluk bulunamadı.');
    const role = await communityRole(row.id, viewer.id);
    if (!canManageCommunity(role) && viewer.role !== 'admin') {
      forbidden('Topluluğu yalnızca yöneticiler düzenleyebilir.');
    }
    await query(
      `UPDATE communities SET
         name = COALESCE($2, name),
         description = CASE WHEN $3::boolean THEN $4 ELSE description END,
         visibility = COALESCE($5, visibility),
         cover_url = CASE WHEN $6::boolean THEN $7 ELSE cover_url END,
         category = CASE WHEN $8::boolean THEN $9 ELSE category END,
         rules = CASE WHEN $10::boolean THEN $11 ELSE rules END,
         join_policy = COALESCE($12::community_join_policy, join_policy)
       WHERE id = $1`,
      [
        row.id,
        body.name ?? null,
        body.description !== undefined,
        body.description ?? null,
        body.visibility ?? null,
        body.coverUrl !== undefined,
        canonicalMediaRef(body.coverUrl) || null,
        body.category !== undefined,
        body.category?.trim() || null,
        body.rules !== undefined,
        body.rules?.trim() || null,
        body.joinPolicy ?? null,
      ],
    );
    await audit(viewer.id, 'community.updated', 'community', row.id, {}, req.ip);
    const updated = await queryOne<Record<string, any>>(`${communitySelect} WHERE c.id = $1`, [row.id]);
    return { data: { community: mapCommunity({ ...updated, role }) } };
  });

  app.post('/:slug/join', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const community = await queryOne<{
      id: string;
      name: string;
      owner_id: string;
      visibility: 'public' | 'private';
      join_policy: 'open' | 'approval';
    }>(
      `SELECT id, name, owner_id, visibility, join_policy
       FROM communities WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!community) notFound('Topluluk bulunamadı.');
    if (community.owner_id === viewer.id) {
      return reply.status(200).send({ data: { joined: true, pending: false } });
    }

    const existing = await queryOne<{ role: CommunityRole; status: 'active' | 'pending' }>(
      `SELECT role, status FROM memberships WHERE community_id = $1 AND user_id = $2`,
      [community.id, viewer.id],
    );
    if (existing?.status === 'active') {
      return reply.status(200).send({ data: { joined: true, pending: false } });
    }
    if (existing?.status === 'pending') {
      return reply.status(200).send({ data: { joined: false, pending: true } });
    }
    if (community.visibility === 'private') {
      forbidden('Özel topluluklara katılım davetle yapılır.');
    }

    const needsApproval = community.join_policy === 'approval';
    await query(
      `INSERT INTO memberships (community_id, user_id, role, status)
       VALUES ($1, $2, 'member', $3::membership_status)
       ON CONFLICT (community_id, user_id) DO NOTHING`,
      [community.id, viewer.id, needsApproval ? 'pending' : 'active'],
    );

    if (needsApproval) {
      await notify({
        userId: community.owner_id,
        actorId: viewer.id,
        type: 'community_request',
        entityType: 'community',
        entityId: community.id,
        messageKey: '{actor}, {community} grubuna katılma isteği gönderdi.',
        messageParams: { actor: viewer.displayName, community: community.name },
      });
      await audit(viewer.id, 'community.join_requested', 'community', community.id, {}, req.ip);
      return reply.status(201).send({ data: { joined: false, pending: true } });
    }

    await notify({
      userId: community.owner_id,
      actorId: viewer.id,
      type: 'community_join',
      entityType: 'community',
      entityId: community.id,
      messageKey: '{actor}, {community} topluluğuna katıldı.',
      messageParams: { actor: viewer.displayName, community: community.name },
    });
    await audit(viewer.id, 'community.joined', 'community', community.id, {}, req.ip);
    return reply.status(201).send({ data: { joined: true, pending: false } });
  });

  // Üye grubu açtığında panel özetindeki okunmamış sayaçlar sıfırlanır.
  app.post('/:slug/seen', async (req) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const community = await loadCommunity(slug);
    await requireMember(community.id, viewer.id);
    const row = await queryOne<{ last_seen_at: Date }>(
      `UPDATE memberships SET last_seen_at = now()
       WHERE community_id = $1 AND user_id = $2 AND status = 'active'
       RETURNING last_seen_at`,
      [community.id, viewer.id],
    );
    return { data: { seenAt: iso(row?.last_seen_at) } };
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
    const community = await loadCommunity(slug);
    const role = viewer ? await communityRole(community.id, viewer.id) : null;
    if (community.visibility === 'private' && !role && viewer?.role !== 'admin' && viewer?.role !== 'moderator') {
      forbidden();
    }
    const offset = (params.page - 1) * params.limit;
    const rows = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, m.role, m.joined_at
       FROM memberships m JOIN users u ON u.id = m.user_id AND u.deleted_at IS NULL
       WHERE m.community_id = $1 AND m.status = 'active'
       ORDER BY m.joined_at DESC
       LIMIT $2 OFFSET $3`,
      [community.id, params.limit, offset],
    );
    return {
      data: {
        items: rows.map((row) => ({
          user: mapUserMini(row),
          role: row.role as CommunityRole,
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
    const row = await queryOne<{ role: CommunityRole; status: 'active' | 'pending' }>(
      `SELECT role, status FROM memberships WHERE community_id = $1 AND user_id = $2`,
      [community.id, viewer.id],
    );
    return {
      data: {
        isMember: row?.status === 'active',
        role: row?.status === 'active' ? row.role : null,
        status: row?.status ?? null,
      },
    };
  });

  app.patch('/:slug/members/:userId', async (req) => {
    const viewer = await requireViewer(req);
    const { slug, userId } = z
      .object({ slug: z.string().min(1).max(60), userId: z.string().uuid() })
      .parse(req.params);
    const body = parseBody(
      z.object({ role: z.enum(['member', 'moderator', 'admin']) }),
      req.body,
    );
    const community = await loadCommunity(slug);
    const managerRole = await communityRole(community.id, viewer.id);
    if (managerRole !== 'owner' && managerRole !== 'admin' && viewer.role !== 'admin') {
      forbidden('Üye rollerini yalnızca grup sahibi veya yöneticisi değiştirebilir.');
    }
    const target = await queryOne<{ role: CommunityRole; status: string }>(
      `SELECT role, status FROM memberships WHERE community_id = $1 AND user_id = $2`,
      [community.id, userId],
    );
    if (!target || target.status !== 'active') notFound('Grup üyesi bulunamadı.');
    if (target.role === 'owner') conflict('Grup sahibinin rolü değiştirilemez.');
    if (body.role === 'admin' && managerRole !== 'owner' && viewer.role !== 'admin') {
      forbidden('Yönetici atamasını yalnızca grup sahibi yapabilir.');
    }
    await query(
      `UPDATE memberships SET role = $3::community_role
       WHERE community_id = $1 AND user_id = $2`,
      [community.id, userId, body.role],
    );
    await notify({
      userId,
      actorId: viewer.id,
      type: 'system',
      entityType: 'community',
      entityId: community.id,
      messageKey: '{community} grubundaki rolünüz güncellendi.',
      messageParams: { community: community.name },
    });
    return { data: { role: body.role } };
  });

  app.delete('/:slug/members/:userId', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { slug, userId } = z
      .object({ slug: z.string().min(1).max(60), userId: z.string().uuid() })
      .parse(req.params);
    const community = await loadCommunity(slug);
    await requireManager(community.id, viewer);
    const target = await queryOne<{ role: CommunityRole }>(
      `SELECT role FROM memberships WHERE community_id = $1 AND user_id = $2`,
      [community.id, userId],
    );
    if (!target) notFound('Grup üyesi bulunamadı.');
    if (target.role === 'owner') conflict('Grup sahibi gruptan çıkarılamaz.');
    await query(`DELETE FROM memberships WHERE community_id = $1 AND user_id = $2`, [
      community.id,
      userId,
    ]);
    return reply.status(204).send();
  });

  app.get('/:slug/requests', async (req) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const community = await loadCommunity(slug);
    await requireManager(community.id, viewer);

    const requests = await query<Record<string, any>>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, m.joined_at
       FROM memberships m JOIN users u ON u.id = m.user_id AND u.deleted_at IS NULL
       WHERE m.community_id = $1 AND m.status = 'pending'
       ORDER BY m.joined_at ASC`,
      [community.id],
    );
    const invitations = await query<Record<string, any>>(
      `SELECT gi.*, iu.username, iu.display_name, iu.avatar_url
       FROM group_invitations gi
       JOIN users iu ON iu.id = gi.invitee_id AND iu.deleted_at IS NULL
       WHERE gi.community_id = $1 AND gi.status = 'pending' AND gi.expires_at > now()
       ORDER BY gi.created_at DESC`,
      [community.id],
    );
    return {
      data: {
        requests: requests.map((row) => ({
          user: mapUserMini(row),
          requestedAt: iso(row.joined_at),
        })),
        invitations: invitations.map((row) => ({
          id: row.id,
          invitee: mapUserMini(row, ''),
          createdAt: iso(row.created_at),
          expiresAt: iso(row.expires_at),
        })),
      },
    };
  });

  app.post('/:slug/requests/:userId/approve', async (req) => {
    const viewer = await requireViewer(req);
    const { slug, userId } = z
      .object({ slug: z.string().min(1).max(60), userId: z.string().uuid() })
      .parse(req.params);
    const community = await loadCommunity(slug);
    await requireManager(community.id, viewer);
    const updated = await query<{ user_id: string }>(
      `UPDATE memberships SET status = 'active'
       WHERE community_id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING user_id`,
      [community.id, userId],
    );
    if (updated.length === 0) notFound('Bekleyen üyelik isteği bulunamadı.');
    await notify({
      userId,
      actorId: viewer.id,
      type: 'community_approved',
      entityType: 'community',
      entityId: community.id,
      messageKey: '{community} grubuna katılım isteğiniz onaylandı.',
      messageParams: { community: community.name },
    });
    await audit(viewer.id, 'community.join_approved', 'community', community.id, { userId }, req.ip);
    return { data: { approved: true } };
  });

  app.delete('/:slug/requests/:userId', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { slug, userId } = z
      .object({ slug: z.string().min(1).max(60), userId: z.string().uuid() })
      .parse(req.params);
    const community = await loadCommunity(slug);
    await requireManager(community.id, viewer);
    await query(
      `DELETE FROM memberships WHERE community_id = $1 AND user_id = $2 AND status = 'pending'`,
      [community.id, userId],
    );
    return reply.status(204).send();
  });

  app.post('/:slug/invitations', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const body = parseBody(
      z.object({ username: z.string().trim().min(3).max(30) }),
      req.body,
    );
    const community = await loadCommunity(slug);
    await requireManager(community.id, viewer);
    const invitee = await queryOne<{ id: string; display_name: string }>(
      `SELECT id, display_name FROM users
       WHERE username = $1 AND deleted_at IS NULL`,
      [body.username],
    );
    if (!invitee) notFound('Davet edilecek kullanıcı bulunamadı.');
    if (invitee.id === viewer.id) conflict('Kendinizi davet edemezsiniz.');

    const active = await queryOne<{ exists: boolean }>(
      `SELECT true AS exists FROM memberships
       WHERE community_id = $1 AND user_id = $2 AND status = 'active'`,
      [community.id, invitee.id],
    );
    if (active) conflict('Bu kullanıcı zaten grubun üyesi.');

    const pending = await queryOne<{ id: string }>(
      `SELECT id FROM group_invitations
       WHERE community_id = $1 AND invitee_id = $2 AND status = 'pending'`,
      [community.id, invitee.id],
    );
    if (pending) conflict('Bu kullanıcıya zaten bekleyen bir davet var.');

    const rows = await query<Record<string, any>>(
      `INSERT INTO group_invitations (community_id, inviter_id, invitee_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [community.id, viewer.id, invitee.id],
    );
    const invitation = rows[0]!;
    await notify({
      userId: invitee.id,
      actorId: viewer.id,
      type: 'community_invite',
      entityType: 'community_invitation',
      entityId: invitation.id,
      messageKey: '{actor}, sizi {community} grubuna davet etti.',
      messageParams: { actor: viewer.displayName, community: community.name },
    });
    await audit(viewer.id, 'community.invited', 'community', community.id, { inviteeId: invitee.id }, req.ip);
    return reply.status(201).send({
      data: {
        invitation: {
          id: invitation.id,
          invitee: { id: invitee.id, displayName: invitee.display_name },
          createdAt: iso(invitation.created_at),
        },
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Gruba dahil edilen varlıklar
  // ---------------------------------------------------------------------------
  app.get('/:slug/assets', async (req) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const community = await loadCommunity(slug);
    await requireMember(community.id, viewer.id);

    const [sharedRows, managedRows] = await Promise.all([
      query<Record<string, any>>(
        `${sharedAssetSelect}
         WHERE ga.community_id = $1 AND ga.status = 'active' AND a.deleted_at IS NULL
           AND a.manager_community_id IS DISTINCT FROM $1
         ORDER BY ga.shared_at DESC`,
        [community.id],
      ),
      // Ortak yönetim yalnızca özel gruplarda geçerlidir; grup herkese
      // açıldığında atama sessizce etkisizleşir ve varlık listeden düşer.
      community.visibility === 'private'
        ? query<Record<string, any>>(
            `${managedAssetSelect}
             WHERE a.manager_community_id = $1 AND a.deleted_at IS NULL
             ORDER BY a.created_at DESC`,
            [community.id],
          )
        : Promise.resolve([] as Record<string, any>[]),
    ]);
    const items = [
      ...(await Promise.all(
        sharedRows.map(async (row) =>
          mapSharedAsset(row, await mapAsset(row, req.locale)),
        ),
      )),
      ...(await Promise.all(
        managedRows.map(async (row) =>
          mapManagedAsset(row, await mapAsset(row, req.locale)),
        ),
      )),
    ].sort((a, b) => String(b.sharedAt ?? '').localeCompare(String(a.sharedAt ?? '')));
    return { data: { items } };
  });

  app.post('/:slug/assets', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { slug } = z.object({ slug: z.string().min(1).max(60) }).parse(req.params);
    const body = parseBody(assetBody, req.body);
    const community = await loadCommunity(slug);
    await requireMember(community.id, viewer.id);

    const asset = await queryOne<{ id: string; owner_id: string; manager_community_id: string | null }>(
      `SELECT id, owner_id, manager_community_id FROM assets WHERE id = $1 AND deleted_at IS NULL`,
      [body.assetId],
    );
    if (!asset) notFound('Varlık bulunamadı.');
    if (asset.manager_community_id === community.id) {
      conflict('Bu varlık zaten grubun ortak yönetiminde.');
    }
    if (asset.owner_id !== viewer.id && viewer.role !== 'admin') {
      forbidden('Gruba yalnızca kendi varlıklarınızı ekleyebilirsiniz.');
    }

    const rows = await query<Record<string, any>>(
      `INSERT INTO group_assets
         (community_id, asset_id, added_by_user_id, visibility_scope, status)
       VALUES ($1, $2, $3, $4::group_asset_scope, 'active')
       ON CONFLICT (community_id, asset_id) DO UPDATE SET
         added_by_user_id = EXCLUDED.added_by_user_id,
         visibility_scope = EXCLUDED.visibility_scope,
         status = 'active',
         shared_at = now(),
         removed_at = NULL
       RETURNING *`,
      [community.id, body.assetId, viewer.id, body.scope],
    );
    await audit(viewer.id, 'group_asset.shared', 'asset', body.assetId, {
      communityId: community.id,
      scope: body.scope,
    }, req.ip);
    return reply.status(201).send({
      data: {
        share: {
          id: rows[0]!.id,
          scope: rows[0]!.visibility_scope,
          sharedAt: iso(rows[0]!.shared_at),
        },
      },
    });
  });

  app.patch('/:slug/assets/:assetId', async (req) => {
    const viewer = await requireViewer(req);
    const { slug, assetId } = z
      .object({ slug: z.string().min(1).max(60), assetId: z.string().uuid() })
      .parse(req.params);
    const body = parseBody(assetEditBody, req.body);
    const community = await loadCommunity(slug);
    const role = await requireMember(community.id, viewer.id);
    const share = await requireActiveGroupAsset(community.id, assetId);
    const asset = await queryOne<{ owner_id: string }>(
      `SELECT owner_id FROM assets WHERE id = $1`,
      [assetId],
    );
    const isOwner = asset?.owner_id === viewer.id;
    if (body.scope && !isOwner) {
      forbidden('Paylaşım kapsamını yalnızca varlık sahibi değiştirebilir.');
    }
    if (body.status && !isOwner && !canManageCommunity(role)) {
      forbidden('Bu paylaşımı kaldırma yetkiniz yok.');
    }
    await query(
      `UPDATE group_assets SET
         visibility_scope = COALESCE($3::group_asset_scope, visibility_scope),
         status = COALESCE($4::group_asset_status, status),
         removed_at = CASE
           WHEN $4::group_asset_status = 'removed' THEN COALESCE(removed_at, now())
           WHEN $4::group_asset_status = 'active' THEN NULL
           ELSE removed_at
         END
       WHERE id = $1 AND community_id = $2`,
      [share.id, community.id, body.scope ?? null, body.status ?? null],
    );
    return { data: { ok: true } };
  });

  app.delete('/:slug/assets/:assetId', async (req, reply) => {
    const viewer = await requireViewer(req);
    const { slug, assetId } = z
      .object({ slug: z.string().min(1).max(60), assetId: z.string().uuid() })
      .parse(req.params);
    const community = await loadCommunity(slug);
    const role = await requireMember(community.id, viewer.id);
    const share = await requireActiveGroupAsset(community.id, assetId);
    const asset = await queryOne<{ owner_id: string }>(
      `SELECT owner_id FROM assets WHERE id = $1`,
      [assetId],
    );
    if (asset?.owner_id !== viewer.id && !canManageCommunity(role)) {
      forbidden('Bu paylaşımı kaldırma yetkiniz yok.');
    }
    await query(
      `UPDATE group_assets SET status = 'removed', removed_at = now() WHERE id = $1`,
      [share.id],
    );
    return reply.status(204).send();
  });

  app.get('/:slug/assets/:assetId', async (req) => {
    const viewer = await requireViewer(req);
    const { slug, assetId } = z
      .object({ slug: z.string().min(1).max(60), assetId: z.string().uuid() })
      .parse(req.params);
    const community = await loadCommunity(slug);
    await requireMember(community.id, viewer.id);

    // Ortak yönetim, group_assets paylaşımından önce gelir: varlık bu gruba
    // atanmışsa tüm etkin üyeler kapsamdan bağımsız olarak tüm kayıtları görür.
    if (community.visibility === 'private') {
      const managedRow = await queryOne<Record<string, any>>(
        `${managedAssetSelect}
         WHERE a.manager_community_id = $1 AND a.id = $2 AND a.deleted_at IS NULL`,
        [community.id, assetId],
      );
      if (managedRow) {
        const entries = await query<Record<string, any>>(
          `SELECT je.*, u.username AS author_username, u.display_name AS author_display_name,
                  u.avatar_url AS author_avatar_url
           FROM journal_entries je
           JOIN users u ON u.id = je.author_id AND u.deleted_at IS NULL
           WHERE je.asset_id = $1 AND je.deleted_at IS NULL
           ORDER BY je.occurred_at DESC, je.id DESC`,
          [assetId],
        );
        const media = await mediaForEntries(entries.map((entry) => entry.id));
        return {
          data: {
            asset: await mapAsset(managedRow, req.locale),
            share: {
              scope: 'all' as GroupAssetScope,
              sharedAt: iso(managedRow.created_at),
              addedBy: mapUserMini(managedRow, 'owner_'),
              managed: true,
            },
            community: { id: community.id, slug: community.slug, name: community.name },
            entries: await Promise.all(
              entries.map((entry) => mapEntry(entry, media.get(entry.id) ?? [])),
            ),
          },
        };
      }
    }

    const shareRow = await getGroupAsset(community.id, assetId);
    if (shareRow?.status === 'active') {
      const row = await loadSharedAsset(community.id, assetId);
      const scopeValue = row.visibility_scope as GroupAssetScope;

      let entries: Record<string, any>[] = [];
      if (scopeValue !== 'summary') {
        const visibilityClause = scopeValue === 'timeline' ? `AND je.visibility = 'public'` : '';
        entries = await query<Record<string, any>>(
          `SELECT je.*, u.username AS author_username, u.display_name AS author_display_name,
                  u.avatar_url AS author_avatar_url
           FROM journal_entries je
           JOIN users u ON u.id = je.author_id AND u.deleted_at IS NULL
           WHERE je.asset_id = $1 AND je.deleted_at IS NULL ${visibilityClause}
           ORDER BY je.occurred_at DESC, je.id DESC`,
          [assetId],
        );
      }
      const media = await mediaForEntries(entries.map((entry) => entry.id));

      return {
        data: {
          asset: await mapAsset(row, req.locale),
          share: {
            scope: scopeValue,
            sharedAt: iso(row.shared_at),
            addedBy: mapUserMini(row, 'added_by_'),
            managed: false,
          },
          community: { id: community.id, slug: community.slug, name: community.name },
          entries: await Promise.all(
            entries.map((entry) => mapEntry(entry, media.get(entry.id) ?? [])),
          ),
        },
      };
    }

    notFound('Bu varlık gruba eklenmemiş.');
  });
}
