import { ApiError } from './errors.js';

/**
 * İstemcinin bildirdiği MIME türüne güvenmek yerine dosyanın gerçek içeriğini
 * doğrular. Yalnızca desteklenen türlerin imzaları tanınır; eşleşmeyen veya
 * tanınmayan içerik reddedilir.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function latin1(buffer: Buffer, start: number, end: number): string {
  return buffer.toString('latin1', start, Math.min(end, buffer.length));
}

/**
 * ISO BMFF (mp4/avif) kutu yapısı: 4 byte boyut + 4 byte tür. `ftyp` kutusunun
 * marka alanlarına bakarak avif ile mp4 ayırt edilir.
 */
function inspectFtyp(buffer: Buffer): string | null {
  if (buffer.length < 12 || latin1(buffer, 4, 8) !== 'ftyp') return null;
  const boxSize = buffer.readUInt32BE(0);
  const major = latin1(buffer, 8, 12);
  if (major === 'avif' || major === 'avis') return 'image/avif';
  // Uyumluluk markaları kutu içinde 16. byte'tan itibaren 4'er byte sıralanır.
  const end = Math.min(boxSize, buffer.length, 64);
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    const brand = latin1(buffer, offset, offset + 4);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return 'video/mp4';
}

export function detectMime(buffer: Buffer): string | null {
  if (buffer.length >= 5 && latin1(buffer, 0, 5) === '%PDF-') return 'application/pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
  const gif = latin1(buffer, 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif';
  if (buffer.length >= 12 && latin1(buffer, 0, 4) === 'RIFF' && latin1(buffer, 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return inspectFtyp(buffer);
}

export function assertMediaContent(buffer: Buffer, declaredMime: string): void {
  const detected = detectMime(buffer);
  if (!detected || detected !== declaredMime) {
    throw new ApiError(
      422,
      'INVALID_MEDIA',
      'Dosya içeriği bildirilen dosya türüyle eşleşmiyor.',
    );
  }
}

/**
 * Base64 gövdesini katı biçimde çözer. `Buffer.from` geçersiz karakterleri
 * sessizce yok saydığından önce alfabe, uzunluk ve dolgu doğrulanır; boyut
 * sınırı hem tahmini hem çözülmüş uzunluk üzerinden uygulanır.
 */
export function decodeBase64Media(input: string, maxBytes: number): Buffer {
  const cleaned = input.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  if (cleaned.length === 0) {
    throw new ApiError(422, 'INVALID_MEDIA', 'Dosya boş.');
  }
  if (cleaned.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    throw new ApiError(422, 'INVALID_MEDIA', 'Dosya verisi okunamadı.');
  }
  const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  const estimatedBytes = (cleaned.length / 4) * 3 - padding;
  if (estimatedBytes > maxBytes) {
    throw new ApiError(413, 'UPLOAD_TOO_LARGE', 'Dosya boyutu sınırı aşıldı.');
  }
  const buffer = Buffer.from(cleaned, 'base64');
  if (buffer.length === 0) {
    throw new ApiError(422, 'INVALID_MEDIA', 'Dosya boş.');
  }
  if (buffer.length > maxBytes) {
    throw new ApiError(413, 'UPLOAD_TOO_LARGE', 'Dosya boyutu sınırı aşıldı.');
  }
  return buffer;
}