import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { env } from '../env.js';
import { ApiError } from './errors.js';

const STATE_TTL_MS = 10 * 60 * 1000;

export function missingSocialConfig(): string[] {
  const missing: string[] = [];
  if (!env.META_APP_ID) missing.push('META_APP_ID');
  if (!env.META_APP_SECRET) missing.push('META_APP_SECRET');
  if (!env.SOCIAL_TOKEN_KEY) missing.push('SOCIAL_TOKEN_KEY');
  return missing;
}

export function socialConfigured(): boolean {
  return missingSocialConfig().length === 0;
}

export function assertSocialConfigured(): void {
  const missing = missingSocialConfig();
  if (missing.length > 0) {
    throw new ApiError(
      503,
      'SOCIAL_NOT_CONFIGURED',
      'Sosyal paylaşım için Meta uygulama bilgileri eksik.',
      { missing },
    );
  }
}

function tokenKey(): Buffer {
  assertSocialConfigured();
  return createHash('sha256').update(env.SOCIAL_TOKEN_KEY!).digest();
}

/** Sayfa erişim jetonlarını AES-256-GCM ile şifreler. */
export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptSecret(value: string): string {
  try {
    const [version, iv, tag, payload] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !payload) throw new Error('Beklenmeyen biçim.');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      tokenKey(),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(payload, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new ApiError(
      401,
      'SOCIAL_TOKEN_INVALID',
      'Sosyal bağlantının anahtarı okunamadı. Lütfen hesabı yeniden bağlayın.',
    );
  }
}

function stateKey(): Buffer {
  assertSocialConfigured();
  return createHash('sha256')
    .update(`${env.META_APP_SECRET!}:${env.SOCIAL_TOKEN_KEY!}`)
    .digest();
}

/** OAuth state parametresini kullanıcıya ve 10 dakikalık geçerliliğe bağlar. */
export function signState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      u: userId,
      e: Date.now() + STATE_TTL_MS,
      n: randomBytes(8).toString('base64url'),
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', stateKey()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyState(state: string): string {
  try {
    const [payload, signature] = state.split('.');
    if (!payload || !signature) throw new Error('Eksik state.');
    const expected = createHmac('sha256', stateKey()).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new Error('İmza eşleşmedi.');
    }
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u?: string;
      e?: number;
    };
    if (!parsed.u || !parsed.e || parsed.e < Date.now()) throw new Error('State süresi doldu.');
    return parsed.u;
  } catch {
    throw new ApiError(
      400,
      'SOCIAL_STATE_INVALID',
      'Bağlantı isteğinin süresi doldu. Lütfen yeniden deneyin.',
    );
  }
}

/** Meta, 190 kodlu hatayı geçersiz/süresi dolmuş jeton için döndürür. */
export function isExpiredToken(error: { code?: number } | null | undefined): boolean {
  return error?.code === 190;
}
