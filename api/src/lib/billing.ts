import {
  createHash,
  createPublicKey,
  createSign,
  verify as verifySignature,
  X509Certificate,
  type JsonWebKey,
  type KeyObject,
} from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { env } from '../env.js';
import { query, queryOne } from '../db.js';
import { ApiError } from './errors.js';

/**
 * Mağaza abonelik doğrulaması.
 *
 * Kural: istemci "satın alma başarılı" dedi diye Premium açılmaz. Uygulama
 * purchase token / imzalı işlemi bu modüle gönderir; modül mağaza sunucusuyla
 * doğrular, işlemi `store_transactions` tablosuna yazar ve yetkiyi yeniden
 * hesaplar. Aynı mağaza işlemi ikinci bir hesaba bağlanamaz.
 *
 * Ham ödeme/kart bilgisi hiçbir zaman saklanmaz; yalnızca doğrulama özeti ve
 * makbuzun SHA-256 özeti tutulur.
 */

export type Store = 'google' | 'apple';
export type BillingPlan = 'free' | 'premium' | 'plus';
export type PaidPlan = Exclude<BillingPlan, 'free'>;
export type StoreStatus =
  | 'pending'
  | 'active'
  | 'grace'
  | 'expired'
  | 'refunded'
  | 'revoked';
export type EntitlementStatus = 'none' | 'active' | 'grace' | 'expired' | 'refunded';

export type ProductDefinition = {
  store: Store;
  productId: string;
  plan: PaidPlan;
  label: string;
  period: 'yearly';
};

/**
 * Varsayılan ürün kimlikleri. Mağaza konsolunda farklı kimlik kullanılırsa
 * `BILLING_PRODUCTS_JSON` ile tam liste değiştirilebilir.
 */
export const DEFAULT_PRODUCTS: readonly ProductDefinition[] = [
  {
    store: 'google',
    productId: 'izleer_premium_yearly',
    plan: 'premium',
    label: 'Premium (yıllık)',
    period: 'yearly',
  },
  {
    store: 'google',
    productId: 'izleer_plus_yearly',
    plan: 'plus',
    label: 'Premium Plus (yıllık)',
    period: 'yearly',
  },
  {
    store: 'apple',
    productId: 'izleer.premium.yearly',
    plan: 'premium',
    label: 'Premium (yıllık)',
    period: 'yearly',
  },
  {
    store: 'apple',
    productId: 'izleer.plus.yearly',
    plan: 'plus',
    label: 'Premium Plus (yıllık)',
    period: 'yearly',
  },
];

export type VerifiedPurchase = {
  store: Store;
  productId: string;
  /** Google: purchaseToken; Apple: originalTransactionId. */
  transactionRef: string;
  purchaseAt: string | null;
  expiresAt: string | null;
  status: StoreStatus;
  environment: 'sandbox' | 'production';
  /** Özet; ham makbuzun tamamı değil. */
  raw: unknown;
};

export type EntitlementView = {
  plan: BillingPlan;
  status: EntitlementStatus;
  expiresAt: string | null;
  verifiedAt: string | null;
  offlineGraceDays: number;
  store: Store | null;
  productId: string | null;
};

let productCache: ProductDefinition[] | null = null;

function isStore(value: unknown): value is Store {
  return value === 'google' || value === 'apple';
}

function isPaidPlan(value: unknown): value is PaidPlan {
  return value === 'premium' || value === 'plus';
}

function parseProductOverrides(raw: string | undefined): ProductDefinition[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const result: ProductDefinition[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      if (!isStore(row.store) || !isPaidPlan(row.plan)) return null;
      if (typeof row.productId !== 'string' || row.productId.trim().length === 0) return null;
      result.push({
        store: row.store,
        productId: row.productId.trim(),
        plan: row.plan,
        label:
          typeof row.label === 'string' && row.label.trim().length > 0
            ? row.label.trim()
            : row.plan === 'plus'
              ? 'Premium Plus (yıllık)'
              : 'Premium (yıllık)',
        period: 'yearly',
      });
    }
    return result;
  } catch {
    return null;
  }
}

export function billingProducts(): ProductDefinition[] {
  if (productCache) return productCache;
  productCache = parseProductOverrides(env.BILLING_PRODUCTS_JSON) ?? [...DEFAULT_PRODUCTS];
  return productCache;
}

