/**
 * TripRepository — skeleton, not yet wired to SQLite.
 *
 * The trips table and its migration will be added when the Trip UI phase
 * begins. Until then this class holds the method contracts so the rest of
 * the codebase can reference them without touching unimplemented code paths.
 *
 * Activation checklist (do not do this yet):
 *   1. Add CREATE TABLE trips … to src/db/client.ts _initSchema
 *   2. Add work_trip_id column migration to the expenses table
 *   3. Call initTripRepository(db) inside _layout.tsx after getDatabase()
 *   4. Wire a Zustand trip slice that calls these methods
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { WorkTrip } from '@/types/trip';

export class TripRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_db: SQLiteDatabase) {}

  /** Returns all non-deleted trips ordered by startDate descending. */
  async list(): Promise<WorkTrip[]> {
    throw new Error('TripRepository.list: not yet implemented');
  }

  /** Returns a single trip by id, or null if not found or soft-deleted. */
  async getById(_id: string): Promise<WorkTrip | null> {
    throw new Error('TripRepository.getById: not yet implemented');
  }

  /** Persists a new trip and returns it with generated id and timestamps. */
  async create(_data: Omit<WorkTrip, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkTrip> {
    throw new Error('TripRepository.create: not yet implemented');
  }

  /** Updates all mutable fields of a trip and returns it with a fresh updatedAt. */
  async update(_trip: WorkTrip): Promise<WorkTrip> {
    throw new Error('TripRepository.update: not yet implemented');
  }

  /** Sets deleted_at on the trip row — does not hard-delete. */
  async softDelete(_id: string): Promise<void> {
    throw new Error('TripRepository.softDelete: not yet implemented');
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
