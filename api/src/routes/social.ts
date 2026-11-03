import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { env } from '../env.js';
import { audit } from '../lib/audit.js';
import {
  assertSocialConfigured,
  encryptSecret,
  missingSocialConfig,
  signState,
  socialConfigured,
  verifyState,
} from '../lib/crypto.js';
import { forbidden, notFound, ApiError } from '../lib/errors.js';
import {
  describeMetaError,
  exchangeCode,
  facebookLoginUrl,
  GRAPH_VERSION,
  listPages,
  MetaError,
  oauthRedirectUri,
  socialWebReturnUrl,
} from '../lib/meta.js';
import { iso, parseBody, parseQuery } from '../lib/http.js';
import { requireViewer } from '../lib/session.js';
import {
  performSocialShare,
  resolveShareMedia,
  type SocialConnectionRow,
  type SocialFormat,
  type SocialProvider,
} from '../lib/social-share.js';

const uuid = z.string().uuid();

function mediaPublicBaseReady(): boolean {
  if (env.STORAGE_DRIVER === 's3') return true;
  return Boolean(
    env.MEDIA_PUBLIC_BASE_URL || /^https:\/\//i.test(env.PUBLIC_API_URL),
  );
}

function configPayload() {
  return {
    configured: socialConfigured(),
    missing: missingSocialConfig(),
    graphVersion: GRAPH_VERSION,
    redirectUri: oauthRedirectUri(),
    webReturnUrl: socialWebReturnUrl(),
    mediaPublicReady: mediaPublicBaseReady(),
    instagramReady: socialConfigured() && mediaPublicBaseReady(),
  };
}

function mapConnection(row: SocialConnectionRow) {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.external_id,
    accountName: row.account_name,
    accountUsername: row.account_username,
    pageId: row.page_id,
    pageName: row.page_name,
    createdAt: iso(row.created_at),
  };
}

function mapShare(row: Record<string, any>) {
  return {
    id: row.id,
    assetId: row.asset_id,
    provider: row.provider,
    format: row.format,
    status: row.status,
    caption: row.caption,
    permalink: row.permalink,
    externalId: row.external_id,
    error: row.error,
    createdAt: iso(row.created_at),
    publishedAt: row.published_at ? iso(row.published_at) : null,
  };
}

function callbackRedirect(
  reply: FastifyReply,
  params: Record<string, string>,
): FastifyReply {
  const target = new URL(socialWebReturnUrl());
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }
  return reply.redirect(target.toString());
}

async function saveConnection(input: {
  userId: string;
  provider: SocialProvider;
  externalId: string;
  accountName: string;
  accountUsername: string | null;
  pageId: string;
  pageName: string;
  token: string;
}): Promise<void> {
  await query(
    `INSERT INTO social_connections
       (user_id, provider, external_id, account_name, account_username,
        page_id, page_name, token_cipher)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, provider, external_id)
     DO UPDATE SET
       account_name = EXCLUDED.account_name,
       account_username = EXCLUDED.account_username,
       page_id = EXCLUDED.page_id,
       page_name = EXCLUDED.page_name,
       token_cipher = EXCLUDED.token_cipher,
       updated_at = now()`,
    [
      input.userId,
      input.provider,
      input.externalId,
      input.accountName,
      input.accountUsername,
      input.pageId,
      input.pageName,
      encryptSecret(input.token),
    ],
  );
}

