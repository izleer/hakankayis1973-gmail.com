import type { Plan, PlanLimits, User } from './types';

/**
 * API'deki `api/src/lib/plans.ts` ile aynı değerler. Buradaki kopya yalnızca
 * arayüzü önceden yönlendirmek içindir; kesin yetki her zaman API'dedir.
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxAssets: 5,
    maxEntriesPerAsset: 10,
    maxMediaPerEntry: 1,
    maxMediaPerAsset: 25,
    maxFileBytes: null,
    maxStorageBytes: 524_288_000,
    ads: true,
    photoHistory: 'basic',
    comparison: 'none',
    charts: 'none',
    reminders: 'basic',
    reports: false,
    bulkExport: false,
    analytics: 'basic',
    cloud: 'limited',
  },
  premium: {
    maxAssets: 50,
    maxEntriesPerAsset: 100,
    maxMediaPerEntry: 10,
    maxMediaPerAsset: 500,
    maxFileBytes: null,
    maxStorageBytes: 5_368_709_120,
    ads: false,
    photoHistory: 'advanced',
    comparison: 'basic',
    charts: 'basic',
    reminders: 'advanced',
    reports: false,
    bulkExport: false,
    analytics: 'advanced',
    cloud: 'standard',
  },
  plus: {
    maxAssets: 250,
    maxEntriesPerAsset: 500,
    maxMediaPerEntry: 25,
    maxMediaPerAsset: 2_000,
    maxFileBytes: null,
    maxStorageBytes: 26_843_545_600,
    ads: false,
    photoHistory: 'advanced',
    comparison: 'advanced',
    charts: 'advanced',
    reminders: 'advanced',
    reports: true,
    bulkExport: true,
    analytics: 'full',
    cloud: 'full',
  },
};

export function planOf(user: Pick<User, 'plan'> | null | undefined): Plan {
  if (user?.plan === 'plus') return 'plus';
  if (user?.plan === 'premium') return 'premium';
  return 'free';
}

/** Ücretli plan (Premium veya Plus). */
export function isPremium(user: Pick<User, 'plan'> | null | undefined): boolean {
  return planOf(user) !== 'free';
}

export function isPlus(user: Pick<User, 'plan'> | null | undefined): boolean {
  return planOf(user) === 'plus';
}

export function limitsFor(user: Pick<User, 'plan'> | null | undefined): PlanLimits {
  return PLAN_LIMITS[planOf(user)];
}

/** Reklam alanları yalnızca ücretsiz planda gösterilir. */
export function showsAds(user: Pick<User, 'plan'> | null | undefined): boolean {
  return limitsFor(user).ads;
}

/** Kayıt başına medya sınırı; planda tanımlı değer yoksa 10 kabul edilir. */
export function mediaLimitFor(user: Pick<User, 'plan'> | null | undefined): number {
  return limitsFor(user).maxMediaPerEntry ?? 10;
}

export function reachedAssetLimit(
  user: Pick<User, 'plan'> | null | undefined,
  assetCount: number,
): boolean {
  const limit = limitsFor(user).maxAssets;
  return limit !== null && assetCount >= limit;
}

export function reachedEntryLimit(
  user: Pick<User, 'plan'> | null | undefined,
  entryCount: number,
): boolean {
  const limit = limitsFor(user).maxEntriesPerAsset;
  return limit !== null && entryCount >= limit;
}
