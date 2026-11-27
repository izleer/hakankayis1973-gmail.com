import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, SCHEMA_VERSION, seedSql } from './schema';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('izleer.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current < SCHEMA_VERSION) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_SQL);
      await db.execAsync(seedSql());
    });
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate();
  }
  return databasePromise;
}

/** Yedekten geri yükleme sonrası bağlantıyı tazelemek için. */
export function forgetDatabase(): void {
  databasePromise = null;
}

export async function databaseFileUri(): Promise<string> {
  const db = await getDatabase();
  return db.databasePath.startsWith('file://') ? db.databasePath : `file://${db.databasePath}`;
}

export async function databaseSchemaVersion(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}
