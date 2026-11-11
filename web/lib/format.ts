import type { EntryType, Visibility } from './types';
import { localeTags, type Locale } from './i18n/config';

const TIME_ZONE = 'Europe/Istanbul';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const tag = localeTags[locale];
  const key = `${tag}:${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, { ...options, timeZone: TIME_ZONE });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return dateFormatter(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(value),
  );
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return dateFormatter(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatTime(
  value: string | Date | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return dateFormatter(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatDayNumber(
  value: string | Date | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return dateFormatter(locale, { day: 'numeric' }).format(new Date(value));
}

export function formatShort(
  value: string | Date | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return dateFormatter(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDay(
  value: string | Date | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return dateFormatter(locale, { day: 'numeric', month: 'short' }).format(new Date(value));
}

export function formatYear(
  value: string | Date | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return dateFormatter(locale, { year: 'numeric' }).format(new Date(value));
}

export function formatMonthYear(
  value: string | Date | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return dateFormatter(locale, { month: 'short', year: 'numeric' }).format(new Date(value));
}

export function formatLocation(value: string | null | undefined, locale: Locale = 'tr'): string {
  if (!value) return '';
  const tag = localeTags[locale];
  return value
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      if (trimmed === trimmed.toLocaleLowerCase(tag)) {
        return trimmed.charAt(0).toLocaleUpperCase(tag) + trimmed.slice(1);
      }
      return trimmed;
    })
    .join(', ');
}

export function formatNumber(value: number | null | undefined, locale: Locale = 'tr'): string {
  return new Intl.NumberFormat(localeTags[locale]).format(value ?? 0);
}

export function formatBytes(bytes: number, locale: Locale = 'tr'): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${new Intl.NumberFormat(localeTags[locale]).format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  }
  return `${new Intl.NumberFormat(localeTags[locale], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(bytes / (1024 * 1024))} MB`;
}

export function initials(name: string, locale: Locale = 'tr'): string {
  const tag = localeTags[locale];
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase(tag))
    .join('');
}

export function mediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  return url;
}

export const entryTypeLabels: Record<EntryType, string> = {
  note: 'Not',
  photo: 'Fotoğraf',
  maintenance: 'Bakım',
  acquisition: 'Edinme',
  measurement: 'Ölçüm',
  health: 'Sağlık',
  event: 'Dönüm noktası',
  document: 'Belge',
  reminder: 'Hatırlatma',
};

export const entryTypeDescriptions: Record<EntryType, string> = {
  note: 'Bir gözlem, düşünce ya da küçük bir ayrıntı.',
  photo: 'Yalnızca görselin anlattığı bir an.',
  maintenance: 'Budama, bakım, onarım ya da düzenli işler.',
  acquisition: 'Varlığın hayatına girdiği an.',
  measurement: 'Boy, kilo, yaprak sayısı gibi ölçülebilir değişim.',
  health: 'Sağlık, veteriner ya da kontrol notları.',
  event: 'Süreçte geri dönülüp bakılacak bir eşik.',
  document: 'Fatura, sertifika, rapor ya da yazılı belge.',
  reminder: 'Zamanı gelince bildirim ve alarmla hatırlatılacak ileri tarihli iş.',
};

export const visibilityLabels: Record<Visibility, string> = {
  private: 'Yalnızca ben',
  selected: 'Seçili kişiler',
  friends: 'Arkadaşlar',
  public: 'Herkese açık',
};

export const visibilityHints: Record<Visibility, string> = {
  private: 'Bu varlık ve kayıtları yalnızca sizin hafızanızda kalır.',
  selected: 'Yalnızca erişim verdiğiniz kişiler görebilir.',
  friends: 'Yalnızca kabul edilmiş arkadaşlarınız görebilir.',
  public: 'Profilinizde ve keşfet akışında görünür.',
};

const attributeLabels: Record<string, string> = {
  species: 'Tür / çeşit',
  age: 'Yaş',
  birth_date: 'Doğum tarihi',
  style: 'Stil',
  plate: 'Plaka',
  model_year: 'Model yılı',
  brand: 'Marka',
  model: 'Model',
  km: 'Kilometre',
  cost_try: 'Maliyet (TL)',
  from: 'Kaynak',
  flowers: 'Çiçek sayısı',
  color: 'Renk',
  weight: 'Ağırlık',
  height: 'Boy',
};

export function attributeLabel(key: string): string {
  return attributeLabels[key] ?? key.replaceAll('_', ' ');
}

/** Sunucudan gelen şema etiketlerini, ürün sözlüğündeki bilinen etiketlerle birleştirir. */
export function resolveAttributeLabel(
  key: string,
  serverLabels?: Record<string, string>,
): string {
  return attributeLabels[key] ?? serverLabels?.[key] ?? key.replaceAll('_', ' ');
}

const numeric = /^\d+(?:[.,]\d+)?$/;

/** Yaş, ağırlık gibi çıplak sayıları birimle birlikte okunur hâle getirir. */
export function formatAttributeValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (!numeric.test(text)) return text;
  switch (key) {
    case 'age':
      return `${text} yaş`;
    case 'weight':
      return `${text} kg`;
    case 'height':
      return `${text} cm`;
    case 'km':
      return `${text} km`;
    case 'cost_try':
      return `${text} TL`;
    default:
      return text;
  }
}

export type AssetIconName =
  | 'leaf'
  | 'sprout'
  | 'paw'
  | 'car'
  | 'bike'
  | 'home'
  | 'map'
  | 'frame'
  | 'clock'
  | 'sparkles';

const knownIcons: AssetIconName[] = [
  'leaf',
  'sprout',
  'paw',
  'car',
  'bike',
  'home',
  'map',
  'frame',
  'clock',
  'sparkles',
];

export function typeIconName(icon: string | null): AssetIconName {
  return icon && (knownIcons as string[]).includes(icon) ? (icon as AssetIconName) : 'sparkles';
}
