import JSZip from 'jszip';

/**
 * Bağımlılık eklemeden, Excel'in doğrudan açabildiği asgari XLSX üretir.
 * Hücreler satır içi metin (inlineStr) olarak yazılır; sayılar gerçek sayı
 * hücresi olur. Başlık satırı koyu yeşil zemin ve beyaz kalın yazıdır.
 */

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function columnLetter(index: number): string {
  let value = Math.max(0, Math.floor(index));
  let result = '';
  do {
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return result;
}

function sheetCell(reference: string, value: unknown, style: number): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"${style ? ` s="${style}"` : ''}><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}" t="b"${style ? ` s="${style}"` : ''}><v>${value ? 1 : 0}</v></c>`;
  }
  const text = escapeXml(String(value));
  if (!text) return '';
  return `<c r="${reference}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${text}</t></is></c>`;
}

export interface XlsxOptions {
  sheetName?: string;
  columnWidths?: number[];
}

export async function buildXlsx(
  headers: readonly string[],
  rows: readonly unknown[][],
  options: XlsxOptions = {},
): Promise<Uint8Array> {
  const sheetName = (options.sheetName ?? 'Rapor').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Rapor';
  const columnCount = Math.max(headers.length, ...rows.map((row) => row.length), 1);
  const widths = Array.from({ length: columnCount }, (_, index) => options.columnWidths?.[index] ?? 18);

  const cols = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');

  const headerRow = headers.length
    ? `<row r="1" ht="22" customHeight="1">${headers
        .map((header, index) => sheetCell(`${columnLetter(index)}1`, header, 1))
        .join('')}</row>`
    : '';

  const bodyRows = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      const cells = row
        .map((value, index) => sheetCell(`${columnLetter(index)}${excelRow}`, value, 2))
        .join('');
      return `<row r="${excelRow}">${cells}</row>`;
    })
    .join('');

  const lastColumn = columnLetter(columnCount - 1);
  const lastRow = Math.max(1, rows.length + 1);

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>${cols}</cols>
  <sheetData>${headerRow}${bodyRows}</sheetData>
  <autoFilter ref="A1:${lastColumn}1"/>
  <pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
  <sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${NS_MAIN}">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2C5844"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PKG_REL}">
  <Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PKG_REL}">
  <Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('xl/workbook.xml', workbookXml);
  zip.file('xl/_rels/workbook.xml.rels', workbookRels);
  zip.file('xl/styles.xml', stylesXml);
  zip.file('xl/worksheets/sheet1.xml', sheetXml);

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
