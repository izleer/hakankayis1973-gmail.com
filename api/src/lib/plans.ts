import { query, queryOne } from '../db.js';
import { ApiError } from './errors.js';
import type { Viewer } from './session.js';

export type Plan = 'free' | 'premium';

export type PlanLimits = {
  /** Yeni varlık üst sınırı; null sınırsız. */
  maxAssets: number | null;
  /** Varlık başına kayıt üst sınırı; null sınırsız. */
  maxEntriesPerAsset: number | null;
  /** Kayıt başına fotoğraf/belge üst sınırı; null sınırsız. */
  maxMediaPerEntry: number | null;
  maxMediaPerAsset: number | null;
  maxFileBytes: number | null;
  maxStorageBytes: number | null;
  analytics: 'basic' | 'advanced';
  comparison: boolean;
  reports: boolean;
  cloud: 'limited' | 'full';
};

export const LIMIT_KEYS = [
  'max_assets',
  'max_entries_per_asset',
  'max_media_per_entry',
  'max_media_per_asset',
  'max_file_bytes',
  'max_storage_bytes',
] as const;

export type LimitKey = (typeof LIMIT_KEYS)[number];
export type LimitMode = 'enforce' | 'warn' | 'shadow';

export type LimitRule = {
  plan: Plan;
  limitKey: LimitKey;
  scope: string;
  maxValue: number | null;
  mode: LimitMode;
  warningPct: number;
  active: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

const FIELD_BY_KEY: Record<LimitKey, keyof PlanLimits> = {
  max_assets: 'maxAssets',
  max_entries_per_asset: 'maxEntriesPerAsset',
  max_media_per_entry: 'maxMediaPerEntry',
  max_media_per_asset: 'maxMediaPerAsset',
  max_file_bytes: 'maxFileBytes',
  max_storage_bytes: 'maxStorageBytes',
};

/**
 * Veritabanına ulaşılamadığında kullanılan varsayılanlar. Kalıcı kaynak
 * `plan_limit_rules` tablosudur; buradaki değerler yalnızca yedektir.
 * Okuma ve veri dışa aktarma her planda açıktır.
 */
export const DEFAULT_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxAssets: 5,
    maxEntriesPerAsset: 10,
    maxMediaPerEntry: 1,
    maxMediaPerAsset: null,
    maxFileBytes: null,
    maxStorageBytes: 524_288_000,
    analytics: 'basic',
    comparison: false,
    reports: false,
    cloud: 'limited',
  },
  premium: {
    maxAssets: null,
    maxEntriesPerAsset: null,
    maxMediaPerEntry: 10,
    maxMediaPerAsset: null,
    maxFileBytes: null,
    maxStorageBytes: null,
    analytics: 'advanced',
    comparison: true,
    reports: true,
    cloud: 'full',
  },
};

/** Geriye dönük uyumluluk için; etkin değerler `limitsFor` ile okunmalı. */
export const PLAN_LIMITS = DEFAULT_LIMITS;

const FALLBACK_MODES: Record<LimitKey, LimitMode> = {
  max_assets: 'enforce',
  max_entries_per_asset: 'enforce',
  max_media_per_entry: 'enforce',
  max_media_per_asset: 'shadow',
  max_file_bytes: 'shadow',
  max_storage_bytes: 'shadow',
};

const CACHE_TTL_MS = 60_000;

function fallbackRules(): LimitRule[] {
  const list: LimitRule[] = [];
  for (const plan of ['free', 'premium'] as const) {
    for (const key of LIMIT_KEYS) {
      list.push({
        plan,
        limitKey: key,
        scope: 'all',
        maxValue: DEFAULT_LIMITS[plan][FIELD_BY_KEY[key]] as number | null,
        mode: FALLBACK_MODES[key],
        warningPct: 80,
        active: true,
        updatedAt: null,
        updatedBy: null,
      });
    }
  }
  return list;
}

let limits: Record<Plan, PlanLimits> = {
  free: { ...DEFAULT_LIMITS.free },
  premium: { ...DEFAULT_LIMITS.premium },
};
let rules: LimitRule[] = fallbackRules();
let loadedAt = 0;
let inflight: Promise<void> | null = null;

