import { describe, expect, it } from 'vitest';
import { ENTRY_CSV_HEADERS, buildCsv, csvCell, csvFileName } from '../csv';

describe('csvCell', () => {
  it('boş değerleri boş metne çevirir', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('basit değerleri olduğu gibi bırakır', () => {
    expect(csvCell('Delice Zeytin')).toBe('Delice Zeytin');
    expect(csvCell(42)).toBe('42');
  });

  it('ayırıcı, tırnak ve satır sonu içeren değerleri kaçırır', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('a,b')).toBe('a,b');
    expect(csvCell('a,b', ',')).toBe('"a,b"');
    expect(csvCell('O "dedi" ki')).toBe('"O ""dedi"" ki"');
    expect(csvCell('satır 1\nsatır 2')).toBe('"satır 1\nsatır 2"');
  });
});

describe('buildCsv', () => {
  it('BOM, başlık ve CRLF satır sonu üretir', () => {
    const csv = buildCsv(['Ad', 'Değer'], [['Zeytin', 12], ['Çınar', null]]);
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toBe('\ufeffAd;Değer\r\nZeytin;12\r\nÇınar;\r\n');
  });

  it('özel ayırıcıyı kullanır', () => {
    const csv = buildCsv(['a', 'b'], [[1, 2]], ',');
    expect(csv).toBe('\ufeffa,b\r\n1,2\r\n');
  });

  it('boş satır listesiyle yalnızca başlık yazar', () => {
    expect(buildCsv(['Tek'], [])).toBe('\ufeffTek\r\n');
  });
});

describe('ENTRY_CSV_HEADERS', () => {
  it('varlık ve ölçüm sütunlarını içerir', () => {
    expect(ENTRY_CSV_HEADERS).toContain('Varlık');
    expect(ENTRY_CSV_HEADERS).toContain('Ölçüm değeri');
    expect(ENTRY_CSV_HEADERS).toContain('Hatırlatma');
  });
});

describe('csvFileName', () => {
  it('kök ve damgadan dosya adı üretir', () => {
    expect(csvFileName('izleer-rapor', '20261127-1430')).toBe('izleer-rapor-20261127-1430.csv');
  });
});
