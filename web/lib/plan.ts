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

export function planOf(user: Pick<User, 'plan'> | null | undefined): Plan {
  return user?.plan === 'premium' ? 'premium' : 'free';
}

export function isPremium(user: Pick<User, 'plan'> | null | undefined): boolean {
  return planOf(user) === 'premium';
}

export function limitsFor(user: Pick<User, 'plan'> | null | undefined): PlanLimits {
  return PLAN_LIMITS[planOf(user)];
}

/** Ücretsiz planda kayıt başına medya sınırı; Premium'da üst sınır 10. */
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
