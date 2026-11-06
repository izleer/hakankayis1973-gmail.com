import pg, { type PoolClient, type QueryResultRow } from 'pg';
import { env } from './env.js';
import { inspectDatabaseUrl, sslOptionsFor, withoutSslMode } from './lib/db-config.js';

const { Pool } = pg;

export const databaseTarget = inspectDatabaseUrl(env.DATABASE_URL);
export const databaseSsl = sslOptionsFor(databaseTarget, env.DATABASE_SSL);

export const pool = new Pool({
  connectionString: withoutSslMode(env.DATABASE_URL),
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: 'izleer-api',
  ssl: databaseSsl,
});

pool.on('error', (error) => {
  console.error('PostgreSQL bağlantı havuzu hatası:', error);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