export function productFor(store: Store, productId: string): ProductDefinition | null {
  return billingProducts().find((item) => item.store === store && item.productId === productId) ?? null;
}

export function planRank(plan: BillingPlan): number {
  if (plan === 'plus') return 2;
  if (plan === 'premium') return 1;
  return 0;
}

export function normalizePlanValue(value: unknown): BillingPlan {
  if (value === 'plus') return 'plus';
  if (value === 'premium') return 'premium';
  return 'free';
}

function normalizeEntitlementStatus(value: unknown): EntitlementStatus {
  if (value === 'active') return 'active';
  if (value === 'grace') return 'grace';
  if (value === 'expired') return 'expired';
  if (value === 'refunded') return 'refunded';
  return 'none';
}

/**
 * Google `subscriptionState` → yerel durum. İptal edilmiş ama süresi dolmamış
 * abonelik erişim vermeye devam eder; beklemedeki ödeme yetki vermez.
 */
export function normalizeGoogleState(state: string, expiresAt: string | null): StoreStatus {
  const stillValid = expiresAt ? Date.parse(expiresAt) > Date.now() : false;
  switch (state) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return 'active';
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'grace';
    case 'SUBSCRIPTION_STATE_CANCELED':
      return stillValid ? 'active' : 'expired';
    case 'SUBSCRIPTION_STATE_PAUSED':
      return stillValid ? 'grace' : 'expired';
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return stillValid ? 'grace' : 'expired';
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return 'expired';
    case 'SUBSCRIPTION_STATE_PENDING':
    default:
      return 'pending';
  }
}

/**
 * App Store Server API durum kodu → yerel durum.
 * 1 etkin, 2 süresi dolmuş, 3 faturalama yeniden deneme (erişim yok),
 * 4 ek süre (erişim var), 5 iptal/iade.
 */
export function normalizeAppleStatus(status: number): StoreStatus {
  switch (status) {
    case 1:
      return 'active';
    case 2:
      return 'expired';
    case 3:
      return 'expired';
    case 4:
      return 'grace';
    case 5:
      return 'revoked';
    default:
      return 'pending';
  }
}

export function billingConfigured(store: Store): boolean {
  if (store === 'google') {
    return Boolean(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE);
  }
  return Boolean(env.APPLE_ISSUER_ID && env.APPLE_KEY_ID && applePrivateKey());
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function isoOrNull(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Google Play
// ---------------------------------------------------------------------------

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type GoogleSubscriptionV2 = {
  startTime?: string;
  subscriptionState?: string;
  acknowledgementState?: string;
  testPurchase?: unknown;
  lineItems?: Array<{ productId?: string; expiryTime?: string }>;
};

let googleAccountCache: GoogleServiceAccount | null = null;
let googleTokenCache: { token: string; expiresAt: number } | null = null;

async function googleServiceAccount(): Promise<GoogleServiceAccount> {
  if (googleAccountCache) return googleAccountCache;
  let raw = env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw && env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE) {
    try {
      raw = await readFile(env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE, 'utf8');
    } catch {
      throw new ApiError(
        503,
        'BILLING_NOT_CONFIGURED',
        'Google hizmet hesabı dosyası okunamadı.',
      );
    }
  }
  if (!raw) {
    throw new ApiError(
      503,
      'BILLING_NOT_CONFIGURED',
      'Google Play doğrulaması yapılandırılmadı.',
    );
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('client_email veya private_key eksik');
    }
    googleAccountCache = {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
      token_uri: parsed.token_uri,
    };
    return googleAccountCache;
  } catch {
    throw new ApiError(
      503,
      'BILLING_NOT_CONFIGURED',
      'Google hizmet hesabı JSON biçimi geçersiz.',
    );
  }
}

