import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { env } from '../env.js';
import { inspectDatabaseUrl, resolveMigrationUrl, sslOptionsFor, withoutSslMode } from '../lib/db-config.js';
import { saveBuffer } from '../lib/storage.js';

const { Client } = pg;

// Geliştirmede komut api/ dizininden çalışır; konteynerde APP_ROOT=/app verilir.
const projectRoot =
  process.env.APP_ROOT ??
  (existsSync(path.join(process.cwd(), 'db', 'migrations'))
    ? process.cwd()
    : path.resolve(process.cwd(), '..'));
const migrationsDir = path.join(projectRoot, 'db', 'migrations');
const seedFile = path.join(projectRoot, 'db', 'seed.sql');
const MIGRATION_LOCK = 582017;

function createClient(): pg.Client {
  // Supabase transaction pooler'ı DDL ve advisory lock için uygun değildir.
  const connectionString = resolveMigrationUrl(env.DATABASE_URL, env.DATABASE_MIGRATION_URL);
  const ssl = sslOptionsFor(inspectDatabaseUrl(connectionString), env.DATABASE_SSL);
  return new Client({
    connectionString: withoutSslMode(connectionString),
    application_name: 'izleer-migrate',
    ssl,
  });
}

export async function runMigrations(): Promise<void> {
  const client = createClient();
  await client.connect();
  try {
    // Birden fazla API kopyası aynı anda başlasa da migration'lar sırayla uygulanır.
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE name = $1',
        [file],
      );
      if (existing.rowCount) {
        if (existing.rows[0]!.checksum !== checksum) {
          throw new Error(
            `${file} daha önce uygulanmış ve içeriği değişmiş. Yeni bir migration dosyası oluşturun.`,
          );
        }
        console.log(`= ${file} (önceden uygulanmış)`);
        continue;
      }
      console.log(`→ ${file} uygulanıyor...`);
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        file,
        checksum,
      ]);
      console.log(`✓ ${file}`);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]).catch(() => undefined);
    await client.end();
  }
}

const seedMediaDir = path.join(projectRoot, 'api', 'seed-media');

const SEED_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

async function syncSeedMedia(): Promise<void> {
  let files: string[];
  try {
    files = await readdir(seedMediaDir);
  } catch {
    return;
  }
  for (const file of files.sort()) {
    const mime = SEED_MIME[path.extname(file).toLowerCase()];
    if (!mime) continue;
    const buffer = await readFile(path.join(seedMediaDir, file));
    await saveBuffer(`seed/${file}`, buffer, mime);
    console.log(`· seed medyası hazır: seed/${file}`);
  }
}

export async function runSeed(): Promise<void> {
  const sql = await readFile(seedFile, 'utf8');
  await syncSeedMedia();
  const client = createClient();
  await client.connect();
  try {
    await client.query(sql);
    console.log('✓ Demo verisi yüklendi. Demo hesapların şifresi: Demo1234!');
    console.log('  ada@demo.local, mert@demo.local, selin@demo.local (moderatör), deniz@demo.local');
  } finally {
    await client.end();
  }
}

export async function resetDatabase(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Üretim ortamında veritabanı sıfırlanamaz.');
  }
  const client = createClient();
  await client.connect();
  try {
    console.log('! public şeması siliniyor...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
  } finally {
    await client.end();
  }
  await runMigrations();
  await runSeed();
}
