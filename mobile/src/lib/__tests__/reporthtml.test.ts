import { describe, expect, it } from 'vitest';
import { buildReportHtml, type ReportDocument } from '../reporthtml';

function baseDocument(overrides: Partial<ReportDocument> = {}): ReportDocument {
  return {
    title: 'Varlık geçmişi',
    subtitle: 'Tek bir varlığın tüm kayıtlarını kronolojik olarak toplar.',
    generatedLabel: 'Oluşturma: 27 Kasım 2026',
    rangeLabel: null,
    summary: [
      { label: 'Varlık', value: '1' },
      { label: 'Kayıt', value: '2' },
    ],
    notes: ['Rapor cihaz üzerinde üretildi.'],
    includePhotos: true,
    assets: [
      {
        name: 'Delice Zeytin',
        typeName: 'Bonsai',
        location: 'Balkon',
        description: 'İlk bonsai denemesi.',
        acquiredLabel: '12 Mart 2026',
        coverDataUri: null,
        entryCount: 2,
        mediaCount: 1,
        entries: [
          {
            dateLabel: '20.04.2026',
            typeLabel: 'Bakım',
            title: 'Budama',
            note: 'Üst dallar kısaltıldı.',
            measurement: null,
            photos: [
              { dataUri: 'data:image/jpeg;base64,AAAA', caption: 'Budama sonrası' },
            ],
          },
          {
            dateLabel: '21.04.2026',
            typeLabel: 'Ölçüm',
            title: 'Gövde çapı',
            note: null,
            measurement: '12,5 cm',
            photos: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('buildReportHtml', () => {
  it('geçerli Türkçe HTML belgesi üretir', () => {
    const html = buildReportHtml(baseDocument());
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="tr">');
    expect(html).toContain('<meta charset="utf-8"/>');
    expect(html).toContain('Varlık geçmişi');
    expect(html).toContain('izleer · yerel arşiv raporu');
  });

  it('özet, not ve kayıt tablosunu yazar', () => {
    const html = buildReportHtml(baseDocument());
    expect(html).toContain('<b>1</b><span>Varlık</span>');
    expect(html).toContain('<li>Rapor cihaz üzerinde üretildi.</li>');
    expect(html).toContain('Budama');
    expect(html).toContain('Üst dallar kısaltıldı.');
    expect(html).toContain('12,5 cm');
    expect(html).toContain('Delice Zeytin');
    expect(html).toContain('Bonsai');
    expect(html).toContain('2 kayıt · 1 fotoğraf');
  });

  it('fotoğrafları data URI ve açıklamayla gömer', () => {
    const html = buildReportHtml(baseDocument());
    expect(html).toContain('class="photos"');
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
    expect(html).toContain('Budama sonrası');
  });

  it('includePhotos false iken fotoğraf bölümü eklemez', () => {
    const html = buildReportHtml(baseDocument({ includePhotos: false }));
    expect(html).not.toContain('class="photos"');
    expect(html).not.toContain('data:image/jpeg;base64,AAAA');
  });

  it('HTML özel karakterlerini kaçırır', () => {
    const html = buildReportHtml(
      baseDocument({
        title: '<script>alert(1)</script>',
        notes: ['5 < 6 & 7 > 3'],
        assets: [
          {
            name: 'A & B <C>',
            typeName: 'Tür "özel"',
            location: null,
            description: '<b>kalın</b>',
            acquiredLabel: null,
            coverDataUri: null,
            entryCount: 1,
            mediaCount: 0,
            entries: [
              {
                dateLabel: '01.01.2026',
                typeLabel: 'Not',
                title: '<img src=x onerror=alert(1)>',
                note: '"tırnak" & kesme\'',
                measurement: null,
                photos: [],
              },
            ],
          },
        ],
      }),
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('5 &lt; 6 &amp; 7 &gt; 3');
    expect(html).toContain('A &amp; B &lt;C&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&quot;tırnak&quot; &amp; kesme&#39;');
  });

  it('varlık yoksa boş durum gösterir', () => {
    const html = buildReportHtml(baseDocument({ assets: [] }));
    expect(html).toContain('Rapor kapsamında varlık bulunamadı.');
  });

  it('kayıt yoksa tablo yerine boş mesaj yazar', () => {
    const doc = baseDocument();
    doc.assets[0].entries = [];
    const html = buildReportHtml(doc);
    expect(html).toContain('Seçilen aralıkta kayıt yok.');
    expect(html).not.toContain('<table>');
  });

  it('tarih aralığı ve kapak fotoğrafını ekler', () => {
    const html = buildReportHtml(
      baseDocument({ rangeLabel: '01.01.2026 – 31.12.2026' }),
    );
    expect(html).toContain('01.01.2026 – 31.12.2026');

    const withCover = baseDocument();
    withCover.assets[0].coverDataUri = 'data:image/png;base64,BBBB';
    const coverHtml = buildReportHtml(withCover);
    expect(coverHtml).toContain('class="cover-photo"');
    expect(coverHtml).toContain('data:image/png;base64,BBBB');
  });
});
