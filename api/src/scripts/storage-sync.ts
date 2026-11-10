import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../env.js';
import {
  MIME_EXTENSIONS,
  isSignableMediaKey,
  mediaUrl,
  objectExists,
  saveBuffer,
  storageRoot,
} from '../lib/storage.js';

/**
 * Yerel depolamadaki medyayı S3 uyumlu bir kovaya (ör. Supabase Storage) taşır.
 *
 * - Veritabanına DOKUNMAZ; seed SQL'ini yeniden çalıştırmaz. Yalnızca nesneleri
 *   yükler. DB'deki storage_key değerleri bu anahtarlarla birebir eşleşir.
 * - Idempotent: kovada zaten var olan anahtarlar atlanır (--force ile yeniden yüklenir).
 * - STORAGE_DRIVER=s3 ve geçerli S3_* değişkenleriyle çalıştırılmalıdır.
 *
 * Kullanım (api/ dizininden):
 *   STORAGE_DRIVER=s3 S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... \
 *   S3_SECRET_ACCESS_KEY=... npm run storage:sync
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// api/src/scripts -> api/
const apiDir = path.resolve(scriptDir, '..', '..');
const seedMediaDir = path.join(apiDir, 'seed-media');

const EXT_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_EXTENSIONS).map(([mime, ext]) => [`.${ext}`, mime]),
);
// MIME_EXTENSIONS'ta olmayan yaygın uzantılar.
EXT_MIME['.jpeg'] = 'image/jpeg';

const force = process.argv.includes('--force');

type Candidate = { key: string; file: string; mime: string };

function mimeFor(file: string): string | null {
  return EXT_MIME[path.extname(file).toLowerCase()] ?? null;
}

async function collectSeed(): Promise<Candidate[]> {
  let files: string[];
  try {
    files = await readdir(seedMediaDir);
  } catch {
    return [];
  }
  const out: Candidate[] = [];
  for (const file of files.sort()) {
    const mime = mimeFor(file);
    if (!mime) continue;
    out.push({ key: `seed/${file}`, file: path.join(seedMediaDir, file), mime });
  }
  return out;
}

async function walk(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function collectUploaded(): Promise<Candidate[]> {
  const mediaDir = path.join(storageRoot, 'media');
  const files = await walk(mediaDir);
  const out: Candidate[] = [];
  for (const file of files) {
    const mime = mimeFor(file);
    if (!mime) continue;
    const key = path.relative(storageRoot, file).split(path.sep).join('/');
    out.push({ key, file, mime });
  }
  return out;
}

async function main(): Promise<void> {
  if (env.STORAGE_DRIVER !== 's3') {
    throw new Error(
      'Bu script STORAGE_DRIVER=s3 gerektirir. Hedef kovayı S3_* değişkenleriyle ayarlayın.',
    );
  }
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3_ACCESS_KEY_ID ve S3_SECRET_ACCESS_KEY tanımlı olmalıdır.');
  }

  console.log(`Hedef kova: ${env.S3_BUCKET} (bölge ${env.S3_REGION})`);
  console.log(`Kaynak: ${storageRoot} + ${seedMediaDir}`);

  const candidates = [...(await collectSeed()), ...(await collectUploaded())].filter((c) =>
    isSignableMediaKey(c.key),
  );
  if (candidates.length === 0) {
    console.log('Taşınacak medya bulunamadı.');
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let sampleKey: string | null = null;
  for (const { key, file, mime } of candidates) {
    if (!force && (await objectExists(key))) {
      skipped += 1;
      sampleKey ??= key;
      continue;
    }
    const buffer = await readFile(file);
    await saveBuffer(key, buffer, mime);
    uploaded += 1;
    sampleKey ??= key;
    console.log(`↑ ${key} (${buffer.length} bayt)`);
  }

  console.log(`\n✓ Tamamlandı: ${uploaded} yüklendi, ${skipped} atlandı (zaten vardı).`);
  if (sampleKey) {
    const url = await mediaUrl(sampleKey);
    if (url) console.log(`Örnek erişim adresi (${sampleKey}):\n${url}`);
  }
}

try {
  await main();
} catch (error) {
  console.error('Medya taşıma hatası:', error);
  console.error(
    'İpucu: S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_FORCE_PATH_STYLE=true ve erişim anahtarlarını kontrol edin.',
  );
  process.exitCode = 1;
}