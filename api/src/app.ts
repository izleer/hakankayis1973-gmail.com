import { mkdir } from 'node:fs/promises';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import { env } from './env.js';
import { databaseSsl, databaseTarget, query, queryOne } from './db.js';
import { ApiError } from './lib/errors.js';
import { translate } from './lib/i18n/index.js';
import { negotiateLocale, type Locale } from './lib/locale.js';
import { ensureTaxonomy } from './lib/taxonomy.js';
import { storageRoot, verifyMediaSignature } from './lib/storage.js';
import { authRoutes } from './routes/auth.js';
import { assetTypeRoutes } from './routes/asset-types.js';
import { assetRoutes } from './routes/assets.js';
import { entryRoutes } from './routes/entries.js';
import { mediaRoutes } from './routes/media.js';
import { feedRoutes } from './routes/feed.js';
import { postRoutes } from './routes/posts.js';
import { communityRoutes } from './routes/communities.js';
import { userRoutes } from './routes/users.js';
import { notificationRoutes } from './routes/notifications.js';
import { safetyRoutes } from './routes/safety.js';
import { adminRoutes } from './routes/admin.js';
import { adminAssetTypeRoutes } from './routes/admin-asset-types.js';
import { searchRoutes } from './routes/search.js';
import { statsRoutes } from './routes/stats.js';
import { socialRoutes } from './routes/social.js';

declare module 'fastify' {
  interface FastifyRequest {
    locale: Locale;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'test' ? 'silent' : 'info' },
    trustProxy: true,
    bodyLimit: 16 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept-Language'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.decorateRequest('locale', 'tr');
  app.addHook('onRequest', async (req) => {
    req.locale = negotiateLocale(req.headers['accept-language']);
    try {
      await ensureTaxonomy(req.locale);
    } catch (error) {
      req.log.warn({ err: error }, 'Varlık türü çevirileri yüklenemedi');
    }
  });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    allowList: [],
  });

  app.setErrorHandler((error, req, reply) => {
    const locale = req.locale;
    if (error instanceof ApiError) {
      return reply.status(error.status).send({
        error: {
          code: error.code,
          message: translate(locale, error.message),
          details: error.details,
        },
      });
    }
    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: translate(locale, 'Gönderilen bilgiler geçerli değil.'),
          details: { fields: error.flatten().fieldErrors },
        },
      });
    }

    const pgCode = (error as { code?: string }).code;
    if (pgCode === '23505') {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: translate(locale, 'Bu kayıt zaten mevcut.') },
      });
    }
    if (pgCode === '23514' || pgCode === '23503') {
      return reply.status(422).send({
        error: {
          code: 'INVALID_DATA',
          message: translate(locale, 'Gönderilen bilgiler veri kurallarıyla uyuşmuyor.'),
        },
      });
    }
    if ((error as { statusCode?: number }).statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: translate(locale, 'Çok fazla istek gönderdiniz. Lütfen bekleyin.'),
        },
      });
    }

    req.log.error({ err: error }, 'Beklenmeyen API hatası');
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          env.NODE_ENV === 'production'
            ? translate(locale, 'Beklenmeyen bir hata oluştu.')
            : message,
      },
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: translate(req.locale, '{method} {url} bulunamadı.', {
          method: req.method,
          url: req.url,
        }),
      },
    });
  });

  if (env.STORAGE_DRIVER === 'local') {
    await mkdir(storageRoot, { recursive: true });
    // Ham depolama yolları yalnızca süreli imzayla sunulur; imza geçerli olsa
    // bile silinen/gizlenen medya DB kontrolüyle kapatılır. Böylece URL sızıntısı
    // kalıcı erişim vermez ve görünürlük değişiklikleri dosyalara da yansır.
    app.addHook('onRequest', async (req, reply) => {
      if (!req.url.startsWith('/files/')) return;
      let key = '';
      let expires: string | undefined;
      let signature: string | undefined;
      try {
        const url = new URL(req.url, 'http://localhost');
        key = decodeURIComponent(url.pathname.replace(/^\/files\//, ''));
        expires = url.searchParams.get('exp') ?? undefined;
        signature = url.searchParams.get('sig') ?? undefined;
      } catch {
        key = '';
      }
      if (!verifyMediaSignature(key, expires, signature)) {
        return reply.status(403).send({
          error: {
            code: 'MEDIA_FORBIDDEN',
            message: translate(req.locale, 'Medya adresi geçersiz veya süresi dolmuş.'),
          },
        });
      }
      // Seed görselleri kamuya açık demo içeriğidir ve media satırı yoktur.
      if (!key.startsWith('seed/')) {
        const row = await queryOne<{
          status: string;
          asset_deleted_at: Date | null;
          entry_deleted_at: Date | null;
          post_status: string | null;
        }>(
          `SELECT m.status, a.deleted_at AS asset_deleted_at,
                  je.deleted_at AS entry_deleted_at, p.status AS post_status
           FROM media m
           LEFT JOIN assets a ON a.id = m.asset_id
           LEFT JOIN journal_entries je ON je.id = m.entry_id
           LEFT JOIN posts p ON p.id = m.post_id
           WHERE m.storage_key = $1`,
          [key],
        );
        if (
          !row ||
          row.status !== 'ready' ||
          row.asset_deleted_at ||
          row.entry_deleted_at ||
          (row.post_status !== null && row.post_status !== 'visible')
        ) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: translate(req.locale, 'Medya bulunamadı.') },
          });
        }
      }
    });
    await app.register(fastifyStatic, {
      root: storageRoot,
      prefix: '/files/',
      index: false,
      cacheControl: false,
      setHeaders(res) {
        // İmzalı yanıtlar ortak önbelleklerde tutulmaz.
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    });
  }

  app.get('/', async () => ({
    data: {
      name: 'izleer API',
      version: '0.1.0',
      docs: '/v1',
      health: '/health',
    },
  }));

  app.get('/health', async (req, reply) => {
    try {
      await query('SELECT 1');
      return {
        status: 'ok',
        db: 'ok',
        dbPooler: databaseTarget.pooler,
        dbSsl: databaseSsl !== false,
        storage: env.STORAGE_DRIVER,
        uptime: Math.round(process.uptime()),
        now: new Date().toISOString(),
      };
    } catch (error) {
      req.log.error({ err: error }, 'Veritabanı sağlık kontrolü başarısız');
      return reply.status(503).send({ status: 'degraded', db: 'down' });
    }
  });

  await app.register(authRoutes, { prefix: '/v1/auth' });
  await app.register(assetTypeRoutes, { prefix: '/v1/asset-types' });
  await app.register(assetRoutes, { prefix: '/v1/assets' });
  await app.register(entryRoutes, { prefix: '/v1' });
  await app.register(mediaRoutes, { prefix: '/v1/media' });
  await app.register(feedRoutes, { prefix: '/v1/feed' });
  await app.register(postRoutes, { prefix: '/v1' });
  await app.register(communityRoutes, { prefix: '/v1/communities' });
  await app.register(userRoutes, { prefix: '/v1' });
  await app.register(notificationRoutes, { prefix: '/v1/notifications' });
  await app.register(safetyRoutes, { prefix: '/v1' });
  await app.register(adminRoutes, { prefix: '/v1/admin' });
  await app.register(adminAssetTypeRoutes, { prefix: '/v1/admin/asset-types' });
  await app.register(searchRoutes, { prefix: '/v1/search' });
  await app.register(statsRoutes, { prefix: '/v1/stats' });
  await app.register(socialRoutes, { prefix: '/v1/social' });

  return app;
}