async function googleAccessToken(): Promise<string> {
  if (googleTokenCache && googleTokenCache.expiresAt > Date.now() + 30_000) {
    return googleTokenCache.token;
  }
  const account = await googleServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: account.token_uri ?? 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = signer.sign(account.private_key).toString('base64url');

  let response: Response;
  try {
    response = await fetch(account.token_uri ?? 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${payload}.${signature}`,
      }).toString(),
    });
  } catch {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Google kimlik doğrulamasına ulaşılamadı.');
  }
  if (!response.ok) {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Google kimlik doğrulaması başarısız.');
  }
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Google erişim jetonu alınamadı.');
  }
  googleTokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

async function acknowledgeGooglePurchase(
  packageName: string,
  productId: string,
  purchaseToken: string,
): Promise<void> {
  const token = await googleAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptions/` +
    `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  });
}

type GoogleOidcPayload = {
  iss?: string;
  aud?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean;
};

let googleKeyCache: { keys: Map<string, KeyObject>; expiresAt: number } | null = null;

async function googlePublicKeys(): Promise<Map<string, KeyObject>> {
  if (googleKeyCache && googleKeyCache.expiresAt > Date.now()) {
    return googleKeyCache.keys;
  }
  let response: Response;
  try {
    response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  } catch {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Google açık anahtarlarına ulaşılamadı.');
  }
  if (!response.ok) {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Google açık anahtarları alınamadı.');
  }
  const json = (await response.json()) as { keys?: Array<JsonWebKey & { kid?: string }> };
  const keys = new Map<string, KeyObject>();
  for (const jwk of json.keys ?? []) {
    if (!jwk.kid) continue;
    try {
      keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
    } catch {
      // Tek bir anahtar okunamazsa diğerleri kullanılabilir.
    }
  }
  googleKeyCache = { keys, expiresAt: Date.now() + 3_600_000 };
  return keys;
}

/**
 * Pub/Sub push isteğindeki Google OIDC jetonunu doğrular. Yalnızca doğru
 * `aud` değerine sahip, süresi geçmemiş ve Google tarafından imzalanmış
 * jetonlar kabul edilir.
 */
export async function verifyGoogleOidcToken(token: string, audience: string): Promise<void> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Webhook kimliği doğrulanamadı.');
  }
  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Webhook kimliği doğrulanamadı.');
  }
  if (header.alg !== 'RS256' || !header.kid) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Webhook kimliği doğrulanamadı.');
  }
  const key = (await googlePublicKeys()).get(header.kid);
  if (!key) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Webhook kimliği doğrulanamadı.');
  }
  const valid = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    key,
    Buffer.from(parts[2]!, 'base64url'),
  );
  if (!valid) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Webhook kimliği doğrulanamadı.');
  }

  let payload: GoogleOidcPayload;
  try {
    payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as GoogleOidcPayload;
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Webhook kimliği doğrulanamadı.');
  }
  const now = Math.floor(Date.now() / 1000);
  const issuer = payload.iss;
  if (
    !payload.exp ||
    payload.exp < now - 30 ||
    payload.aud !== audience ||
    (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com')
  ) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Webhook kimliği doğrulanamadı.');
  }
}

export async function verifyGooglePurchase(input: {
  productId: string;
  purchaseToken: string;
  packageName?: string;
}): Promise<VerifiedPurchase> {
  const product = productFor('google', input.productId);
  if (!product) {
    throw new ApiError(422, 'UNKNOWN_PRODUCT', `Bilinmeyen ürün: ${input.productId}`);
  }
  const packageName = input.packageName ?? env.GOOGLE_PLAY_PACKAGE_NAME;
  if (packageName !== env.GOOGLE_PLAY_PACKAGE_NAME) {
    throw new ApiError(422, 'PACKAGE_MISMATCH', 'Paket adı bu uygulamayla eşleşmiyor.');
  }

  const token = await googleAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/` +
    `${encodeURIComponent(input.purchaseToken)}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  } catch {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Google Play doğrulamasına ulaşılamadı.');
  }
  if (response.status === 400 || response.status === 404 || response.status === 410) {
    throw new ApiError(422, 'PURCHASE_NOT_FOUND', 'Satın alma bulunamadı veya geçersiz.');
  }
  if (!response.ok) {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Google Play doğrulaması başarısız.');
  }

  const data = (await response.json()) as GoogleSubscriptionV2;
  const lineItem =
    (data.lineItems ?? []).find((item) => item.productId === input.productId) ??
    data.lineItems?.[0];
  if (!lineItem?.productId || lineItem.productId !== input.productId) {
    throw new ApiError(422, 'PURCHASE_PRODUCT_MISMATCH', 'Satın alma ürünle eşleşmiyor.');
  }

  const expiresAt = isoOrNull(lineItem.expiryTime);
  const status = normalizeGoogleState(String(data.subscriptionState ?? ''), expiresAt);

  // Google, doğrulanan aboneliğin 3 gün içinde onaylanmasını ister; aksi
  // hâlde otomatik iade edilebilir. Onay hatası doğrulamayı bozmaz.
  if (status === 'active' && data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
    try {
      await acknowledgeGooglePurchase(packageName, input.productId, input.purchaseToken);
    } catch {
      // Onay yeniden denenecek; kullanıcı erişimini kaybetmez.
    }
  }

  return {
    store: 'google',
    productId: input.productId,
    transactionRef: input.purchaseToken,
    purchaseAt: isoOrNull(data.startTime),
    expiresAt,
    status,
    environment: data.testPurchase ? 'sandbox' : 'production',
    raw: {
      subscriptionState: data.subscriptionState,
      startTime: data.startTime,
      lineItems: data.lineItems,
      acknowledgementState: data.acknowledgementState,
      testPurchase: Boolean(data.testPurchase),
    },
  };
}

// ---------------------------------------------------------------------------
// Apple App Store
// ---------------------------------------------------------------------------

function applePrivateKey(): string | null {
  const raw = env.APPLE_PRIVATE_KEY;
  return raw ? raw.replace(/\\n/g, '\n') : null;
}

function appleBaseUrl(): string {
  return env.APPLE_ENVIRONMENT === 'sandbox'
    ? 'https://api.storekit-sandbox.itunes.apple.com'
    : 'https://api.storekit.itunes.apple.com';
}

function createAppleJwt(): string {
  const issuer = env.APPLE_ISSUER_ID;
  const keyId = env.APPLE_KEY_ID;
  const key = applePrivateKey();
  if (!issuer || !keyId || !key) {
    throw new ApiError(503, 'BILLING_NOT_CONFIGURED', 'Apple doğrulaması yapılandırılmadı.');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: issuer,
      iat: now,
      exp: now + 300,
      aud: 'appstoreconnect-v1',
      bid: env.APPLE_BUNDLE_ID,
    }),
  );
  const signer = createSign('SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = signer.sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

let appleRootCache: X509Certificate | null = null;

async function appleRootCertificate(): Promise<X509Certificate> {
  if (appleRootCache) return appleRootCache;
  if (env.APPLE_ROOT_CA_PEM) {
    try {
      appleRootCache = new X509Certificate(env.APPLE_ROOT_CA_PEM.replace(/\\n/g, '\n'));
      return appleRootCache;
    } catch {
      throw new ApiError(503, 'BILLING_NOT_CONFIGURED', 'APPLE_ROOT_CA_PEM okunamadı.');
    }
  }
  let response: Response;
  try {
    response = await fetch('https://www.apple.com/certificateauthority/AppleRootCA-G3.cer');
  } catch {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Apple kök sertifikasına ulaşılamadı.');
  }
  if (!response.ok) {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Apple kök sertifikası alınamadı.');
  }
  try {
    appleRootCache = new X509Certificate(Buffer.from(await response.arrayBuffer()));
    return appleRootCache;
  } catch {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Apple kök sertifikası okunamadı.');
  }
}

/**
 * Apple JWS imzasını sertifika zinciriyle doğrular ve yükü döndürür.
 * Zincir Apple Root CA - G3'e kadar gitmezse makbuz reddedilir.
 */
export async function verifyAppleJws(jws: string): Promise<Record<string, unknown>> {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new ApiError(422, 'INVALID_RECEIPT', 'Apple makbuzu geçersiz.');
  }
  let header: { alg?: string; x5c?: string[] };
  try {
    header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8')) as {
      alg?: string;
      x5c?: string[];
    };
  } catch {
    throw new ApiError(422, 'INVALID_RECEIPT', 'Apple makbuz başlığı okunamadı.');
  }
  if (header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length === 0) {
    throw new ApiError(422, 'INVALID_RECEIPT', 'Apple makbuz imzası desteklenmiyor.');
  }

  let chain: X509Certificate[];
  try {
    chain = header.x5c.map((value) => new X509Certificate(Buffer.from(value, 'base64')));
  } catch {
    throw new ApiError(422, 'INVALID_RECEIPT', 'Apple sertifika zinciri okunamadı.');
  }

  try {
    for (let index = 0; index < chain.length - 1; index += 1) {
      const child = chain[index]!;
      const parent = chain[index + 1]!;
      if (!child.checkIssued(parent) || !child.verify(parent.publicKey)) {
        throw new ApiError(422, 'INVALID_RECEIPT', 'Apple sertifika zinciri doğrulanamadı.');
      }
    }
    const root = await appleRootCertificate();
    const last = chain[chain.length - 1]!;
    if (last.fingerprint256 !== root.fingerprint256) {
      if (!last.checkIssued(root) || !last.verify(root.publicKey)) {
        throw new ApiError(422, 'INVALID_RECEIPT', 'Apple kök sertifikası doğrulanamadı.');
      }
    }
    const valid = verifySignature(
      'sha256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      { key: chain[0]!.publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(parts[2]!, 'base64url'),
    );
    if (!valid) {
      throw new ApiError(422, 'INVALID_RECEIPT', 'Apple makbuz imzası geçersiz.');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'INVALID_RECEIPT', 'Apple makbuzu doğrulanamadı.');
  }

  try {
    return JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    throw new ApiError(422, 'INVALID_RECEIPT', 'Apple makbuz içeriği okunamadı.');
  }
}

type AppleSubscriptionResponse = {
  environment?: string;
  bundleId?: string;
  data?: Array<{
    lastTransactions?: Array<{
      originalTransactionId?: string;
      status?: number;
      signedTransactionInfo?: string;
    }>;
  }>;
};

export async function verifyAppleTransaction(input: {
  transactionId: string;
  productId?: string;
}): Promise<VerifiedPurchase> {
  if (!billingConfigured('apple')) {
    throw new ApiError(503, 'BILLING_NOT_CONFIGURED', 'Apple doğrulaması yapılandırılmadı.');
  }
  const jwt = createAppleJwt();
  const url = `${appleBaseUrl()}/inApps/v1/subscriptions/${encodeURIComponent(input.transactionId)}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { authorization: `Bearer ${jwt}` } });
  } catch {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Apple doğrulamasına ulaşılamadı.');
  }
  if (response.status === 404) {
    throw new ApiError(422, 'PURCHASE_NOT_FOUND', 'Apple satın alması bulunamadı.');
  }
  if (response.status === 401 || response.status === 403) {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Apple kimlik doğrulaması başarısız.');
  }
  if (!response.ok) {
    throw new ApiError(502, 'STORE_UNAVAILABLE', 'Apple doğrulaması başarısız.');
  }

  const data = (await response.json()) as AppleSubscriptionResponse;
  if (data.bundleId && data.bundleId !== env.APPLE_BUNDLE_ID) {
    throw new ApiError(422, 'PACKAGE_MISMATCH', 'Paket adı bu uygulamayla eşleşmiyor.');
  }

  const transactions = (data.data ?? []).flatMap((group) => group.lastTransactions ?? []);
  const decoded: Array<{ info: Record<string, unknown>; status: number }> = [];
  for (const transaction of transactions) {
    if (!transaction.signedTransactionInfo) continue;
    const info = await verifyAppleJws(transaction.signedTransactionInfo);
    decoded.push({ info, status: Number(transaction.status ?? 0) });
  }
  const chosen =
    (input.productId
      ? decoded.find((item) => item.info.productId === input.productId)
      : undefined) ?? decoded[0];
  if (!chosen) {
    throw new ApiError(422, 'PURCHASE_NOT_FOUND', 'Apple işlemi bulunamadı.');
  }

  const productId = String(chosen.info.productId ?? '');
  if (!productFor('apple', productId)) {
    throw new ApiError(422, 'UNKNOWN_PRODUCT', `Bilinmeyen ürün: ${productId}`);
  }
  if (input.productId && productId !== input.productId) {
    throw new ApiError(422, 'PURCHASE_PRODUCT_MISMATCH', 'Satın alma ürünle eşleşmiyor.');
  }

  const expiresAt = isoOrNull(chosen.info.expiresDate);
  let status = normalizeAppleStatus(chosen.status);
  if (chosen.info.revocationDate) status = 'revoked';
  if (status === 'active' && expiresAt && Date.parse(expiresAt) <= Date.now()) {
    status = 'expired';
  }

  return {
    store: 'apple',
    productId,
    transactionRef: String(
      chosen.info.originalTransactionId ?? chosen.info.transactionId ?? input.transactionId,
    ),
    purchaseAt: isoOrNull(chosen.info.purchaseDate),
    expiresAt,
    status,
    environment:
      String(data.environment ?? '').toLowerCase() === 'sandbox' ? 'sandbox' : 'production',
    raw: {
      environment: data.environment,
      status: chosen.status,
      transaction: chosen.info,
    },
  };
}

