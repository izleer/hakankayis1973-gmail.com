import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildXlsx, columnLetter } from '../xlsx';

describe('columnLetter', () => {
  it('Excel sütun harflerini üretir', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(1)).toBe('B');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
    expect(columnLetter(27)).toBe('AB');
    expect(columnLetter(51)).toBe('AZ');
    expect(columnLetter(52)).toBe('BA');
    expect(columnLetter(701)).toBe('ZZ');
    expect(columnLetter(702)).toBe('AAA');
  });

  it('negatif indeksi A kabul eder', () => {
    expect(columnLetter(-3)).toBe('A');
  });
});

describe('buildXlsx', () => {
  it('geçerli bir ZIP (XLSX) üretir', async () => {
    const bytes = await buildXlsx(['Ad', 'Değer'], [['Zeytin', 12.5]]);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(500);
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
  });

  it('gerekli OOXML parçalarını içerir', async () => {
    const bytes = await buildXlsx(['Ad'], [['Zeytin']]);
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    expect(names).toContain('[Content_Types].xml');
    expect(names).toContain('_rels/.rels');
    expect(names).toContain('xl/workbook.xml');
    expect(names).toContain('xl/_rels/workbook.xml.rels');
    expect(names).toContain('xl/styles.xml');
    expect(names).toContain('xl/worksheets/sheet1.xml');
  });

  it('metin, sayı ve kaçış karakterlerini doğru yazar', async () => {
    const bytes = await buildXlsx(['Ad', 'Not'], [['Zeytin <A>', 12.5]]);
    const zip = await JSZip.loadAsync(bytes);
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).toContain('Zeytin &lt;A&gt;');
    expect(sheet).toContain('<v>12.5</v>');
    expect(sheet).toContain('s="1"'); // başlık stili
    expect(sheet).toContain('autoFilter');
  });

  it('sayfa adını temizler ve 31 karaktere kısaltır', async () => {
    const bytes = await buildXlsx(['A'], [], { sheetName: 'Geçersiz/Ad:[*?] ve çok uzun bir sayfa adı' });
    const zip = await JSZip.loadAsync(bytes);
    const workbook = await zip.file('xl/workbook.xml')!.async('string');
    const match = workbook.match(/<sheet name="([^"]+)"/);
    expect(match).not.toBeNull();
    expect((match as RegExpMatchArray)[1].length).toBeLessThanOrEqual(31);
    expect((match as RegExpMatchArray)[1]).not.toMatch(/[\\/?*[\]:]/);
  });

  it('boş satırlarda da geçerli çıktı üretir', async () => {
    const bytes = await buildXlsx([], []);
    const zip = await JSZip.loadAsync(bytes);
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheet).toContain('<dimension ref="A1:A1"/>');
  });
});
