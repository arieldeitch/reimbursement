import type { SQLiteDatabase } from 'expo-sqlite';

import type { WorkTrip, TripStatus } from '@/types/trip';

interface TripRow {
  id: string;
  name: string;
  destination: string;
  client: string | null;
  start_date: string;
  end_date: string;
  notes: string | null;
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToTrip(row: TripRow): WorkTrip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    client: row.client ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes ?? undefined,
    status: row.status as TripStatus,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export class TripRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<WorkTrip[]> {
    const rows = await this.db.getAllAsync<TripRow>(
      'SELECT * FROM trips WHERE deleted_at IS NULL ORDER BY start_date DESC, created_at DESC',
    );
    return rows.map(rowToTrip);
  }

  async getById(id: string): Promise<WorkTrip | null> {
    const row = await this.db.getFirstAsync<TripRow>(
      'SELECT * FROM trips WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return row ? rowToTrip(row) : null;
  }

  async create(data: Omit<WorkTrip, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkTrip> {
    const id = generateId();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO trips
         (id, name, destination, client, start_date, end_date, notes, status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.destination,
        data.client ?? null,
        data.startDate,
        data.endDate,
        data.notes ?? null,
        data.status,
        data.deletedAt ?? null,
        now,
        now,
      ],
    );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  async update(trip: WorkTrip): Promise<WorkTrip> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE trips SET
         name = ?, destination = ?, client = ?, start_date = ?, end_date = ?,
         notes = ?, status = ?, deleted_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        trip.name,
        trip.destination,
        trip.client ?? null,
        trip.startDate,
        trip.endDate,
        trip.notes ?? null,
        trip.status,
        trip.deletedAt ?? null,
        now,
        trip.id,
      ],
    );
    return { ...trip, updatedAt: now };
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      'UPDATE trips SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id],
    );
  }
}

let _instance: TripRepository | null = null;

export function initTripRepository(db: SQLiteDatabase): void {
  _instance = new TripRepository(db);
}

export function getTripRepository(): TripRepository {
  if (!_instance) throw new Error('TripRepository not initialized — call initTripRepository first');
  return _instance;
}
