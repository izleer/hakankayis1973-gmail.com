import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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

/**
 * `/files/` altında sunulabilecek anahtarlar. Seed görselleri `seed/...`
 * biçiminde tutulur; yüklenen medya ise `media/YYYY/AA/<uuid>.<uzantı>`.
 */
export function isSignableMediaKey(key: string): boolean {
  return (
    isSafeStorageKey(key) ||
    /^seed\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(key)
  );
}

const DEV_MEDIA_SIGNING_SECRET = 'izleer-local-media-signing-secret';

function mediaSigningSecret(): string {
  // Üretimde ayrı bir MEDIA_SIGNING_SECRET tanımlanmadıysa S3 gizli anahtarı
  // kullanılır: her iki sürücüde de `/files/...` adresleri imzalanabilsin ve
  // bilinen geliştirme anahtarı canlıya sızmasın.
  return (
    env.MEDIA_SIGNING_SECRET ??
    env.S3_SECRET_ACCESS_KEY ??
    DEV_MEDIA_SIGNING_SECRET
  );
}

function encodeMediaKey(key: string): string {
  return key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function mediaSignature(key: string, expiresAt: number): string {
  return createHmac('sha256', mediaSigningSecret())
    .update(`${key}\n${expiresAt}`)
    .digest('base64url');
}

/**
 * Yerel depolamadaki bir medya anahtarını süreli imzalı `/files/...` adresine
 * çevirir. Adres yalnızca imza doğrulandığında sunulur; böylece tahmin edilen
 * veya sızdırılan ham depolama yolları doğrudan indirilemez.
 *
 * Süre, TTL penceresinin sonuna yuvarlanır: aynı anahtar aynı pencere içinde
 * özdeş URL üretir, böylece tarayıcı/Coil önbellekleri her istekte kırılmaz.
 */
export function signMediaKey(
  key: string,
  ttlSeconds = env.MEDIA_URL_TTL_SECONDS,
): string {
  const ttl = Math.max(1, Math.floor(ttlSeconds));
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = (Math.floor(now / ttl) + 1) * ttl;
  const signature = mediaSignature(key, expiresAt);
  return `/files/${encodeMediaKey(key)}?exp=${expiresAt}&sig=${signature}`;
}

export function verifyMediaSignature(
  key: string,
  expiresRaw: string | null | undefined,
  signature: string | null | undefined,
): boolean {
  if (!isSignableMediaKey(key) || !expiresRaw || !signature) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt)) return false;
  // Küçük bir saat farkı payı bırakılır.
  if (expiresAt < Math.floor(Date.now() / 1000) - 60) return false;

  const expected = Buffer.from(mediaSignature(key, expiresAt), 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Veritabanında saklanan bir medya referansını istemciye dönerken imzalar.
 * Eski kayıtlarda `/files/...` biçiminde avatar/kapak adresi bulunabilir;
 * bunların süresi dolmuş imzaları temizlenip yeniden imzalanır.
 */
export function mediaRefUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  // Hem yerel hem S3 sürücüsünde göreli `/files/<anahtar>` başvuruları imzalı
  // API adresine çevrilir; istemciler kendi API köklerine göre çözer.
  const match = /^\/files\/([^?#]+)(?:\?.*)?$/.exec(value);
  if (!match) return value;
  let key: string;
  try {
    key = decodeURIComponent(match[1]!);
  } catch {
    return value;
  }
  return isSignableMediaKey(key) ? signMediaKey(key) : value;
}

/**
 * Depolama anahtarını istemcilere verilecek kanonik `/files/<anahtar>`
 * başvurusuna çevirir. Yüklenen medyanın kalıcı kimliğidir; imzalı URL'ler
 * süreli olduğundan veritabanında bu biçim saklanmalıdır.
 */
export function mediaKeyRef(key: string | null | undefined): string | null {
  if (!key || !isSignableMediaKey(key)) return null;
  return `/files/${encodeMediaKey(key)}`;
}

/**
 * İstemciden gelen `/files/...` adresini imzasız, kanonik depolama yoluna
 * indirger. Harici HTTP(S) adresleri değiştirilmez.
 */
export function canonicalMediaRef(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^\/files\/([^?#]+)(?:\?.*)?$/.exec(value);
  if (!match) return value;
  try {
    const key = decodeURIComponent(match[1]!);
    return isSignableMediaKey(key) ? `/files/${encodeMediaKey(key)}` : value;
  } catch {
    return value;
  }
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
    return isSignableMediaKey(key) ? signMediaKey(key) : null;
  }
  try {
    return await getSignedUrl(
      s3Client(),
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      { expiresIn: env.MEDIA_URL_TTL_SECONDS },
    );
  } catch (error) {
    console.error('Medya URL imzalanamadı:', error);
    return null;
  }
}

/**
 * Meta'nın (Instagram içerik yayınlama) indirebileceği mutlak adres.
 * Yerel depolamada yalnızca herkese açık bir taban adres yapılandırıldıysa
 * üretilir; aksi halde paylaşım uçları anlaşılır bir hata döndürür.
 */
export async function publicMediaUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  if (env.STORAGE_DRIVER === 's3') return mediaUrl(key);
  const base =
    env.MEDIA_PUBLIC_BASE_URL ??
    (/^https:\/\//i.test(env.PUBLIC_API_URL) ? env.PUBLIC_API_URL : null);
  if (!base) return null;
  if (!isSignableMediaKey(key)) return null;
  // Meta'nın erişebilmesi için mutlak adres gerekir; imza yine zorunludur.
  return `${base.replace(/\/$/, '')}${signMediaKey(key, env.MEDIA_PUBLIC_URL_TTL_SECONDS)}`;
}

export async function readStorageObject(key: string): Promise<Buffer> {
  if (env.STORAGE_DRIVER === 'local') {
    const target = path.join(storageRoot, key);
    if (!target.startsWith(storageRoot)) throw new Error('Geçersiz depolama yolu.');
    return readFile(target);
  }
  const object = await s3Client().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
  );
  if (!object.Body) throw new Error('Depolama nesnesi boş.');
  const bytes = await object.Body.transformToByteArray();
  return Buffer.from(bytes);
}
