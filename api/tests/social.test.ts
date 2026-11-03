import { describe, expect, it } from 'vitest';

process.env.META_APP_ID = 'test-app-id';
process.env.META_APP_SECRET = 'test-app-secret';
process.env.SOCIAL_TOKEN_KEY = 'test-token-key-0123456789';

const { decryptSecret, encryptSecret, signState, verifyState } = await import(
  '../src/lib/crypto.js'
);

describe('sosyal jeton şifreleme', () => {
  it('jetonu şifreler ve geri çözer', () => {
    const token = 'EAAB-page-access-token';
    const cipher = encryptSecret(token);
    expect(cipher).not.toContain(token);
    expect(cipher.startsWith('v1.')).toBe(true);
    expect(decryptSecret(cipher)).toBe(token);
  });

  it('değiştirilmiş şifreli metni reddeder', () => {
    const cipher = encryptSecret('EAAB-page-access-token');
    const parts = cipher.split('.');
    parts[3] = `${parts[3]!.slice(0, -2)}AA`;
    expect(() => decryptSecret(parts.join('.'))).toThrowError(/yeniden bağlayın/i);
  });
});

describe('OAuth state', () => {
  it('kullanıcı kimliğini taşır ve imzayı doğrular', () => {
    const state = signState('8f14e45f-0000-4000-8000-000000000000');
    expect(verifyState(state)).toBe('8f14e45f-0000-4000-8000-000000000000');
  });

  it('kurcalanmış state değerini reddeder', () => {
    const state = signState('8f14e45f-0000-4000-8000-000000000000');
    expect(() => verifyState(`${state}x`)).toThrowError(/süresi doldu/i);
  });
});
