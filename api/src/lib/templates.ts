import { query } from '../db.js';
import type { Locale } from './locale.js';
import { ensureTaxonomy, translateFieldLabels } from './taxonomy.js';

/**
 * Kategori şablonları generic varlık modeline uygulanan konfigürasyondur.
 * Şablonlar asset_types.attributes_schema içinde saklanır; alt kategori üst
 * kategorinin şablonunu devralır. Her kategori için ayrı tablo açılmaz.
 */

export type TemplateField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  unit?: string | null;
  options?: string[];
  labels?: Record<string, string>;
};

export type TemplateAction = {
  key: string;
  label: string;
  /** Generic journal_entries.type değerine eşlenir. */
  entryType?: string;
  /** Doluysa istemcilere hatırlatma önerisi olarak sunulur. */
  reminderDays?: number;
  labels?: Record<string, string>;
};

export type TemplateMeasurement = {
  key: string;
  label: string;
  unit: string;
  labels?: Record<string, string>;
};

export type TemplateReminder = {
  key: string;
  label: string;
  intervalDays: number;
};

export type CategoryTemplate = {
  fields: TemplateField[];
  actions: TemplateAction[];
  measurements: TemplateMeasurement[];
  reminders: TemplateReminder[];
};

export type CatalogRow = {
  id: string;
  parent_id: string | null;
  label: string;
  schema: unknown;
};

export type TemplateCatalog = Map<string, CatalogRow>;

const EMPTY: CategoryTemplate = { fields: [], actions: [], measurements: [], reminders: [] };
const CACHE_TTL_MS = 60_000;

let cache: { rows: CatalogRow[]; byId: TemplateCatalog; loadedAt: number } | null = null;
let pending: Promise<void> | null = null;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
}

function labelMap(value: unknown): Record<string, string> | undefined {
  const record = asRecord(value);
  const entries = Object.entries(record).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function normalizeTemplate(raw: unknown): CategoryTemplate {
  const schema = asRecord(raw);
  const actions: TemplateAction[] = asArray(schema.actions).map((item) => ({
    key: String(item.key ?? ''),
    label: String(item.label ?? ''),
    entryType: typeof item.entryType === 'string' ? item.entryType : 'event',
    ...(typeof item.reminderDays === 'number' && item.reminderDays > 0
      ? { reminderDays: item.reminderDays }
      : {}),
    ...(labelMap(item.labels) ? { labels: labelMap(item.labels) } : {}),
  }));

  return {
    fields: asArray(schema.fields).map((item) => ({
      key: String(item.key ?? ''),
      label: String(item.label ?? ''),
      type:
        item.type === 'number' || item.type === 'date' || item.type === 'select'
          ? item.type
          : 'text',
      ...(typeof item.unit === 'string' ? { unit: item.unit } : {}),
      ...(Array.isArray(item.options)
        ? { options: item.options.filter((option): option is string => typeof option === 'string') }
        : {}),
      ...(labelMap(item.labels) ? { labels: labelMap(item.labels) } : {}),
    })),
    actions,
    measurements: asArray(schema.measurements).map((item) => ({
      key: String(item.key ?? ''),
      label: String(item.label ?? ''),
      unit: String(item.unit ?? ''),
      ...(labelMap(item.labels) ? { labels: labelMap(item.labels) } : {}),
    })),
    reminders: actions
      .filter((action) => action.reminderDays)
      .map((action) => ({
        key: action.key,
        label: action.label,
        intervalDays: action.reminderDays!,
      })),
  };
}

export function hasConfiguredTemplate(raw: unknown): boolean {
  const template = normalizeTemplate(raw);
  return (
    template.fields.length > 0 ||
    template.actions.length > 0 ||
    template.measurements.length > 0
  );
}

async function loadCatalog(): Promise<void> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return;
  if (pending) return pending;
  pending = (async () => {
    try {
      const rows = await query<{ id: string; parent_id: string | null; label: string; attributes_schema: unknown }>(
        `SELECT id, parent_id, label, attributes_schema FROM asset_types WHERE is_active = true`,
      );
      const mapped: CatalogRow[] = rows.map((row) => ({
        id: row.id,
        parent_id: row.parent_id,
        label: row.label,
        schema: row.attributes_schema,
      }));
      cache = {
        rows: mapped,
        byId: new Map(mapped.map((row) => [row.id, row])),
        loadedAt: Date.now(),
      };
    } catch {
      // Tablo henüz yoksa boş katalogla devam edilir; sonraki istekte yeniden denenir.
    }
  })().finally(() => {
    pending = null;
  });
  return pending;
}

