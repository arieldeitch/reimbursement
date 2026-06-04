import type { SQLiteDatabase } from 'expo-sqlite';

import type { BatchStatus, ReimbursementBatch } from '@/types/batch';

interface BatchRow {
  id: string;
  name: string;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToBatch(row: BatchRow): ReimbursementBatch {
  return {
    id: row.id,
    name: row.name,
    status: row.status as BatchStatus,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    notes: row.notes ?? undefined,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export class ReimbursementBatchRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<ReimbursementBatch[]> {
    const rows = await this.db.getAllAsync<BatchRow>(
      'SELECT * FROM reimbursement_batches WHERE deleted_at IS NULL ORDER BY created_at DESC',
    );
    return rows.map(rowToBatch);
  }

  async getById(id: string): Promise<ReimbursementBatch | null> {
    const row = await this.db.getFirstAsync<BatchRow>(
      'SELECT * FROM reimbursement_batches WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return row ? rowToBatch(row) : null;
  }

  async create(data: Omit<ReimbursementBatch, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReimbursementBatch> {
    const id = generateId();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO reimbursement_batches
         (id, name, status, submitted_at, approved_at, paid_at, notes, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.status,
        data.submittedAt,
        data.approvedAt,
        data.paidAt,
        data.notes ?? null,
        data.deletedAt,
        now,
        now,
      ],
    );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  async update(batch: ReimbursementBatch): Promise<ReimbursementBatch> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE reimbursement_batches SET
         name = ?, status = ?, submitted_at = ?, approved_at = ?, paid_at = ?,
         notes = ?, deleted_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        batch.name,
        batch.status,
        batch.submittedAt,
        batch.approvedAt,
        batch.paidAt,
        batch.notes ?? null,
        batch.deletedAt,
        now,
        batch.id,
      ],
    );
    return { ...batch, updatedAt: now };
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      'UPDATE reimbursement_batches SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id],
    );
  }
}

let _instance: ReimbursementBatchRepository | null = null;

export function initBatchRepository(db: SQLiteDatabase): void {
  _instance = new ReimbursementBatchRepository(db);
}

export function getBatchRepository(): ReimbursementBatchRepository {
  if (!_instance) throw new Error('ReimbursementBatchRepository not initialized — call initBatchRepository first');
  return _instance;
}
