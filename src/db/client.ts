import * as SQLite from 'expo-sqlite';

const DB_NAME = 'reimbursement.db';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _initSchema(_db);
  return _db;
}

async function _initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS expenses (
      id            TEXT PRIMARY KEY NOT NULL,
      title         TEXT NOT NULL,
      amount        REAL NOT NULL,
      currency      TEXT NOT NULL DEFAULT 'USD',
      date          TEXT NOT NULL,
      category      TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'unsubmitted',
      notes         TEXT,
      deleted_at    TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );
  `);
}
