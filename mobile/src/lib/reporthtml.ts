export interface ReportPhotoView {
  dataUri: string;
  caption: string;
}

export interface ReportEntryView {
  dateLabel: string;
  typeLabel: string;
  title: string;
  note: string | null;
  measurement: string | null;
  photos: ReportPhotoView[];
}

export interface ReportAssetView {
  name: string;
  typeName: string | null;
  location: string | null;
  description: string | null;
  acquiredLabel: string | null;
  coverDataUri: string | null;
  entryCount: number;
  mediaCount: number;
  entries: ReportEntryView[];
}

export interface ReportDocument {
  title: string;
  subtitle: string;
  generatedLabel: string;
  rangeLabel: string | null;
  summary: Array<{ label: string; value: string }>;
  notes: string[];
  assets: ReportAssetView[];
  includePhotos: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1d2822;
    background: #ffffff;
    font-size: 11px;
    line-height: 1.5;
  }
  .cover {
    padding: 26mm 4mm 12mm;
    border-bottom: 3px solid #a9854f;
    margin-bottom: 8mm;
  }
  .eyebrow {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #a9854f;
    font-weight: 700;
  }
  h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 30px;
    line-height: 1.15;
    margin: 6mm 0 3mm;
    color: #1d2822;
  }
  .subtitle { font-size: 13px; color: #4a564e; margin: 0 0 5mm; }
  .meta { font-size: 10px; color: #6b776f; }
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 3mm;
    margin-top: 8mm;
  }
  .summary div {
    border: 1px solid #e1dacb;
    border-radius: 3mm;
    padding: 3mm 4mm;
    min-width: 34mm;
    background: #fbf8f1;
  }
  .summary b { display: block; font-size: 16px; color: #2c5844; }
  .summary span { font-size: 9px; color: #6b776f; }
  .notes { margin: 0 0 8mm; color: #6b776f; font-size: 9.5px; }
  .notes li { margin-bottom: 1mm; }
  .asset { page-break-inside: avoid; margin-bottom: 10mm; }
  .asset-head { border-left: 4px solid #2c5844; padding-left: 4mm; margin-bottom: 4mm; }
  .asset h2 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 20px;
    margin: 0 0 1mm;
  }
  .asset-type { font-size: 10px; color: #a9854f; text-transform: uppercase; letter-spacing: 1px; }
  .asset-meta { font-size: 9.5px; color: #6b776f; margin-top: 1mm; }
  .cover-photo {
    width: 100%;
    max-height: 92mm;
    object-fit: cover;
    border-radius: 3mm;
    margin: 3mm 0;
  }
  .description { color: #4a564e; margin: 2mm 0 4mm; }
  table { width: 100%; border-collapse: collapse; margin-top: 2mm; }
  thead { display: table-header-group; }
  th {
    background: #2c5844;
    color: #ffffff;
    text-align: left;
    font-size: 9px;
    padding: 2mm 2.4mm;
    font-weight: 600;
  }
  td {
    border-bottom: 1px solid #e1dacb;
    padding: 2mm 2.4mm;
    vertical-align: top;
    font-size: 9.5px;
  }
  tr:nth-child(even) td { background: #fbf8f1; }
  .date { white-space: nowrap; color: #4a564e; width: 22mm; }
  .type { white-space: nowrap; color: #2c5844; width: 24mm; }
  .measurement { white-space: nowrap; width: 26mm; font-weight: 600; }
  .empty { color: #6b776f; font-style: italic; padding: 4mm 0; }
  .photos { display: flex; flex-wrap: wrap; gap: 2.5mm; margin-top: 3mm; }
  .photo {
    width: 48%;
    page-break-inside: avoid;
    border: 1px solid #e1dacb;
    border-radius: 2mm;
    padding: 1.5mm;
    background: #ffffff;
  }
  .photo img { width: 100%; height: 44mm; object-fit: cover; border-radius: 1.5mm; }
  .photo span { display: block; font-size: 8px; color: #6b776f; margin-top: 1mm; }
  .footer {
    margin-top: 8mm;
    border-top: 1px solid #e1dacb;
    padding-top: 3mm;
    font-size: 8.5px;
    color: #6b776f;
  }
`;

export function buildReportHtml(doc: ReportDocument): string {
  const summary = doc.summary
    .map(
      (item) =>
        `<div><b>${escapeHtml(item.value)}</b><span>${escapeHtml(item.label)}</span></div>`,
    )
    .join('');

  const notes = doc.notes.length
    ? `<ul class="notes">${doc.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
    : '';

  const assets = doc.assets
    .map((asset) => {
      const meta = [asset.typeName, asset.location, asset.acquiredLabel ? `Edinme: ${asset.acquiredLabel}` : null]
        .filter((part): part is string => Boolean(part))
        .map((part) => escapeHtml(part))
        .join(' · ');

      const cover = asset.coverDataUri
        ? `<img class="cover-photo" src="${asset.coverDataUri}" alt="${escapeHtml(asset.name)} kapak fotoğrafı"/>`
        : '';

      const rows = asset.entries
        .map((entry) => {
          const cells = [
            `<td class="date">${escapeHtml(entry.dateLabel)}</td>`,
            `<td class="type">${escapeHtml(entry.typeLabel)}</td>`,
            `<td>${escapeHtml(entry.title)}${
              entry.note ? `<br/><span style="color:#6b776f">${escapeHtml(entry.note)}</span>` : ''
            }</td>`,
            `<td class="measurement">${entry.measurement ? escapeHtml(entry.measurement) : ''}</td>`,
          ].join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      const table = asset.entries.length
        ? `<table><thead><tr><th>Tarih</th><th>Tür</th><th>Kayıt</th><th>Ölçüm</th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p class="empty">Seçilen aralıkta kayıt yok.</p>';

      const photos =
        doc.includePhotos && asset.entries.some((entry) => entry.photos.length > 0)
          ? `<div class="photos">${asset.entries
              .flatMap((entry) => entry.photos)
              .map(
                (photo) =>
                  `<div class="photo"><img src="${photo.dataUri}" alt="${escapeHtml(
                    photo.caption,
                  )}"/><span>${escapeHtml(photo.caption)}</span></div>`,
              )
              .join('')}</div>`
          : '';

      return `<section class="asset">
        <div class="asset-head">
          <div class="asset-type">${escapeHtml(asset.typeName ?? 'Varlık')}</div>
          <h2>${escapeHtml(asset.name)}</h2>
          <div class="asset-meta">${meta}</div>
          <div class="asset-meta">${asset.entryCount} kayıt · ${asset.mediaCount} fotoğraf</div>
        </div>
        ${cover}
        ${asset.description ? `<p class="description">${escapeHtml(asset.description)}</p>` : ''}
        ${table}
        ${photos}
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(doc.title)}</title>
<style>${STYLES}</style>
</head>
<body>
  <header class="cover">
    <div class="eyebrow">izleer · yerel arşiv raporu</div>
    <h1>${escapeHtml(doc.title)}</h1>
    <p class="subtitle">${escapeHtml(doc.subtitle)}</p>
    <div class="meta">${escapeHtml(doc.generatedLabel)}</div>
    ${doc.rangeLabel ? `<div class="meta">${escapeHtml(doc.rangeLabel)}</div>` : ''}
    <div class="summary">${summary}</div>
  </header>
  ${notes}
  ${assets || '<p class="empty">Rapor kapsamında varlık bulunamadı.</p>'}
  <div class="footer">
    Bu rapor telefonunuzdaki izleer arşivinden, cihaz üzerinde üretilmiştir.
    Verileriniz sunucuya yüklenmemiştir. Arşivin aslı değiştirilmemiştir.
  </div>
</body>
</html>`;
}
