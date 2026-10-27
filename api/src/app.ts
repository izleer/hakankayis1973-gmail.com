import { mkdir } from 'node:fs/promises';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import { env } from './env.js';
import { query } from './db.js';
import { ApiError } from './lib/errors.js';
import { storageRoot } from './lib/storage.js';
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
import { searchRoutes } from './routes/search.js';
import { statsRoutes } from './routes/stats.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'test' ? 'silent' : 'info' },
    trustProxy: true,
    bodyLimit: 16 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    allowList: [],
  });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.status).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }
    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Gönderilen bilgiler geçerli değil.',
          details: { fields: error.flatten().fieldErrors },
        },
      });
    }

    const pgCode = (error as { code?: string }).code;
    if (pgCode === '23505') {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: 'Bu kayıt zaten mevcut.' },
      });
    }
    if (pgCode === '23514' || pgCode === '23503') {
      return reply.status(422).send({
        error: { code: 'INVALID_DATA', message: 'Gönderilen bilgiler veri kurallarıyla uyuşmuyor.' },
      });
    }
    if ((error as { statusCode?: number }).statusCode === 429) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Çok fazla istek gönderdiniz. Lütfen bekleyin.' },
      });
    }

    req.log.error({ err: error }, 'Beklenmeyen API hatası');
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production' ? 'Beklenmeyen bir hata oluştu.' : message,
      },
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `${req.method} ${req.url} bulunamadı.` },
    });
  });

  if (env.STORAGE_DRIVER === 'local') {
    await mkdir(storageRoot, { recursive: true });
    await app.register(fastifyStatic, {
      root: storageRoot,
      prefix: '/files/',
      index: false,
      maxAge: '1h',
      immutable: false,
    });
  }

  app.get('/', async () => ({
    data: {
      name: 'Varlık Hafızası API',
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
  await app.register(searchRoutes, { prefix: '/v1/search' });
  await app.register(statsRoutes, { prefix: '/v1/stats' });

  return app;
}
