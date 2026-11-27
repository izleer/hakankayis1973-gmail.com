export const ENTRY_CSV_HEADERS = [
  'Varlık',
  'Varlık türü',
  'Kayıt türü',
  'Başlık',
  'Not',
  'Tarih',
  'Ölçüm değeri',
  'Ölçüm birimi',
  'Hatırlatma',
  'Tamamlandı',
  'Konum',
  'Görünürlük',
] as const;

/** CSV alanlarını tırnaklar ve ayırıcıyı kaçırır. */
export function csvCell(value: unknown, delimiter = ';'): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes('"') || text.includes(delimiter) || /[\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Excel'in Türkçe yerel ayarında doğru açılması için BOM + noktalı virgül.
 * `rows` değerleri hazır metin olmalıdır.
 */
export function buildCsv(headers: readonly string[], rows: readonly unknown[][], delimiter = ';'): string {
  const lines = [headers.map((h) => csvCell(h, delimiter)).join(delimiter)];
  for (const row of rows) {
    lines.push(row.map((cell) => csvCell(cell, delimiter)).join(delimiter));
  }
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

export function csvFileName(root: string, stamp: string): string {
  return `${root}-${stamp}.csv`;
}
