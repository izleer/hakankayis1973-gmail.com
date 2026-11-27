import { describe, expect, it } from 'vitest';
import {
  daysFromNow,
  dueLabel,
  formatBytes,
  formatDate,
  formatDateTime,
  formatNumber,
  formatShortDate,
  nowInput,
  parseLocalInput,
  toDateInput,
  toDateTimeInput,
  todayInput,
} from '../format';

describe('formatBytes', () => {
  it('bayt, KB, MB ve GB gösterir', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10 * 1024)).toBe('10 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('geçersiz ve negatif değerleri sıfır sayar', () => {
    expect(formatBytes(null)).toBe('0 B');
    expect(formatBytes(-50)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });
});

describe('formatNumber', () => {
  it('Türkçe binlik ayırıcı kullanır', () => {
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(null)).toBe('0');
  });
});

describe('tarih biçimleyicileri', () => {
  it('formatDate uzun Türkçe tarih döner', () => {
    const iso = new Date(2026, 3, 20, 12, 0).toISOString();
    expect(formatDate(iso)).toContain('2026');
    expect(formatDate(iso)).toContain('20');
    expect(formatDate(null)).toBe('—');
  });

  it('formatShortDate kısa tarih döner', () => {
    expect(formatShortDate(new Date(2026, 3, 20, 12, 0).toISOString())).toBe('20.04.2026');
    expect(formatShortDate('gecersiz')).toBe('—');
  });

  it('formatDateTime saat ve dakika içerir', () => {
    const text = formatDateTime(new Date(2026, 3, 20, 14, 30).toISOString());
    expect(text).toContain('2026');
    expect(text).toContain('14:30');
  });
});

describe('parseLocalInput', () => {
  it('tarih ve tarih-saat biçimlerini kabul eder', () => {
    const dateOnly = parseLocalInput('2026-04-20');
    expect(dateOnly).not.toBeNull();
    const date = new Date(dateOnly as string);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(20);
    expect(date.getHours()).toBe(0);

    const withTime = parseLocalInput('2026-04-20 14:30');
    expect(withTime).not.toBeNull();
    expect(new Date(withTime as string).getHours()).toBe(14);
    expect(new Date(withTime as string).getMinutes()).toBe(30);
  });

  it('geçersiz biçimleri reddeder', () => {
    expect(parseLocalInput('')).toBeNull();
    expect(parseLocalInput('20.04.2026')).toBeNull();
    expect(parseLocalInput('2026-13-01')).not.toBeNull(); // JS taşması; biçim geçerli
    expect(parseLocalInput('2026-04')).toBeNull();
  });
});

describe('girdi yardımcıları', () => {
  it('toDateInput ve toDateTimeInput yerel değer üretir', () => {
    const iso = new Date(2026, 3, 20, 14, 30).toISOString();
    expect(toDateInput(iso)).toBe('2026-04-20');
    expect(toDateTimeInput(iso)).toBe('2026-04-20 14:30');
    expect(toDateInput(null)).toBe('');
  });

  it('nowInput ve todayInput doğru biçimde', () => {
    expect(nowInput()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(todayInput()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('daysFromNow ileri tarih üretir', () => {
    const input = daysFromNow(7);
    expect(input).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    const parsed = new Date(parseLocalInput(input) as string);
    const expected = new Date();
    expected.setDate(expected.getDate() + 7);
    expect(parsed.getDate()).toBe(expected.getDate());
  });
});

describe('dueLabel', () => {
  it('bugün, yarın ve gecikme etiketleri üretir', () => {
    const today = new Date();
    expect(dueLabel(today.toISOString())).toBe('Bugün');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(dueLabel(tomorrow.toISOString())).toBe('Yarın');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(dueLabel(yesterday.toISOString())).toBe('Dün');

    const past = new Date();
    past.setDate(past.getDate() - 3);
    expect(dueLabel(past.toISOString())).toBe('3 gün gecikti');

    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(dueLabel(future.toISOString())).toBe('5 gün kaldı');

    expect(dueLabel(null)).toBe('Tarih yok');
  });
});
