import { describe, expect, it, vi } from 'vitest';
import {
  buildCatalog,
  isSelectableType,
  normalizeTemplate,
  templateFromCatalog,
  type CatalogRow,
} from '../src/lib/templates.js';

vi.mock('../src/db.js', () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}));

const plant: CatalogRow = {
  id: 'plant',
  parent_id: 'living',
  label: 'Bitkiler',
  schema: {
    fields: [
      { key: 'species', label: 'Tür', labels: { en: 'Species' } },
      { key: 'pot', label: 'Saksı', labels: { en: 'Pot' } },
    ],
    actions: [
      {
        key: 'watering',
        label: 'Sulama',
        entryType: 'maintenance',
        reminderDays: 7,
        labels: { en: 'Watering' },
      },
    ],
    measurements: [{ key: 'height', label: 'Boy', unit: 'cm', labels: { en: 'Height' } }],
  },
};

const bonsai: CatalogRow = {
  id: 'bonsai',
  parent_id: 'plant',
  label: 'Bonsai',
  schema: {
    fields: [
      { key: 'species', label: 'Tür (bonsai)', labels: { en: 'Species (bonsai)' } },
      { key: 'style', label: 'Stil', labels: { en: 'Style' } },
    ],
    actions: [
      {
        key: 'wiring',
        label: 'Telleme',
        entryType: 'maintenance',
        reminderDays: 120,
        labels: { en: 'Wiring' },
      },
    ],
  },
};

const rows = [
  { id: 'living', parent_id: null, label: 'Canlılar', schema: {} },
  plant,
  bonsai,
  { id: 'other', parent_id: null, label: 'Diğer', schema: {} },
];

describe('kategori şablonları', () => {
  it('alt kategori üst kategorinin şablonunu devralır ve kendi alanını ekler', () => {
    const catalog = buildCatalog(rows);
    const template = templateFromCatalog(catalog, 'bonsai', 'tr');

    expect(template.fields.map((field) => field.key)).toEqual(['species', 'pot', 'style']);
    expect(template.actions.map((action) => action.key)).toEqual(['watering', 'wiring']);
    expect(template.measurements.map((measurement) => measurement.key)).toEqual(['height']);
    expect(template.reminders).toEqual([
      { key: 'watering', label: 'Sulama', intervalDays: 7 },
      { key: 'wiring', label: 'Telleme', intervalDays: 120 },
    ]);
  });

  it('aynı anahtardaki alt kategori tanımı üst kategoriyi ezer', () => {
    const template = templateFromCatalog(buildCatalog(rows), 'bonsai', 'tr');
    expect(template.fields.find((field) => field.key === 'species')?.label).toBe('Tür (bonsai)');
  });

  it('şablon etiketlerini hedef dile çevirir', () => {
    const template = templateFromCatalog(buildCatalog(rows), 'bonsai', 'en');
    expect(template.fields.map((field) => field.label)).toEqual([
      'Species (bonsai)',
      'Pot',
      'Style',
    ]);
    expect(template.actions.map((action) => action.label)).toEqual(['Watering', 'Wiring']);
    expect(template.reminders.map((reminder) => reminder.label)).toEqual([
      'Watering',
      'Wiring',
    ]);
    expect(template.measurements[0]?.label).toBe('Height');
  });

  it('yalnızca şablonu olan ara kategoriler seçilebilir', () => {
    const catalog = buildCatalog(rows);
    expect(isSelectableType(catalog, 'living')).toBe(false);
    expect(isSelectableType(catalog, 'plant')).toBe(true);
    expect(isSelectableType(catalog, 'bonsai')).toBe(true);
    expect(isSelectableType(catalog, 'other')).toBe(true);
  });

  it('işlemlerdeki hatırlatma aralığını öneriye dönüştürür', () => {
    const template = normalizeTemplate({
      actions: [{ key: 'checkup', label: 'Kontrol', reminderDays: 180 }],
    });
    expect(template.reminders).toEqual([
      { key: 'checkup', label: 'Kontrol', intervalDays: 180 },
    ]);
  });
});
