import { create } from 'zustand';

import { getBatchRepository } from '@/repositories/batchRepository';
import type { BatchStatus, ReimbursementBatch } from '@/types/batch';

export interface AddBatchInput {
  name: string;
  notes?: string;
  status: BatchStatus;
}

interface BatchState {
  batches: ReimbursementBatch[];
  isLoading: boolean;
  loadBatches: () => Promise<void>;
  addBatch: (input: AddBatchInput) => Promise<void>;
  getBatchById: (id: string) => Promise<ReimbursementBatch | null>;
  updateBatch: (batch: ReimbursementBatch) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: [],
  isLoading: false,

  loadBatches: async () => {
    set({ isLoading: true });
    try {
      const batches = await getBatchRepository().list();
      set({ batches, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  addBatch: async (input) => {
    const batch = await getBatchRepository().create({
      ...input,
      submittedAt: null,
      approvedAt: null,
      paidAt: null,
      deletedAt: null,
    });
    set((state) => ({ batches: [batch, ...state.batches] }));
  },

  getBatchById: async (id) => {
    const cached = get().batches.find((b) => b.id === id) ?? null;
    if (cached) return cached;
    return getBatchRepository().getById(id);
  },

  updateBatch: async (batch) => {
    const updated = await getBatchRepository().update(batch);
    set((state) => ({
      batches: state.batches.map((b) => (b.id === updated.id ? updated : b)),
    }));
  },

  deleteBatch: async (id) => {
    await getBatchRepository().softDelete(id);
    set((state) => ({
      batches: state.batches.filter((b) => b.id !== id),
    }));
  },
}));