export async function getCatalog(): Promise<TemplateCatalog> {
  await loadCatalog();
  return cache?.byId ?? new Map();
}

export async function getCatalogRows(): Promise<CatalogRow[]> {
  await loadCatalog();
  return cache?.rows ?? [];
}

export function clearTemplateCache(): void {
  cache = null;
}

export function buildCatalog(rows: CatalogRow[]): TemplateCatalog {
  return new Map(rows.map((row) => [row.id, row]));
}

function localizeItem<T extends { key: string; label: string; labels?: Record<string, string> }>(
  item: T,
  locale: Locale,
  typeLabel: string,
): T {
  const translated = item.labels?.[locale];
  const fromTable = translateFieldLabels(locale, typeLabel)?.[item.key];
  const label = translated ?? fromTable ?? item.label;
  const { labels: _labels, ...rest } = item;
  return { ...rest, label } as T;
}

function mergeInto(target: CategoryTemplate, source: CategoryTemplate): void {
  const mergeList = <T extends { key: string }>(base: T[], extra: T[]): T[] => {
    const map = new Map(base.map((item) => [item.key, item]));
    for (const item of extra) map.set(item.key, item);
    return [...map.values()];
  };
  target.fields = mergeList(target.fields, source.fields);
  target.actions = mergeList(target.actions, source.actions);
  target.measurements = mergeList(target.measurements, source.measurements);
  target.reminders = mergeList(
    target.reminders,
    source.actions
      .filter((action) => action.reminderDays)
      .map((action) => ({
        key: action.key,
        label: action.label,
        intervalDays: action.reminderDays!,
      })),
  );
}

/**
 * Kategori ve üst kategorilerinin şablonlarını birleştirir. Aynı anahtara sahip
 * alt kategori tanımı üst kategoriyi ezer; böylece Bonsai gibi alt türler
 * yalnızca ek alanlarını tanımlar.
 */
export function templateFromCatalog(
  catalog: TemplateCatalog,
  typeId: string,
  locale: Locale,
): CategoryTemplate {
  const chain: CatalogRow[] = [];
  const seen = new Set<string>();
  let current = catalog.get(typeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parent_id ? catalog.get(current.parent_id) : undefined;
  }

  const merged: CategoryTemplate = {
    fields: [],
    actions: [],
    measurements: [],
    reminders: [],
  };
  for (const row of chain) {
    const template = normalizeTemplate(row.schema);
    mergeInto(merged, {
      fields: template.fields.map((item) => localizeItem(item, locale, row.label)),
      actions: template.actions.map((item) => localizeItem(item, locale, row.label)),
      measurements: template.measurements.map((item) => localizeItem(item, locale, row.label)),
      reminders: template.reminders,
    });
  }
  return merged;
}

export async function templateForType(
  typeId: string,
  locale: Locale,
): Promise<CategoryTemplate> {
  await ensureTaxonomy(locale);
  return templateFromCatalog(await getCatalog(), typeId, locale);
}

export function isSelectableType(catalog: TemplateCatalog, typeId: string): boolean {
  const row = catalog.get(typeId);
  if (!row) return false;
  const hasChildren = [...catalog.values()].some((item) => item.parent_id === typeId);
  return !hasChildren || hasConfiguredTemplate(row.schema);
}

export function emptyTemplate(): CategoryTemplate {
  return { ...EMPTY, fields: [], actions: [], measurements: [], reminders: [] };
}
