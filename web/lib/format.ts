import type { EntryType, Visibility } from './types';

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

const dateTimeFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

const shortFmt = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

const dayFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Istanbul',
});

const yearFmt = new Intl.DateTimeFormat('tr-TR', {
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return dateTimeFmt.format(new Date(value));
}

export function formatShort(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return shortFmt.format(new Date(value));
}

export function formatDay(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return dayFmt.format(new Date(value));
}

export function formatYear(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return yearFmt.format(new Date(value));
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('tr-TR').format(value ?? 0);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
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
};

export const visibilityLabels: Record<Visibility, string> = {
  private: 'Yalnızca ben',
  selected: 'Seçili kişiler',
  public: 'Herkese açık',
};

export const visibilityHints: Record<Visibility, string> = {
  private: 'Bu varlık ve kayıtları yalnızca sizin hafızanızda kalır.',
  selected: 'Yalnızca erişim verdiğiniz kişiler görebilir.',
  public: 'Profilinizde ve keşfet akışında görünür.',
};

const attributeLabels: Record<string, string> = {
  species: 'Tür',
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
