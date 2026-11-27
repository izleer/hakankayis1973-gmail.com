const TR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'C',
  ğ: 'g',
  Ğ: 'G',
  ı: 'i',
  İ: 'I',
  ö: 'o',
  Ö: 'O',
  ş: 's',
  Ş: 'S',
  ü: 'u',
  Ü: 'U',
  â: 'a',
  Â: 'A',
  î: 'i',
  Î: 'I',
  û: 'u',
  Û: 'U',
};

/** Türkçe karakterleri ASCII karşılığına indirger. */
export function toAscii(input: string): string {
  return input.replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (ch) => TR_MAP[ch] ?? ch);
}

/**
 * Dosya/klasör adı üretimi. Yalnızca küçük harf, rakam ve tire kullanır.
 * Boş sonuç için `fallback` döner.
 */
export function slugify(input: string, fallback = 'kayit', maxLength = 60): string {
  const ascii = toAscii(input).toLowerCase();
  const slug = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  const trimmed = slug.slice(0, maxLength).replace(/-+$/g, '');
  return trimmed || fallback;
}

/** İnsan tarafından okunabilir klasör adı: "Delice-Zeytin" gibi. */
export function folderSegment(input: string, fallback = 'Varlik', maxLength = 80): string {
  const ascii = toAscii(input)
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const withCase = ascii.replace(/ /g, '-').replace(/-{2,}/g, '-');
  const trimmed = withCase.slice(0, maxLength).replace(/-+$/g, '');
  return trimmed || fallback;
}

export function dateFolder(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const y = safe.getFullYear();
  const m = String(safe.getMonth() + 1).padStart(2, '0');
  const d = String(safe.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function compactStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}`;
}

/** Arşiv içinde yol geçişi (path traversal) denemelerini engeller. */
export function isSafeArchivePath(path: string): boolean {
  if (!path || path.startsWith('/') || path.startsWith('\\')) return false;
  if (path.includes('\u0000')) return false;
  const parts = path.replace(/\\/g, '/').split('/');
  return parts.every((part) => part !== '' && part !== '.' && part !== '..');
}