// ---------------------------------------------------------------------------
// Yetki hesaplama ve veritabanı
// ---------------------------------------------------------------------------

type TransactionRow = {
  id: string;
  store: string;
  product_id: string;
  status: string;
  expires_at: Date | null;
  updated_at: Date;
};

type EntitlementRow = {
  plan: string;
  status: string;
  expires_at: Date | null;
  verified_at: Date | null;
  offline_grace_days: number;
  store: string | null;
  product_id: string | null;
};

export async function entitlementView(userId: string): Promise<EntitlementView> {
  const row = await queryOne<EntitlementRow>(
    `SELECT se.plan, se.status, se.expires_at, se.verified_at, se.offline_grace_days,
            st.store, st.product_id
     FROM subscription_entitlements se
     LEFT JOIN store_transactions st ON st.id = se.source_transaction_id
     WHERE se.user_id = $1`,
    [userId],
  );
  if (!row) {
    return {
      plan: 'free',
      status: 'none',
      expiresAt: null,
      verifiedAt: null,
      offlineGraceDays: env.BILLING_OFFLINE_GRACE_DAYS,
      store: null,
      productId: null,
    };
  }
  return {
    plan: normalizePlanValue(row.plan),
    status: normalizeEntitlementStatus(row.status),
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    verifiedAt: row.verified_at ? row.verified_at.toISOString() : null,
    offlineGraceDays: row.offline_grace_days ?? env.BILLING_OFFLINE_GRACE_DAYS,
    store: row.store === 'google' || row.store === 'apple' ? row.store : null,
    productId: row.product_id ?? null,
  };
}

