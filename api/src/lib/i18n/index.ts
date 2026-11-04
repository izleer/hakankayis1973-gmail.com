import type { Locale } from '../locale.js';
import en from './en.js';
import de from './de.js';
import fr from './fr.js';
import es from './es.js';

export type MessageParams = Record<string, string | number | null | undefined>;

type Catalog = Record<string, string>;

const catalogs: Record<Exclude<Locale, 'tr'>, Catalog> = { en, de, fr, es };

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === null || value === undefined ? match : String(value);
  });
}

/**
 * API yanıtlarındaki metinleri istenen dile çevirir.
 * Katalogda karşılığı yoksa Türkçe kaynak metin döner; böylece
 * yeni mesajlar eklenirken çeviri kademeli olarak tamamlanabilir.
 */
export function translate(locale: Locale, source: string, params?: MessageParams): string {
  const template = locale === 'tr' ? source : (catalogs[locale][source] ?? source);
  return interpolate(template, params);
}

export function hasTranslation(locale: Locale, source: string): boolean {
  return locale === 'tr' || source in catalogs[locale];
}
