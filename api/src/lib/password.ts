import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * Format: scrypt$N$r$p$saltHex$keyHex
 * Parametreler hash içinde taşınır; ileride maliyet artırılabilir.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4] ?? '', 'hex');
  const expected = Buffer.from(parts[5] ?? '', 'hex');
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await scryptAsync(password, salt, expected.length, { N: n, r, p });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('Şifre en az 8 karakter olmalı.');
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password)) issues.push('Şifre en az bir harf içermeli.');
  if (!/\d/.test(password)) issues.push('Şifre en az bir rakam içermeli.');
  return issues;
}
