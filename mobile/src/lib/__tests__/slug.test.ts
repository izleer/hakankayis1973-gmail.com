import { describe, expect, it } from 'vitest';
import {
  compactStamp,
  dateFolder,
  folderSegment,
  isSafeArchivePath,
  slugify,
  toAscii,
} from '../slug';

describe('toAscii', () => {
  it('Türkçe karakterleri ASCII karşılığına indirger', () => {
    expect(toAscii('Çağrı İğdır Şölen Ölçü')).toBe('Cagri Igdir Solen Olcu');
  });

  it('ASCII metni değiştirmez', () => {
    expect(toAscii('Delice Zeytin 2026')).toBe('Delice Zeytin 2026');
  });
});

describe('slugify', () => {
  it('küçük harf, rakam ve tire üretir', () => {
    expect(slugify('Delice Zeytin')).toBe('delice-zeytin');
    expect(slugify('  Budama & Bakım  ')).toBe('budama-bakim');
  });

  it('boş veya yalnızca simgeden oluşan girdide fallback döner', () => {
    expect(slugify('---')).toBe('kayit');
    expect(slugify('!!!', 'varlik')).toBe('varlik');
  });

  it('azami uzunluğu uygular ve sondaki tireyi temizler', () => {
    expect(slugify('abc def ghi', 'kayit', 7)).toBe('abc-def');
    expect(slugify('a'.repeat(80), 'kayit', 10)).toBe('a'.repeat(10));
  });

  it('Türkçe karakterleri sadeleştirir', () => {
    expect(slugify('Şişli Çınar')).toBe('sisli-cinar');
  });
});

describe('folderSegment', () => {
  it('okunabilir klasör adı üretir', () => {
    expect(folderSegment('Delice Zeytin')).toBe('Delice-Zeytin');
    expect(folderSegment('İlk Kayıt')).toBe('Ilk-Kayit');
  });

  it('dosya sisteminde yasak karakterleri boşlukla değiştirir', () => {
    expect(folderSegment('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('boş girdide fallback döner', () => {
    expect(folderSegment('   ', 'Varlik')).toBe('Varlik');
  });

  it('azami uzunluğu uygular', () => {
    expect(folderSegment('abcdefghij', 'Varlik', 5)).toBe('abcde');
  });
});

describe('dateFolder', () => {
  it('yerel tarihi YYYY-AA-GG olarak döner', () => {
    expect(dateFolder(new Date(2026, 3, 20, 14, 30).toISOString())).toBe('2026-04-20');
  });

  it('geçersiz tarihte bugüne düşer', () => {
    const result = dateFolder('gecersiz');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('compactStamp', () => {
  it('dosya adı damgası üretir', () => {
    expect(compactStamp(new Date(2026, 10, 27, 9, 5))).toBe('20261127-0905');
  });
});

describe('isSafeArchivePath', () => {
  it('normal göreli yolları kabul eder', () => {
    expect(isSafeArchivePath('assets/varlik/foto_001.jpg')).toBe(true);
    expect(isSafeArchivePath('metadata/kayitlar.csv')).toBe(true);
  });

  it('yol geçişi ve mutlak yolları reddeder', () => {
    expect(isSafeArchivePath('../gizli.txt')).toBe(false);
    expect(isSafeArchivePath('assets/../../etc/passwd')).toBe(false);
    expect(isSafeArchivePath('/etc/passwd')).toBe(false);
    expect(isSafeArchivePath('\\windows\\system32')).toBe(false);
    expect(isSafeArchivePath('')).toBe(false);
    expect(isSafeArchivePath('assets//foto.jpg')).toBe(false);
    expect(isSafeArchivePath('assets/./foto.jpg')).toBe(false);
  });

  it('ters bölü işaretini güvenli biçimde değerlendirir', () => {
    expect(isSafeArchivePath('assets\\varlik\\foto.jpg')).toBe(true);
  });
});