export async function socialRoutes(app: FastifyInstance): Promise<void> {
  app.get('/config', async (req) => {
    await requireViewer(req);
    return { data: configPayload() };
  });

  app.get('/connections', async (req) => {
    const viewer = await requireViewer(req);
    const rows = await query<SocialConnectionRow>(
      `SELECT * FROM social_connections
       WHERE user_id = $1
       ORDER BY provider, created_at`,
      [viewer.id],
    );
    return {
      data: {
        config: configPayload(),
        items: rows.map(mapConnection),
      },
    };
  });

  app.get('/facebook/start', async (req) => {
    const viewer = await requireViewer(req);
    assertSocialConfigured();
    const state = signState(viewer.id);
    await audit(viewer.id, 'social.oauth_started', 'user', viewer.id, {}, req.ip);
    return {
      data: {
        url: facebookLoginUrl(state),
        redirectUri: oauthRedirectUri(),
        expiresIn: 600,
      },
    };
  });

  app.get(
    '/callback',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const params = parseQuery(
        z.object({
          code: z.string().optional(),
          state: z.string().optional(),
          error: z.string().optional(),
          error_reason: z.string().optional(),
          error_description: z.string().optional(),
        }),
        req.query,
      );

      if (params.error) {
        return callbackRedirect(reply, { social: 'error', reason: 'denied' });
      }
      if (!params.code || !params.state) {
        return callbackRedirect(reply, { social: 'error', reason: 'invalid' });
      }

      try {
        const userId = verifyState(params.state);
        assertSocialConfigured();
        const userToken = await exchangeCode(params.code);
        const pages = await listPages(userToken);
        if (pages.length === 0) {
          return callbackRedirect(reply, { social: 'error', reason: 'no_page' });
        }

        let accounts = 0;
        for (const page of pages) {
          if (!page.access_token) continue;
          await saveConnection({
            userId,
            provider: 'facebook',
            externalId: page.id,
            accountName: page.name,
            accountUsername: null,
            pageId: page.id,
            pageName: page.name,
            token: page.access_token,
          });
          accounts += 1;

          const instagram = page.instagram_business_account;
          if (instagram?.id) {
            await saveConnection({
              userId,
              provider: 'instagram',
              externalId: instagram.id,
              accountName: instagram.name ?? instagram.username ?? page.name,
              accountUsername: instagram.username ?? null,
              pageId: page.id,
              pageName: page.name,
              token: page.access_token,
            });
            accounts += 1;
          }
        }

        if (accounts === 0) {
          return callbackRedirect(reply, { social: 'error', reason: 'no_page' });
        }
        await audit(userId, 'social.connected', 'user', userId, { accounts }, req.ip);
        return callbackRedirect(reply, {
          social: 'connected',
          accounts: String(accounts),
        });
      } catch (error) {
        req.log.error({ err: error }, 'Meta OAuth callback başarısız');
        return callbackRedirect(reply, { social: 'error', reason: 'token' });
      }
    },
  );

  app.delete('/connections/:id', async (req) => {
    const viewer = await requireViewer(req);
    const { id } = z.object({ id: uuid }).parse(req.params);
    const row = await queryOne<{ provider: string }>(
      `DELETE FROM social_connections
       WHERE id = $1 AND user_id = $2
       RETURNING provider`,
      [id, viewer.id],
    );
    if (!row) notFound('Sosyal bağlantı bulunamadı.');
    await audit(viewer.id, 'social.disconnected', 'social_connection', id, {
      provider: row.provider,
    }, req.ip);
    return { data: { ok: true } };
  });

  app.post(
    '/share',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (req) => {
      const viewer = await requireViewer(req);
      const body = parseBody(
        z.object({
          assetId: uuid,
          provider: z.enum(['facebook', 'instagram']),
          format: z.enum(['post', 'story', 'reel']),
          connectionId: uuid.optional(),
          mediaId: uuid.optional(),
          caption: z.string().trim().max(2200).optional(),
        }),
        req.body,
      );
      assertSocialConfigured();

      const asset = await queryOne<{ id: string; owner_id: string; title: string }>(
        `SELECT id, owner_id, title FROM assets WHERE id = $1 AND deleted_at IS NULL`,
        [body.assetId],
      );
      if (!asset) notFound('Varlık bulunamadı.');
      if (asset.owner_id !== viewer.id && viewer.role !== 'admin') {
        forbidden('Yalnızca sahibi olduğunuz varlıkları sosyal medyada paylaşabilirsiniz.');
      }

      const connection = body.connectionId
        ? await queryOne<SocialConnectionRow>(
            `SELECT * FROM social_connections
             WHERE id = $1 AND user_id = $2 AND provider = $3`,
            [body.connectionId, viewer.id, body.provider],
          )
        : await queryOne<SocialConnectionRow>(
            `SELECT * FROM social_connections
             WHERE user_id = $1 AND provider = $2
             ORDER BY created_at
             LIMIT 1`,
            [viewer.id, body.provider],
          );
      if (!connection) {
        throw new ApiError(
          409,
          'SOCIAL_NOT_CONNECTED',
          body.provider === 'facebook'
            ? 'Önce bir Facebook Sayfası bağlayın.'
            : 'Önce bağlı bir Instagram Business hesabı gerekiyor.',
        );
      }
      if (connection.token_expires_at && connection.token_expires_at < new Date()) {
        throw new ApiError(
          403,
          'SOCIAL_TOKEN_EXPIRED',
          'Sosyal bağlantının süresi dolmuş. Lütfen hesabı yeniden bağlayın.',
        );
      }

      const media = await resolveShareMedia({
        assetId: asset.id,
        format: body.format as SocialFormat,
        mediaId: body.mediaId,
      });

      const caption =
        body.format === 'story'
          ? null
          : body.caption?.trim() || `${asset.title} · izleer`;

      const created = await query<Record<string, any>>(
        `INSERT INTO social_shares
           (user_id, asset_id, connection_id, provider, format, status, caption, media_id)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
         RETURNING *`,
        [
          viewer.id,
          asset.id,
          connection.id,
          body.provider,
          body.format,
          caption,
          media.id,
        ],
      );
      const share = created[0]!;

      try {
        const published = await performSocialShare({
          connection,
          format: body.format as SocialFormat,
          media,
          caption,
        });
        const updated = await query<Record<string, any>>(
          `UPDATE social_shares
           SET status = 'published',
               external_id = $2,
               permalink = $3,
               error = NULL,
               published_at = now()
           WHERE id = $1
           RETURNING *`,
          [share.id, published.externalId, published.permalink],
        );
        await audit(viewer.id, 'social.shared', 'asset', asset.id, {
          provider: body.provider,
          format: body.format,
          shareId: share.id,
        }, req.ip);
        return { data: { share: mapShare(updated[0]!) } };
      } catch (error) {
        const message = describeMetaError(error);
        await query(
          `UPDATE social_shares
           SET status = 'failed', error = $2
           WHERE id = $1`,
          [share.id, message.slice(0, 1000)],
        );
        await audit(viewer.id, 'social.share_failed', 'asset', asset.id, {
          provider: body.provider,
          format: body.format,
          shareId: share.id,
        }, req.ip);

        if (error instanceof ApiError) throw error;
        const status =
          error instanceof MetaError
            ? error.code === 190
              ? 403
              : error.code === 4 || error.code === 17 || error.code === 32
                ? 429
                : error.code === 10 || error.code === 200
                  ? 403
                  : 502
            : 500;
        throw new ApiError(status, 'SOCIAL_PUBLISH_FAILED', message, {
          shareId: share.id,
        });
      }
    },
  );
}
