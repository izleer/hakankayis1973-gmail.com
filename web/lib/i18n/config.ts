export const locales = ['tr', 'en', 'de', 'fr', 'es'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'tr';

export const localeNames: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

/** Intl için tam etiketler. */
export const localeTags: Record<Locale, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/**
 * Accept-Language başlığını desteklenen dillere indirger.
 * Eşleşme yoksa Türkçe döner.
 */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;

  const ranked = header
    .split(',')
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(';');
      const tag = rawTag.trim().toLowerCase();
      let quality = 1;
      for (const param of params) {
        const match = param.trim().match(/^q=([0-9.]+)$/i);
        if (match) quality = Number(match[1]);
      }
      return { tag, quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (isLocale(tag)) return tag;
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }

  return defaultLocale;
}

export const LOCALE_COOKIE = 'vh_locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
