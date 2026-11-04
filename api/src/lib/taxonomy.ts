import { query } from '../db.js';
import type { Locale } from './locale.js';

type TaxonomyEntry = {
  labels: Map<string, string>;
  fieldLabels: Map<string, Record<string, string>>;
  loadedAt: number;
};

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<Locale, TaxonomyEntry>();
const pending = new Map<Locale, Promise<void>>();

/**
 * İstenen dil için varlık türü çevirilerini önbelleğe alır.
 * Katalog değiştiğinde en fazla CACHE_TTL_MS sonra yenilenir.
 */
export async function ensureTaxonomy(locale: Locale): Promise<void> {
  if (locale === 'tr') return;
  const entry = cache.get(locale);
  if (entry && Date.now() - entry.loadedAt < CACHE_TTL_MS) return;
  const inFlight = pending.get(locale);
  if (inFlight) return inFlight;

  const load = (async () => {
    try {
      const rows = await query<{
        base_label: string;
        label: string;
        field_labels: Record<string, string>;
      }>(
        `SELECT t.label AS base_label, tr.label, tr.field_labels
         FROM asset_type_translations tr
         JOIN asset_types t ON t.id = tr.type_id
         WHERE tr.locale = $1`,
        [locale],
      );
      const labels = new Map<string, string>();
      const fieldLabels = new Map<string, Record<string, string>>();
      for (const row of rows) {
        labels.set(row.base_label, row.label);
        if (row.field_labels && Object.keys(row.field_labels).length > 0) {
          fieldLabels.set(row.base_label, row.field_labels);
        }
      }
      cache.set(locale, { labels, fieldLabels, loadedAt: Date.now() });
    } catch {
      // Çeviri tablosu henüz yoksa (migration uygulanmadıysa) temel etiketlerle devam edilir.
      // Hata önbelleğe alınmaz; tablo oluşturulduktan sonraki istekte yeniden denenir.
    }
  })().finally(() => pending.delete(locale));

  pending.set(locale, load);
  return load;
}

export function translateTypeLabel(locale: Locale, baseLabel: string): string {
  if (locale === 'tr') return baseLabel;
  return cache.get(locale)?.labels.get(baseLabel) ?? baseLabel;
}

export function translateFieldLabels(
  locale: Locale,
  baseLabel: string,
): Record<string, string> | undefined {
  if (locale === 'tr') return undefined;
  return cache.get(locale)?.fieldLabels.get(baseLabel);
}

type SchemaField = { key?: string; label?: string; [key: string]: unknown };
type AttributesSchema = { fields?: SchemaField[]; [key: string]: unknown };

/**
 * attributes_schema içindeki alan etiketlerini istenen dile çevirir.
 * Anahtarlar değişmez; yalnızca görünen etiket değişir.
 */
export function localizeAttributesSchema(
  schema: AttributesSchema | null | undefined,
  locale: Locale,
  baseLabel: string,
): AttributesSchema {
  if (!schema || locale === 'tr') return schema ?? {};
  const labels = translateFieldLabels(locale, baseLabel);
  if (!labels || !Array.isArray(schema.fields)) return schema;
  return {
    ...schema,
    fields: schema.fields.map((field) =>
      field.key && labels[field.key] ? { ...field, label: labels[field.key] } : field,
    ),
  };
}

export function clearTaxonomyCache(): void {
  cache.clear();
}
