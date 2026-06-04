import type { Entity } from './entity';

export type BatchStatus = 'draft' | 'submitted' | 'approved' | 'paid';

export interface ReimbursementBatch extends Entity {
  name: string;
  status: BatchStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes?: string;
  deletedAt: string | null;
}
