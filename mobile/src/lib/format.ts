const LOCALE = 'tr-TR';

function asDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = asDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatShortDate(value: string | null | undefined): string {
  const date = asDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  const date = asDate(value);
  if (!date) return '—';
  return date.toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMonth(value: string | null | undefined): string {
  const date = asDate(value);
  if (!date) return 'Tarihsiz';
  return date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}

export function formatBytes(bytes: number | null | undefined): string {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat(LOCALE).format(Number(value) || 0);
}

/** Gün farkı: "bugün", "yarın", "3 gün gecikti" gibi kısa etiket. */
export function dueLabel(value: string | null | undefined): string {
  const date = asDate(value);
  if (!date) return 'Tarih yok';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  if (diff === -1) return 'Dün';
  if (diff < 0) return `${Math.abs(diff)} gün gecikti`;
  return `${diff} gün kaldı`;
}

export function toDateInput(value: string | null | undefined): string {
  const date = asDate(value);
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toDateTimeInput(value: string | null | undefined): string {
  const date = asDate(value);
  if (!date) return '';
  return `${toDateInput(date.toISOString())} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

/** "2026-04-20" veya "2026-04-20 14:30" biçimlerini ISO'ya çevirir. */
export function parseLocalInput(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, y, m, d, hh = '00', mm = '00'] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function nowInput(): string {
  return toDateTimeInput(new Date().toISOString());
}

export function todayInput(): string {
  return toDateInput(new Date().toISOString());
}

export function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateTimeInput(date.toISOString());
}
