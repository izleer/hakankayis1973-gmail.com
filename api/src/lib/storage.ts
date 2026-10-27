import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';

export const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'application/pdf': 'pdf',
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_EXTENSIONS);

export const storageRoot = path.resolve(process.cwd(), env.STORAGE_DIR);

let s3: S3Client | null = null;

function s3Client(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return s3;
}

function extensionFor(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] ?? 'bin';
}

export function newStorageKey(mimeType: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `media/${year}/${month}/${randomUUID()}.${extensionFor(mimeType)}`;
}

export function isSafeStorageKey(key: string): boolean {
  return /^media\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.[a-z0-9]{2,5}$/.test(key);
}

export async function saveBuffer(key: string, buffer: Buffer, mimeType: string): Promise<void> {
  if (env.STORAGE_DRIVER === 'local') {
    const target = path.join(storageRoot, key);
    if (!target.startsWith(storageRoot)) throw new Error('Geçersiz depolama yolu.');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);
    return;
  }

  await s3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
}

export async function presignedPutUrl(
  key: string,
  mimeType: string,
  byteSize: number,
): Promise<string> {
  return getSignedUrl(
    s3Client(),
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: mimeType,
      ContentLength: byteSize,
    }),
    { expiresIn: 900 },
  );
}

export async function objectExists(key: string): Promise<boolean> {
  if (env.STORAGE_DRIVER === 'local') {
    try {
      const { access } = await import('node:fs/promises');
      await access(path.join(storageRoot, key));
      return true;
    } catch {
      return false;
    }
  }
  try {
    await s3Client().send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function mediaUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  if (env.STORAGE_DRIVER === 'local') {
    // İstemciler kendi API köklerine göre çözer; böylece emülatör, web proxy
    // ve yerel geliştirme aynı veriyi farklı adreslerden kullanabilir.
    return `/files/${key}`;
  }
  try {
    return await getSignedUrl(
      s3Client(),
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      { expiresIn: 3600 },
    );
  } catch (error) {
    console.error('Medya URL imzalanamadı:', error);
    return null;
  }
}
