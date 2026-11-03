import 'dotenv/config';
import { z } from 'zod';

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_DIR: z.string().default('./storage'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  S3_REGION: z.string().default('eu-central-1'),
  S3_BUCKET: z.string().default('varlik-hafizasi-media'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  // Meta (Facebook / Instagram) içerik paylaşımı
  META_APP_ID: optionalText,
  META_APP_SECRET: optionalText,
  META_GRAPH_VERSION: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().default('v26.0'),
  ),
  META_REDIRECT_URI: optionalUrl,
  SOCIAL_TOKEN_KEY: optionalText,
  SOCIAL_WEB_RETURN_URL: optionalUrl,
  MEDIA_PUBLIC_BASE_URL: optionalUrl,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Geçersiz ortam değişkenleri:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  maxUploadBytes: Math.floor(parsed.data.MAX_UPLOAD_MB * 1024 * 1024),
};

export type Env = typeof env;