/**
 * Kullanıcının etkin işlemlerinden en yüksek planı seçer ve `users.plan` ile
 * yetki önbelleğini günceller. Hiç etkin işlem yoksa plan `free` olur; veri
 * silinmez, yalnızca ücretli özellikler kapanır.
 */
export async function refreshEntitlement(userId: string): Promise<EntitlementView> {
  const rows = await query<TransactionRow>(
    `SELECT id, store, product_id, status, expires_at, updated_at
     FROM store_transactions
     WHERE user_id = $1
       AND status IN ('active', 'grace')
       AND (expires_at IS NULL OR expires_at > now())`,
    [userId],
  );

  let best: { row: TransactionRow; product: ProductDefinition } | null = null;
  for (const row of rows) {
    if (row.store !== 'google' && row.store !== 'apple') continue;
    const product = productFor(row.store, row.product_id);
    if (!product) continue;
    if (!best) {
      best = { row, product };
      continue;
    }
    const rankDiff = planRank(product.plan) - planRank(best.product.plan);
    if (rankDiff > 0) {
      best = { row, product };
      continue;
    }
    if (rankDiff === 0) {
      const nextExpiry = row.expires_at?.getTime() ?? Number.POSITIVE_INFINITY;
      const bestExpiry = best.row.expires_at?.getTime() ?? Number.POSITIVE_INFINITY;
      if (nextExpiry > bestExpiry) best = { row, product };
    }
  }

  const latest = await queryOne<{ status: string }>(
    `SELECT status FROM store_transactions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId],
  );

  const plan: BillingPlan = best ? best.product.plan : 'free';
  let status: EntitlementStatus = 'none';
  if (best) {
    status = best.row.status === 'grace' ? 'grace' : 'active';
  } else if (latest) {
    if (latest.status === 'refunded' || latest.status === 'revoked') status = 'refunded';
    else if (latest.status === 'expired') status = 'expired';
  }

  await query(
    `INSERT INTO subscription_entitlements
       (user_id, plan, status, source_transaction_id, expires_at, verified_at,
        offline_grace_days, updated_at)
     VALUES ($1, $2::user_plan, $3, $4, $5, now(), $6, now())
     ON CONFLICT (user_id) DO UPDATE SET
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       source_transaction_id = EXCLUDED.source_transaction_id,
       expires_at = EXCLUDED.expires_at,
       verified_at = now(),
       offline_grace_days = EXCLUDED.offline_grace_days,
       updated_at = now()`,
    [
      userId,
      plan,
      status,
      best?.row.id ?? null,
      best?.row.expires_at ? best.row.expires_at.toISOString() : null,
      env.BILLING_OFFLINE_GRACE_DAYS,
    ],
  );

  await query(
    `UPDATE users
     SET plan = $2::user_plan,
         plan_started_at = CASE
           WHEN $2 <> 'free' AND plan = 'free' THEN now()
           ELSE plan_started_at
         END,
         updated_at = now()
     WHERE id = $1`,
    [userId, plan],
  );

  return entitlementView(userId);
}

/**
 * Doğrulanmış mağaza işlemini kaydeder ve yetkiyi yeniler. Aynı işlem başka
 * bir hesaba bağlıysa 409 döner; böylece satın alma paylaşılamaz.
 */
export async function applyVerifiedPurchase(
  userId: string,
  purchase: VerifiedPurchase,
): Promise<EntitlementView> {
  const product = productFor(purchase.store, purchase.productId);
  if (!product) {
    throw new ApiError(422, 'UNKNOWN_PRODUCT', `Bilinmeyen ürün: ${purchase.productId}`);
  }

  const existing = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM store_transactions WHERE store = $1 AND transaction_ref = $2`,
    [purchase.store, purchase.transactionRef],
  );
  if (existing && existing.user_id !== userId) {
    throw new ApiError(
      409,
      'TRANSACTION_OWNED',
      'Bu mağaza işlemi başka bir hesaba bağlı.',
    );
  }

  const receiptHash = createHash('sha256')
    .update(JSON.stringify(purchase.raw))
    .digest('hex');
  const verificationResult = JSON.stringify({
    status: purchase.status,
    expiresAt: purchase.expiresAt,
    environment: purchase.environment,
  }).slice(0, 2000);

  await query(
    `INSERT INTO store_transactions
       (user_id, store, product_id, transaction_ref, purchase_at, expires_at, status,
        environment, verification_result, receipt_hash, last_checked_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (store, transaction_ref) DO UPDATE SET
       product_id = EXCLUDED.product_id,
       purchase_at = COALESCE(EXCLUDED.purchase_at, store_transactions.purchase_at),
       expires_at = EXCLUDED.expires_at,
       status = EXCLUDED.status,
       environment = EXCLUDED.environment,
       verification_result = EXCLUDED.verification_result,
       receipt_hash = EXCLUDED.receipt_hash,
       last_checked_at = now(),
       updated_at = now()`,
    [
      userId,
      purchase.store,
      purchase.productId,
      purchase.transactionRef,
      purchase.purchaseAt,
      purchase.expiresAt,
      purchase.status,
      purchase.environment,
      verificationResult,
      receiptHash,
    ],
  );

  return refreshEntitlement(userId);
}

export async function findTransactionOwner(
  store: Store,
  transactionRef: string,
): Promise<string | null> {
  const row = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM store_transactions WHERE store = $1 AND transaction_ref = $2`,
    [store, transactionRef],
  );
  return row?.user_id ?? null;
}

/** Webhook/doğrulama olayını denetim izine yazar; aynı yük tekrar işlenmez. */
export async function recordStoreEvent(input: {
  store: Store;
  eventType: string;
  transactionRef?: string | null;
  payload: unknown;
  result?: string | null;
}): Promise<void> {
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(input.payload))
    .digest('hex');
  await query(
    `INSERT INTO store_events
       (store, event_type, transaction_ref, payload_hash, processed_at, result)
     VALUES ($1, $2, $3, $4, now(), $5)
     ON CONFLICT (store, payload_hash) DO NOTHING`,
    [
      input.store,
      input.eventType,
      input.transactionRef ?? null,
      payloadHash,
      input.result ?? null,
    ],
  );
}
