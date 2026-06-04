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
  const expCols  = new Set(
    (await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)')).map((c) => c.name),
  );
  if (!expCols.has('work_trip_id')) {
    await db.runAsync('ALTER TABLE expenses ADD COLUMN work_trip_id TEXT');
  }
  if (!expCols.has('reimbursement_batch_id')) {
    await db.runAsync('ALTER TABLE expenses ADD COLUMN reimbursement_batch_id TEXT');
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

    CREATE TABLE IF NOT EXISTS reimbursement_batches (
      id           TEXT PRIMARY KEY NOT NULL,
      name         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'draft',
      submitted_at TEXT,
      approved_at  TEXT,
      paid_at      TEXT,
      notes        TEXT,
      deleted_at   TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
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
