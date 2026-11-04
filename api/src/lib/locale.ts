export const locales = ['tr', 'en', 'de', 'fr', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'tr';

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/**
 * Accept-Language başlığını q-değerlerine göre çözer.
 * Desteklenmeyen dillerde Türkçeye düşer.
 */
export function negotiateLocale(header: string | string[] | null | undefined): Locale {
  if (!header) return defaultLocale;
  const raw = Array.isArray(header) ? header.join(',') : header;
  const entries = raw
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((param) => param.trim().startsWith('q='));
      const quality = q ? Number.parseFloat(q.split('=')[1] ?? '0') : 1;
      return { tag: (tag ?? '').trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const entry of entries) {
    if (entry.quality <= 0) continue;
    const base = entry.tag.split('-')[0] ?? '';
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