function parseRule(row: Record<string, any>): LimitRule | null {
  if (row.plan !== 'free' && row.plan !== 'premium') return null;
  if (!(LIMIT_KEYS as readonly string[]).includes(row.limit_key)) return null;
  const mode = row.mode === 'warn' || row.mode === 'shadow' ? row.mode : 'enforce';
  return {
    plan: row.plan,
    limitKey: row.limit_key,
    scope: row.scope ?? 'all',
    maxValue: row.max_value === null ? null : Number(row.max_value),
    mode,
    warningPct: Number(row.warning_pct ?? 80),
    active: row.active !== false,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    updatedBy: row.updated_by ?? null,
  };
}

/**
 * Etkin limitleri veritabanından yeniler. 60 saniyelik önbellek kullanılır;
 * admin panelinden yapılan değişiklikler `force` ile anında yansıtılır.
 * Hata durumunda son bilinen değerler korunur.
 */
export async function refreshPlanLimits(force = false): Promise<void> {
  if (!force && loadedAt && Date.now() - loadedAt < CACHE_TTL_MS) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rows = await query<Record<string, any>>(
        `SELECT plan, limit_key, scope, max_value, mode, warning_pct, active, updated_at, updated_by
         FROM plan_limit_rules`,
      );
      const parsed = rows.map(parseRule).filter((rule): rule is LimitRule => rule !== null);
      if (parsed.length > 0) {
        const next: Record<Plan, PlanLimits> = {
          free: { ...DEFAULT_LIMITS.free },
          premium: { ...DEFAULT_LIMITS.premium },
        };
        for (const rule of parsed) {
          if (!rule.active || rule.scope !== 'all') continue;
          const field = FIELD_BY_KEY[rule.limitKey];
          (next[rule.plan] as Record<string, unknown>)[field] = rule.maxValue;
        }
        rules = parsed;
        limits = next;
      }
      loadedAt = Date.now();
    } catch (error) {
      console.error('Plan limitleri yüklenemedi, son bilinen değerler kullanılıyor:', error);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function planLimitRules(): LimitRule[] {
  return rules.map((rule) => ({ ...rule }));
}

export function planLimitsUpdatedAt(): string | null {
  return loadedAt ? new Date(loadedAt).toISOString() : null;
}

/** Bir limitin etkin kuralı; tablo boşsa yedek kurala düşer. */
export function limitRule(plan: Plan, key: LimitKey, scope = 'all'): LimitRule {
  return (
    rules.find(
      (rule) => rule.plan === plan && rule.limitKey === key && rule.scope === scope,
    ) ?? {
      plan,
      limitKey: key,
      scope,
      maxValue: DEFAULT_LIMITS[plan][FIELD_BY_KEY[key]] as number | null,
      mode: FALLBACK_MODES[key],
      warningPct: 80,
      active: true,
      updatedAt: null,
      updatedBy: null,
    }
  );
}

/** Kapsam (tür) kuralı etkinse onu, değilse `all` kuralını döndürür. */
function scopedRule(plan: Plan, key: LimitKey, scope: string): LimitRule | null {
  if (scope !== 'all') {
    const specific = rules.find(
      (rule) => rule.plan === plan && rule.limitKey === key && rule.scope === scope && rule.active,
    );
    if (specific) return specific;
  }
  const base = rules.find(
    (rule) => rule.plan === plan && rule.limitKey === key && rule.scope === 'all',
  );
  return base ?? limitRule(plan, key);
}

export type UserLimitOverride = {
  userId: string;
  limitKey: LimitKey;
  scope: string;
  maxValue: number | null;
  mode: LimitMode;
  warningPct: number;
  active: boolean;
  note: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
};

const OVERRIDE_TTL_MS = 30_000;
type OverrideCacheEntry = { rows: UserLimitOverride[]; loadedAt: number };
const overrideCache = new Map<string, OverrideCacheEntry>();
const overrideInflight = new Map<string, Promise<UserLimitOverride[]>>();

function parseOverride(row: Record<string, any>): UserLimitOverride | null {
  if (!(LIMIT_KEYS as readonly string[]).includes(row.limit_key)) return null;
  const mode = row.mode === 'warn' || row.mode === 'shadow' ? row.mode : 'enforce';
  return {
    userId: row.user_id,
    limitKey: row.limit_key,
    scope: row.scope ?? 'all',
    maxValue: row.max_value === null ? null : Number(row.max_value),
    mode,
    warningPct: Number(row.warning_pct ?? 80),
    active: row.active !== false,
    note: row.note ?? null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

/**
 * Kullanıcı istisnalarını kısa ömürlü önbellekle okur. Süresi geçmiş
 * kayıtlar sorguda elenir. Tabloya erişilemezse plan kuralları geçerli olur.
 */
export async function loadUserOverrides(
  userId: string,
  force = false,
): Promise<UserLimitOverride[]> {
  const cached = overrideCache.get(userId);
  if (!force && cached && Date.now() - cached.loadedAt < OVERRIDE_TTL_MS) return cached.rows;
  const inflight = overrideInflight.get(userId);
  if (inflight) return inflight;
  const promise = (async () => {
    try {
      const rows = await query<Record<string, any>>(
        `SELECT user_id, limit_key, scope, max_value, mode, warning_pct, active, note,
                expires_at, updated_at
         FROM user_limit_overrides
         WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > now())`,
        [userId],
      );
      const parsed = rows
        .map(parseOverride)
        .filter((row): row is UserLimitOverride => row !== null);
      overrideCache.set(userId, { rows: parsed, loadedAt: Date.now() });
      return parsed;
    } catch (error) {
      console.error(
        'Kullanıcı limit istisnaları yüklenemedi, plan kuralları kullanılıyor:',
        error,
      );
      return cached?.rows ?? [];
    } finally {
      overrideInflight.delete(userId);
    }
  })();
  overrideInflight.set(userId, promise);
  return promise;
}

/** Admin değişikliğinden sonra önbelleği anında temizler. */
export function clearUserOverrideCache(userId?: string): void {
  if (userId) overrideCache.delete(userId);
  else overrideCache.clear();
}

/**
 * Etkin kural sırası: kullanıcı istisnası (tür) → kullanıcı istisnası (all) →
 * plan tür kuralı → plan genel kuralı.
 */
async function resolvedRule(
  viewer: Viewer,
  key: LimitKey,
  scope = 'all',
): Promise<LimitRule | null> {
  const overrides = await loadUserOverrides(viewer.id);
  const specific =
    scope !== 'all'
      ? overrides.find(
          (row) => row.limitKey === key && row.scope === scope && row.active,
        )
      : undefined;
  const base = overrides.find(
    (row) => row.limitKey === key && row.scope === 'all' && row.active,
  );
  const chosen = specific ?? base;
  if (chosen) {
    return {
      plan: viewer.plan,
      limitKey: key,
      scope: chosen.scope,
      maxValue: chosen.maxValue,
      mode: chosen.mode,
      warningPct: chosen.warningPct,
      active: true,
      updatedAt: chosen.updatedAt,
      updatedBy: null,
    };
  }
  return scopedRule(viewer.plan, key, scope);
}

/** Kural açıkça `enforce` değilse yazma engellenmez. */
async function enforced(
  viewer: Viewer,
  key: LimitKey,
  scope = 'all',
): Promise<LimitRule | null> {
  const rule = await resolvedRule(viewer, key, scope);
  if (!rule || !rule.active || rule.mode !== 'enforce' || rule.maxValue === null) return null;
  return rule;
}

/** Plan sınırlarının kullanıcı istisnalarıyla birleşmiş hâli. */
export async function effectiveLimits(viewer: Viewer): Promise<PlanLimits> {
  const merged = { ...limits[viewer.plan] };
  const overrides = await loadUserOverrides(viewer.id);
  for (const row of overrides) {
    if (!row.active || row.scope !== 'all') continue;
    const field = FIELD_BY_KEY[row.limitKey];
    (merged as Record<string, unknown>)[field] = row.maxValue;
  }
  return merged;
}

export type PlanWarningLevel = 'warning' | 'blocked';

export type PlanWarning = {
  limitKey: LimitKey;
  level: PlanWarningLevel;
  mode: LimitMode;
  used: number;
  limit: number;
  pct: number;
  message: string;
};

/**
 * Kullanıcıya gösterilecek kota uyarıları. Yalnızca `enforce` ve `warn`
 * modundaki kurallar değerlendirilir; `shadow` yalnızca ölçülür.
 */
export async function planWarnings(viewer: Viewer): Promise<PlanWarning[]> {
  const warnings: PlanWarning[] = [];

  const assetsRule = await resolvedRule(viewer, 'max_assets');
  if (
    assetsRule &&
    assetsRule.active &&
    assetsRule.mode !== 'shadow' &&
    assetsRule.maxValue !== null &&
    assetsRule.maxValue > 0
  ) {
    const used = await assetUsage(viewer.id);
    const pct = Math.min(100, Math.round((used / assetsRule.maxValue) * 100));
    if (used >= assetsRule.maxValue) {
      warnings.push({
        limitKey: 'max_assets',
        level: 'blocked',
        mode: assetsRule.mode,
        used,
        limit: assetsRule.maxValue,
        pct: 100,
        message: `Varlık sınırını doldurdunuz (${used}/${assetsRule.maxValue}). Yeni varlık eklemek için önce bir varlığı arşivleyin.`,
      });
    } else if (pct >= assetsRule.warningPct) {
      warnings.push({
        limitKey: 'max_assets',
        level: 'warning',
        mode: assetsRule.mode,
        used,
        limit: assetsRule.maxValue,
        pct,
        message: `Varlık sınırınıza yaklaşıyorsunuz (${used}/${assetsRule.maxValue}).`,
      });
    }
  }

  const storageRule = await resolvedRule(viewer, 'max_storage_bytes');
  if (
    storageRule &&
    storageRule.active &&
    storageRule.mode !== 'shadow' &&
    storageRule.maxValue !== null &&
    storageRule.maxValue > 0
  ) {
    const used = await storageUsage(viewer.id);
    const pct = Math.min(100, Math.round((used / storageRule.maxValue) * 100));
    if (used >= storageRule.maxValue) {
      warnings.push({
        limitKey: 'max_storage_bytes',
        level: 'blocked',
        mode: storageRule.mode,
        used,
        limit: storageRule.maxValue,
        pct: 100,
        message: `Depolama kotanız doldu (${formatMb(used)} / ${formatMb(
          storageRule.maxValue,
        )}). Yeni dosya yüklemek için yer açın.`,
      });
    } else if (pct >= storageRule.warningPct) {
      warnings.push({
        limitKey: 'max_storage_bytes',
        level: 'warning',
        mode: storageRule.mode,
        used,
        limit: storageRule.maxValue,
        pct,
        message: `Depolama kotanızın %${pct}'i dolu (${formatMb(used)} / ${formatMb(
          storageRule.maxValue,
        )}).`,
      });
    }
  }

  return warnings;
}

export function normalizePlan(value: unknown): Plan {
  return value === 'premium' ? 'premium' : 'free';
}

export function limitsFor(plan: Plan): PlanLimits {
  return limits[plan];
}

export function isPremium(viewer: Pick<Viewer, 'plan'>): boolean {
  return viewer.plan === 'premium';
}

export async function assetUsage(userId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*) AS count FROM assets WHERE owner_id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  return Number(row?.count ?? 0);
}

function upgradeHint(plan: Plan): string {
  return plan === 'free' ? ' Sınırsız varlık için Premium plana geçin.' : '';
}

export async function assertAssetCapacity(viewer: Viewer): Promise<void> {
  const rule = await enforced(viewer, 'max_assets');
  if (!rule) return;
  if ((await assetUsage(viewer.id)) >= rule.maxValue!) {
    throw new ApiError(
      403,
      'PLAN_ASSET_LIMIT',
      `${
        viewer.plan === 'free' ? 'Ücretsiz planda' : 'Bu planda'
      } en fazla ${rule.maxValue} varlık oluşturabilirsiniz.${upgradeHint(viewer.plan)}`,
    );
  }
}

async function entryUsage(assetId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*) AS count FROM journal_entries WHERE asset_id = $1 AND deleted_at IS NULL`,
    [assetId],
  );
  return Number(row?.count ?? 0);
}

export async function assertEntryCapacity(viewer: Viewer, assetId: string): Promise<void> {
  const rule = await enforced(viewer, 'max_entries_per_asset');
  if (!rule) return;
  if ((await entryUsage(assetId)) >= rule.maxValue!) {
    throw new ApiError(
      403,
      'PLAN_ENTRY_LIMIT',
      `${
        viewer.plan === 'free' ? 'Ücretsiz planda' : 'Bu planda'
      } bir varlığa en fazla ${rule.maxValue} kayıt ekleyebilirsiniz.${
        viewer.plan === 'free' ? ' Sınırsız kayıt için Premium plana geçin.' : ''
      }`,
    );
  }
}

function mediaLimitError(plan: Plan, limit: number): ApiError {
  return new ApiError(
    403,
    'PLAN_MEDIA_LIMIT',
    `${
      plan === 'free' ? 'Ücretsiz planda' : 'Bu planda'
    } bir kayda en fazla ${limit} fotoğraf veya belge ekleyebilirsiniz.${
      plan === 'free' ? ' Daha fazlası için Premium plana geçin.' : ''
    }`,
  );
}

/** Henüz oluşturulmamış bir kayda eklenecek medya sayısını doğrular. */
export async function assertNewEntryMediaCapacity(
  viewer: Viewer,
  incoming: string[] | undefined,
): Promise<void> {
  const rule = await enforced(viewer, 'max_media_per_entry');
  if (!rule) return;
  const unique = new Set(incoming ?? []);
  if (unique.size > rule.maxValue!) throw mediaLimitError(viewer.plan, rule.maxValue!);
}

/**
 * Var olan bir kayda yeni medya eklenirken mevcut dosyalarla birlikte
 * plan sınırını doğrular. Aynı kayda zaten bağlı dosyalar tekrar sayılmaz.
 */
export async function assertEntryMediaCapacity(
  viewer: Viewer,
  entryId: string,
  incoming: string[] | undefined,
): Promise<void> {
  const rule = await enforced(viewer, 'max_media_per_entry');
  if (!rule) return;
  const ids = [...new Set(incoming ?? [])];
  if (ids.length === 0) return;
  const rows = await query<{ id: string; entry_id: string | null }>(
    `SELECT id, entry_id FROM media WHERE entry_id = $1 OR id = ANY($2::uuid[])`,
    [entryId, ids],
  );
  const attached = rows.filter((row) => row.entry_id === entryId).length;
  const added = rows.filter((row) => row.entry_id === null).length;
  if (attached + added > rule.maxValue!) throw mediaLimitError(viewer.plan, rule.maxValue!);
}

/** Upload sırasında doğrudan kayda bağlanan medya için plan kontrolü. */
export async function assertEntryUploadCapacity(viewer: Viewer, entryId: string): Promise<void> {
  const rule = await enforced(viewer, 'max_media_per_entry');
  if (!rule) return;
  const row = await queryOne<{ count: string }>(
    `SELECT count(*) AS count FROM media WHERE entry_id = $1`,
    [entryId],
  );
  if (Number(row?.count ?? 0) + 1 > rule.maxValue!) {
    throw mediaLimitError(viewer.plan, rule.maxValue!);
  }
}

export type MediaKind = 'image' | 'video' | 'document';

const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  image: 'Görsel',
  video: 'Video',
  document: 'Belge',
};

export function mediaKindForMime(mimeType: string): MediaKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

function formatMb(bytes: number): string {
  const value = bytes / (1024 * 1024);
  return `${Number.isInteger(value) ? value : value.toFixed(1)} MB`;
}

function storageHint(plan: Plan): string {
  return plan === 'free' ? ' Yer açabilir veya sınırsız depolama için Premium plana geçebilirsiniz.' : '';
}

/** Tek dosya boyutu sınırı; tür bazlı kural varsa o, yoksa genel kural uygulanır. */
export async function assertFileCapacity(
  viewer: Viewer,
  kind: MediaKind,
  byteSize: number,
): Promise<void> {
  const rule = await enforced(viewer, 'max_file_bytes', kind);
  if (!rule) return;
  if (byteSize > rule.maxValue!) {
    throw new ApiError(
      413,
      'PLAN_FILE_SIZE_LIMIT',
      `${
        viewer.plan === 'free' ? 'Ücretsiz planda' : 'Bu planda'
      } ${MEDIA_KIND_LABEL[kind].toLocaleLowerCase('tr')} dosyası en fazla ${formatMb(
        rule.maxValue!,
      )} olabilir.${storageHint(viewer.plan)}`,
    );
  }
}

async function markStalePendingFailed(userId: string): Promise<void> {
  await query(
    `UPDATE media SET status = 'failed'
     WHERE owner_id = $1 AND status = 'pending' AND created_at < now() - interval '1 hour'`,
    [userId],
  );
}

/**
 * Kullanıcının toplam depolama kullanımı. Hazır dosyalar ve yarım kalmış
 * doğrudan yüklemelerin rezervasyonları sayılır; bir saatten eski `pending`
 * satırlar sahipsiz kabul edilip başarısız işaretlenir.
 */
export async function storageUsage(userId: string, cleanup = true): Promise<number> {
  if (cleanup) await markStalePendingFailed(userId);
  const row = await queryOne<{ bytes: string }>(
    `SELECT COALESCE(sum(byte_size), 0) AS bytes
     FROM media
     WHERE owner_id = $1 AND status IN ('ready', 'pending')`,
    [userId],
  );
  return Number(row?.bytes ?? 0);
}

/**
 * Yeni bir dosyanın toplam kotaya sığdığını doğrular. `excludeMediaId`
 * tamamlanan doğrudan yüklemede rezervasyonun kendisini tekrar saymamak için
 * kullanılır.
 */
export async function assertStorageCapacity(
  viewer: Viewer,
  incomingBytes: number,
  excludeMediaId: string | null = null,
): Promise<void> {
  const rule = await enforced(viewer, 'max_storage_bytes');
  if (!rule) return;
  await markStalePendingFailed(viewer.id);
  const row = await queryOne<{ bytes: string }>(
    `SELECT COALESCE(sum(byte_size), 0) AS bytes
     FROM media
     WHERE owner_id = $1
       AND status IN ('ready', 'pending')
       AND ($2::uuid IS NULL OR id <> $2)`,
    [viewer.id, excludeMediaId],
  );
  const used = Number(row?.bytes ?? 0);
  if (used + incomingBytes > rule.maxValue!) {
    throw new ApiError(
      403,
      'PLAN_STORAGE_LIMIT',
      `${
        viewer.plan === 'free' ? 'Ücretsiz plan' : 'Plan'
      } depolama sınırı ${formatMb(rule.maxValue!)}; kullanılan ${formatMb(
        used,
      )}. Yeni dosya için ${formatMb(used + incomingBytes)} gerekiyor.${storageHint(viewer.plan)}`,
    );
  }
}

async function assetMediaCount(assetId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*) AS count FROM media WHERE asset_id = $1 AND status = 'ready'`,
    [assetId],
  );
  return Number(row?.count ?? 0);
}

