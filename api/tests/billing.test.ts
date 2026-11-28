import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
// Testler gerçek mağaza kimlik bilgilerini kullanmaz.
process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '';
process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE = '';
process.env.APPLE_ISSUER_ID = '';
process.env.APPLE_KEY_ID = '';
process.env.APPLE_PRIVATE_KEY = '';
process.env.APPLE_ROOT_CA_PEM = '';
process.env.BILLING_PRODUCTS_JSON = '';

const {
  billingConfigured,
  billingProducts,
  normalizeAppleStatus,
  normalizeGoogleState,
  normalizePlanValue,
  planRank,
  productFor,
  verifyAppleJws,
  verifyGoogleOidcToken,
} = await import('../src/lib/billing.js');

describe('ürün kataloğu', () => {
  it('varsayılan dört ürünü döner', () => {
    const products = billingProducts();
    expect(products).toHaveLength(4);
    expect(products.map((item) => item.plan)).toEqual(['premium', 'plus', 'premium', 'plus']);
  });

  it('mağaza ve ürün kimliğine göre eşleştirir', () => {
    expect(productFor('google', 'izleer_premium_yearly')?.plan).toBe('premium');
    expect(productFor('google', 'izleer_plus_yearly')?.plan).toBe('plus');
    expect(productFor('apple', 'izleer.premium.yearly')?.plan).toBe('premium');
    expect(productFor('apple', 'izleer.plus.yearly')?.plan).toBe('plus');
  });

  it('bilinmeyen ürün veya yanlış mağazada null döner', () => {
    expect(productFor('google', 'izleer.premium.yearly')).toBeNull();
    expect(productFor('apple', 'izleer_premium_yearly')).toBeNull();
    expect(productFor('google', 'bilinmeyen')).toBeNull();
  });
});

describe('plan sıralaması', () => {
  it('Plus > Premium > Free', () => {
    expect(planRank('plus')).toBeGreaterThan(planRank('premium'));
    expect(planRank('premium')).toBeGreaterThan(planRank('free'));
  });

  it('bilinmeyen plan değerini free sayar', () => {
    expect(normalizePlanValue('plus')).toBe('plus');
    expect(normalizePlanValue('premium')).toBe('premium');
    expect(normalizePlanValue('premium_plus')).toBe('free');
    expect(normalizePlanValue(undefined)).toBe('free');
  });
});

describe('Google durum eşlemesi', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  it('etkin ve ek süre durumlarını korur', () => {
    expect(normalizeGoogleState('SUBSCRIPTION_STATE_ACTIVE', future)).toBe('active');
    expect(normalizeGoogleState('SUBSCRIPTION_STATE_IN_GRACE_PERIOD', future)).toBe('grace');
  });

  it('iptal edilmiş ama süresi dolmamış aboneliği etkin sayar', () => {
    expect(normalizeGoogleState('SUBSCRIPTION_STATE_CANCELED', future)).toBe('active');
    expect(normalizeGoogleState('SUBSCRIPTION_STATE_CANCELED', past)).toBe('expired');
  });

  it('bekleyen ödemeye yetki vermez', () => {
    expect(normalizeGoogleState('SUBSCRIPTION_STATE_PENDING', future)).toBe('pending');
    expect(normalizeGoogleState('BILINMEYEN', future)).toBe('pending');
  });

  it('süresi dolmuş aboneliği kapatır', () => {
    expect(normalizeGoogleState('SUBSCRIPTION_STATE_EXPIRED', past)).toBe('expired');
  });
});

describe('Apple durum eşlemesi', () => {
  it('App Store durum kodlarını eşler', () => {
    expect(normalizeAppleStatus(1)).toBe('active');
    expect(normalizeAppleStatus(2)).toBe('expired');
    expect(normalizeAppleStatus(3)).toBe('expired');
    expect(normalizeAppleStatus(4)).toBe('grace');
    expect(normalizeAppleStatus(5)).toBe('revoked');
    expect(normalizeAppleStatus(99)).toBe('pending');
  });
});

describe('yapılandırma', () => {
  it('kimlik bilgisi yokken mağazalar kapalıdır', () => {
    expect(billingConfigured('google')).toBe(false);
    expect(billingConfigured('apple')).toBe(false);
  });
});

describe('Google OIDC doğrulama', () => {
  it('üç parçalı olmayan jetonu reddeder', async () => {
    await expect(verifyGoogleOidcToken('tek-parca', 'aud')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('desteklenmeyen algoritmayı reddeder', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', kid: 'x' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ aud: 'aud', exp: 9999999999 })).toString(
      'base64url',
    );
    await expect(verifyGoogleOidcToken(`${header}.${payload}.imza`, 'aud')).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('Apple JWS doğrulama', () => {
  it('üç parçalı olmayan makbuzu reddeder', async () => {
    await expect(verifyAppleJws('tek-parca')).rejects.toMatchObject({ status: 422 });
    await expect(verifyAppleJws('a.b')).rejects.toMatchObject({ status: 422 });
  });

  it('desteklenmeyen algoritmayı reddeder', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ productId: 'x' })).toString('base64url');
    await expect(verifyAppleJws(`${header}.${payload}.imza`)).rejects.toMatchObject({
      status: 422,
    });
  });

  it('sertifika zinciri olmayan makbuzu reddeder', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', x5c: [] })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ productId: 'x' })).toString('base64url');
    await expect(verifyAppleJws(`${header}.${payload}.imza`)).rejects.toMatchObject({
      status: 422,
    });
  });
});
