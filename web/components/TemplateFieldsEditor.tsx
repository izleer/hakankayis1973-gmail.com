'use client';

import { useT } from '@/lib/i18n/client';
import type { AttributeField, CustomField } from '@/lib/types';
import { Icon } from './Icons';

function inputType(type: string | undefined): 'text' | 'number' | 'date' {
  if (type === 'number' || type === 'date') return type;
  return 'text';
}

/** Kategori şablonundan gelen hazır alanları generic `attributes` sözlüğüne bağlar. */
export function TemplateFields({
  fields,
  values,
  onChange,
  disabled = false,
}: {
  fields: AttributeField[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="form-grid template-fields">
      {fields.map((field) => (
        <label className="field" key={field.key}>
          <span>
            {field.label}
            {field.unit ? <em className="field-unit">{field.unit}</em> : null}
          </span>
          {field.type === 'select' && field.options && field.options.length > 0 ? (
            <select
              className="select"
              value={values[field.key] ?? ''}
              onChange={(event) =>
                onChange({ ...values, [field.key]: event.target.value })
              }
              disabled={disabled}
            >
              <option value="">—</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              type={inputType(field.type)}
              step={field.type === 'number' ? 'any' : undefined}
              value={values[field.key] ?? ''}
              onChange={(event) =>
                onChange({ ...values, [field.key]: event.target.value })
              }
              placeholder={field.unit ?? field.label}
              disabled={disabled}
            />
          )}
        </label>
      ))}
    </div>
  );
}

const keyMap: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

function slugify(label: string): string {
  return label
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (char) => keyMap[char] ?? char)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export function customFieldKey(label: string, index: number, used: Set<string>): string {
  const base = slugify(label) || `ozel_alan_${index + 1}`;
  let key = base;
  let suffix = 2;
  while (used.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(key);
  return key;
}

/** Boş satırları atar, anahtarsız yeni alanlara okunabilir bir anahtar üretir. */
export function prepareCustomFields(fields: CustomField[]): CustomField[] {
  const used = new Set<string>();
  const prepared: CustomField[] = [];
  fields.forEach((field, index) => {
    const label = field.label.trim();
    const value = String(field.value ?? '').trim();
    if (!label || !value) return;
    const key = field.key.trim() || customFieldKey(label, index, used);
    if (used.has(key) && field.key.trim()) return;
    used.add(key);
    prepared.push({
      key,
      label,
      type: field.type === 'number' || field.type === 'date' ? field.type : 'text',
      value,
    });
  });
  return prepared;
}

const fieldTypes = ['text', 'number', 'date'] as const;

/** Kullanıcının kendi varlığına eklediği serbest alanlar. */
export function CustomFieldsEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: CustomField[];
  onChange: (next: CustomField[]) => void;
  disabled?: boolean;
}) {
  const t = useT();

  function update(index: number, patch: Partial<CustomField>) {
    onChange(value.map((field, current) => (current === index ? { ...field, ...patch } : field)));
  }

  return (
    <div className="custom-fields">
      {value.length === 0 ? (
        <p className="muted-note">
          {t('Henüz özel alan yok. İhtiyacına göre kendi alanını ekleyebilirsin.')}
        </p>
      ) : (
        value.map((field, index) => (
          <div className="custom-field-row" key={index}>
            <input
              className="input"
              value={field.label}
              onChange={(event) => update(index, { label: event.target.value })}
              placeholder={t('Alan adı')}
              maxLength={80}
              disabled={disabled}
              aria-label={t('Alan adı')}
            />
            <select
              className="select"
              value={field.type ?? 'text'}
              onChange={(event) => update(index, { type: event.target.value })}
              disabled={disabled}
              aria-label={t('Alan türü')}
            >
              {fieldTypes.map((type) => (
                <option key={type} value={type}>
                  {t(type === 'text' ? 'Metin' : type === 'number' ? 'Sayı' : 'Tarih')}
                </option>
              ))}
            </select>
            <input
              className="input"
              type={inputType(field.type)}
              step={field.type === 'number' ? 'any' : undefined}
              value={field.value ?? ''}
              onChange={(event) => update(index, { value: event.target.value })}
              placeholder={t('Değer')}
              maxLength={500}
              disabled={disabled}
              aria-label={t('Değer')}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => onChange(value.filter((_, current) => current !== index))}
              aria-label={t('Alanı kaldır')}
              title={t('Alanı kaldır')}
              disabled={disabled}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onChange([...value, { key: '', label: '', type: 'text', value: '' }])}
        disabled={disabled || value.length >= 30}
      >
        <Icon name="plus" size={15} />
        {t('Özel alan ekle')}
      </button>
    </div>
  );
}

/** Şablondaki ölçüm anahtarını yerelleştirilmiş etikete çevirir. */
export function templateMeasurementLabel(
  key: string,
  fields: { key: string; label: string }[],
): string {
  return fields.find((field) => field.key === key)?.label ?? key.replaceAll('_', ' ');
}
