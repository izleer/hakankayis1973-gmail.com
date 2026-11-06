import pg from 'pg';
import { describe, expect, it } from 'vitest';
import {
  describeDatabaseTarget,
  inspectDatabaseUrl,
  resolveMigrationUrl,
  sslOptionsFor,
  withoutSslMode,
} from '../src/lib/db-config.js';

const transactionPooler =
  'postgresql://postgres.abcd:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require';
const sessionPooler =
  'postgresql://postgres.abcd:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require';
const direct = 'postgresql://postgres.abcd:pw@db.abcd.supabase.co:5432/postgres';
const local = 'postgresql://app:app@127.0.0.1:5432/varlik_hafizasi';

describe('inspectDatabaseUrl', () => {
  it('Supabase transaction pooler adresini tanır', () => {
    const target = inspectDatabaseUrl(transactionPooler);
    expect(target.pooler).toBe('transaction-pooler');
    expect(target.supabase).toBe(true);
    expect(target.port).toBe(6543);
    expect(target.sslmode).toBe('require');
    expect(target.database).toBe('postgres');
  });

  it('session pooler ve doğrudan bağlantıyı ayırır', () => {
    expect(inspectDatabaseUrl(sessionPooler).pooler).toBe('session-pooler');
    expect(inspectDatabaseUrl(direct).pooler).toBe('direct');
    expect(inspectDatabaseUrl(direct).supabase).toBe(true);
  });

  it('yerel PostgreSQL hedefini Supabase saymaz', () => {
    const target = inspectDatabaseUrl(local);
    expect(target).toMatchObject({
      host: '127.0.0.1',
      port: 5432,
      database: 'varlik_hafizasi',
      pooler: 'direct',
      supabase: false,
      sslmode: null,
    });
  });

  it('geçersiz veya farklı şemalı adresi reddeder', () => {
    expect(() => inspectDatabaseUrl('bu bir adres değil')).toThrow('postgres://');
    expect(() => inspectDatabaseUrl('https://example.com/db')).toThrow('postgres://');
  });
});

describe('sslOptionsFor', () => {
  it('sslmode=require ve Supabase için SSL açar, sertifika doğrulamasını kapatır', () => {
    expect(sslOptionsFor(inspectDatabaseUrl(transactionPooler), false)).toEqual({
      rejectUnauthorized: false,
    });
    expect(sslOptionsFor(inspectDatabaseUrl(direct), false)).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('sslmode=verify-full sertifika doğrulamasını korur', () => {
    const target = inspectDatabaseUrl(`${direct}?sslmode=verify-full`);
    expect(sslOptionsFor(target, false)).toEqual({ rejectUnauthorized: true });
  });

  it('sslmode=disable yerelde SSL kapalı tutar, açık zorlamada devre dışı kalır', () => {
    const target = inspectDatabaseUrl(`${local}?sslmode=disable`);
    expect(sslOptionsFor(target, false)).toBe(false);
    expect(sslOptionsFor(target, true)).toEqual({ rejectUnauthorized: false });
  });

  it('DATABASE_SSL=true yerel bağlantıda da SSL açar', () => {
    expect(sslOptionsFor(inspectDatabaseUrl(local), true)).toEqual({ rejectUnauthorized: false });
  });
});

describe('withoutSslMode', () => {
  it('sslmode parametresini kaldırır, diğer parametreleri korur', () => {
    const cleaned = withoutSslMode(`${direct}?sslmode=require&application_name=test`);
    expect(cleaned).not.toContain('sslmode');
    expect(cleaned).toContain('application_name=test');
    expect(inspectDatabaseUrl(cleaned).sslmode).toBeNull();
  });

  it('ssl seçeneği pg tarafından korunur', () => {
    const client = new pg.Client({
      connectionString: withoutSslMode(transactionPooler),
      ssl: { rejectUnauthorized: false },
    });
    const parameters = (client as unknown as { connectionParameters: { ssl: unknown } })
      .connectionParameters;
    expect(parameters.ssl).toEqual({ rejectUnauthorized: false });
  });
});

describe('resolveMigrationUrl', () => {
  it('verilen migration adresini kullanır', () => {
    expect(resolveMigrationUrl(transactionPooler, direct)).toBe(direct);
  });

  it('transaction pooler üzerinden migration başlatmayı reddeder', () => {
    expect(() => resolveMigrationUrl(transactionPooler)).toThrow('transaction pooler');
  });

  it('session pooler üzerinden migration başlatmaya izin verir', () => {
    expect(resolveMigrationUrl(transactionPooler, sessionPooler)).toBe(sessionPooler);
  });
});

describe('describeDatabaseTarget', () => {
  it('kimlik bilgisi içermeyen hedef özeti üretir', () => {
    const description = describeDatabaseTarget(inspectDatabaseUrl(transactionPooler));
    expect(description).toBe('aws-0-eu-central-1.pooler.supabase.com:6543/postgres (transaction pooler)');
    expect(description).not.toContain('pw');
  });
});
