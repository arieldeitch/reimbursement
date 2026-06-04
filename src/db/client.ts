import * as SQLite from 'expo-sqlite';

const DB_NAME = 'reimbursement.db';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _initSchema(_db);
  await _runMigrations(_db);
  return _db;
}

async function _runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)');
  if (!cols.some((c) => c.name === 'work_trip_id')) {
    await db.runAsync('ALTER TABLE expenses ADD COLUMN work_trip_id TEXT');
  }
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

    CREATE TABLE IF NOT EXISTS trips (
      id          TEXT PRIMARY KEY NOT NULL,
      name        TEXT NOT NULL,
      destination TEXT NOT NULL,
      client      TEXT,
      start_date  TEXT NOT NULL,
      end_date    TEXT NOT NULL,
      notes       TEXT,
      status      TEXT NOT NULL DEFAULT 'open',
      deleted_at  TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);
}