function assetMediaLimitError(plan: Plan, limit: number): ApiError {
  return new ApiError(
    403,
    'PLAN_ASSET_MEDIA_LIMIT',
    `${
      plan === 'free' ? 'Ücretsiz planda' : 'Bu planda'
    } bir varlığa en fazla ${limit} dosya bağlanabilir.${
      plan === 'free' ? ' Daha fazlası için Premium plana geçin.' : ''
    }`,
  );
}

/** Yeni bir dosya doğrudan varlığa bağlanırken toplam dosya sayısını doğrular. */
export async function assertAssetMediaCapacity(
  viewer: Viewer,
  assetId: string,
  incoming = 1,
): Promise<void> {
  const rule = await enforced(viewer, 'max_media_per_asset');
  if (!rule) return;
  if ((await assetMediaCount(assetId)) + incoming > rule.maxValue!) {
    throw assetMediaLimitError(viewer.plan, rule.maxValue!);
  }
}

/**
 * Var olan medya kimlikleri bir varlığa bağlanırken yalnızca yeni sayılan
 * dosyaları hesaba katar; zaten aynı varlığa bağlı olanlar tekrar sayılmaz.
 */
export async function assertAssetMediaAttachmentCapacity(
  viewer: Viewer,
  assetId: string,
  mediaIds: string[] | undefined,
): Promise<void> {
  const rule = await enforced(viewer, 'max_media_per_asset');
  if (!rule) return;
  const ids = [...new Set(mediaIds ?? [])];
  if (ids.length === 0) return;
  const rows = await query<{ id: string; asset_id: string | null }>(
    `SELECT id, asset_id FROM media WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  const incoming = rows.filter((row) => row.asset_id !== assetId).length;
  if (incoming === 0) return;
  if ((await assetMediaCount(assetId)) + incoming > rule.maxValue!) {
    throw assetMediaLimitError(viewer.plan, rule.maxValue!);
  }
}
