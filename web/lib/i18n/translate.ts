import { defaultLocale, localeTags, type Locale } from './config';
import { catalogs, type CatalogEntry } from './messages';

export type TParams = Record<string, string | number | null | undefined>;
export type TFunction = (source: string, params?: TParams) => string;

const pluralRules = new Map<string, Intl.PluralRules>();

function rulesFor(locale: Locale): Intl.PluralRules {
  const tag = localeTags[locale];
  let rules = pluralRules.get(tag);
  if (!rules) {
    rules = new Intl.PluralRules(tag);
    pluralRules.set(tag, rules);
  }
  return rules;
}

function lookup(locale: Locale, source: string): CatalogEntry | undefined {
  const entry = catalogs[locale]?.[source];
  if (entry !== undefined) return entry;
  // Kaynak metinler Türkçedir: Türkçe için İngilizceye düşmek yanlış olur.
  if (locale === 'tr') return undefined;
  if (locale !== 'en') return catalogs.en[source];
  return undefined;
}

function interpolate(text: string, params?: TParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === null || value === undefined ? match : String(value);
  });
}

/**
 * Türkçe kaynak metni hedef dile çevirir.
 * Katalogda karşılık yoksa İngilizceye, o da yoksa Türkçeye düşer.
 * `params.count` sayı ise çoğul biçim otomatik seçilir.
 */
export function makeT(locale: Locale): TFunction {
  return (source, params) => {
    const entry = lookup(locale, source);
    if (entry === undefined) return interpolate(source, params);

    let text: string;
    if (typeof entry === 'string') {
      text = entry;
    } else {
      const count = typeof params?.count === 'number' ? params.count : null;
      const category = count === null ? 'other' : rulesFor(locale).select(count);
      const forms = entry as Record<string, string | undefined>;
      text = forms[category] ?? forms.other ?? forms.one ?? source;
    }

    return interpolate(text, params);
  };
}

export const defaultT = makeT(defaultLocale);
