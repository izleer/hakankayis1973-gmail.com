import pg from 'pg';
import { env } from '../env.js';
import {
  describeDatabaseTarget,
  inspectDatabaseUrl,
  resolveMigrationUrl,
  sslOptionsFor,
  withoutSslMode,
} from '../lib/db-config.js';

const { Client } = pg;

const connectionString = resolveMigrationUrl(env.DATABASE_URL, env.DATABASE_MIGRATION_URL);
const target = inspectDatabaseUrl(connectionString);
const ssl = sslOptionsFor(target, env.DATABASE_SSL);

console.log(`Hedef      : ${describeDatabaseTarget(target)}`);
console.log(`SSL        : ${ssl ? (ssl.rejectUnauthorized ? 'açık (sertifika doğrulamalı)' : 'açık') : 'kapalı'}`);

const client = new Client({
  connectionString: withoutSslMode(connectionString),
  application_name: 'izleer-db-check',
  ssl,
});

let failed = false;

async function step(label: string, fn: () => Promise<string>, optional = false): Promise<void> {
  const started = Date.now();
  try {
    const result = await fn();
    console.log(`✓ ${label}: ${result} (${Date.now() - started} ms)`);
  } catch (error) {
    if (!optional) failed = true;
    console.log(`${optional ? '·' : '✗'} ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await client.connect();
console.log('✓ Bağlantı kuruldu.\n');

await step('Sunucu', async () => {
  const { rows } = await client.query<{ version: string }>(
    "SELECT current_setting('server_version') AS version",
  );
  return `PostgreSQL ${rows[0]!.version}`;
});

await step('Veritabanı / kullanıcı', async () => {
  const { rows } = await client.query<{ db: string; usr: string }>(
    'SELECT current_database() AS db, current_user AS usr',
  );
  return `${rows[0]!.db} · ${rows[0]!.usr}`;
});

await step(
  'TLS',
  async () => {
    // Havuzlayıcı (Supavisor) TLS'i kendi tarafında sonlandırdığı için
    // pg_stat_ssl arka uç bağlantısını düz gösterebilir. İstemci soketini esas al.
    const stream = (client as unknown as { connection?: { stream?: { encrypted?: boolean } } })
      .connection?.stream;
    if (stream?.encrypted) return 'istemci tarafında etkin (TLS havuzlayıcıda sonlanıyor)';

    const { rows } = await client.query<{ ssl: boolean | null; version: string | null }>(
      "SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid()",
    );
    if (!rows.length) return 'bilgi yok';
    return rows[0]!.ssl ? `etkin (${rows[0]!.version ?? 'sürüm bilinmiyor'})` : 'kapalı';
  },
  true,
);

await step('public şeması', async () => {
  const { rows } = await client.query<{ tables: string; rls: string }>(`
    SELECT count(*)::text AS tables,
           count(*) FILTER (WHERE c.relrowsecurity)::text AS rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
  `);
  return `${rows[0]!.tables} tablo, ${rows[0]!.rls} tanesinde RLS açık`;
});

await step('Migration durumu', async () => {
  const exists = await client.query<{ reg: string | null }>(
    "SELECT to_regclass('public.schema_migrations')::text AS reg",
  );
  if (!exists.rows[0]!.reg) return 'schema_migrations yok (migration çalıştırılmamış)';
  const { rows } = await client.query<{ applied: string; last: string | null }>(
    'SELECT count(*)::text AS applied, max(name) AS last FROM schema_migrations',
  );
  return `${rows[0]!.applied} dosya uygulanmış${rows[0]!.last ? `, son: ${rows[0]!.last}` : ''}`;
});

await step('Data API kilidi (anon)', async () => {
  const roles = await client.query<{ anon: string | null; authenticated: string | null }>(
    "SELECT to_regrole('anon')::text AS anon, to_regrole('authenticated')::text AS authenticated",
  );
  if (!roles.rows[0]!.anon || !roles.rows[0]!.authenticated) {
    return 'anon/authenticated rolleri yok (yerel PostgreSQL; 005 migration no-op)';
  }
  const tables = await client.query<{ name: string }>(
    `SELECT c.relname AS name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname`,
  );
  const names = tables.rows.map((row) => row.name);
  if (!names.length) return 'tablo yok';
  await client.query('SET ROLE anon');
  try {
    await client.query(`SELECT 1 FROM public.${client.escapeIdentifier(names[0]!)} LIMIT 1`);
    return `DİKKAT: anon public.${names[0]} tablosunu okuyabiliyor (RLS/revoke uygulanmamış)`;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '42501') return `anon erişimi reddedildi (${names.length} tablo korumalı)`;
    throw error;
  } finally {
    await client.query('RESET ROLE');
  }
});

await client.end();

if (failed) {
  console.error('\nBazı kontroller başarısız oldu.');
  process.exitCode = 1;
} else {
  console.log('\nTüm kontroller başarılı.');
}
