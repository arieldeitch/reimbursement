import type { Expense, ExpenseStatus } from '@/types/expense';

// ─── Currency-safe types ───────────────────────────────────────────────────

/** Maps ISO currency code → total amount.  Never sum across keys. */
export type CurrencyMap = Record<string, number>;

// ─── Currency-aware aggregation ───────────────────────────────────────────

export function totalsByCurrency(expenses: Expense[]): CurrencyMap {
  const map: CurrencyMap = {};
  for (const e of expenses) {
    map[e.currency] = (map[e.currency] ?? 0) + e.amount;
  }
  return map;
}

export function totalsByCurrencyAndStatus(
  expenses: Expense[],
  status: ExpenseStatus,
): CurrencyMap {
  return totalsByCurrency(expenses.filter((e) => e.status === status));
}

// ─── Count selectors (currency-safe — counts are unit-less) ───────────────

function countByStatus(expenses: Expense[], status: ExpenseStatus): number {
  return expenses.filter((e) => e.status === status).length;
}

export const expenseSelectors = {
  countUnsubmitted: (expenses: Expense[]) => countByStatus(expenses, 'unsubmitted'),
  countSubmitted:   (expenses: Expense[]) => countByStatus(expenses, 'submitted'),
  countApproved:    (expenses: Expense[]) => countByStatus(expenses, 'approved'),
  countPaid:        (expenses: Expense[]) => countByStatus(expenses, 'paid'),
  countByStatus,
};

// ─── Readiness (counts only — currency-safe) ─────────────────────────────

export interface TripReadiness {
  total: number;
  withReceipt: number;
  missingReceipt: number;
  submitted: number;
  approved: number;
  paid: number;
}

export function tripReadiness(expenses: Expense[], tripId: string): TripReadiness {
  const trip = expenses.filter((e) => e.workTripId === tripId);
  return {
    total:          trip.length,
    withReceipt:    trip.filter((e) =>  e.hasReceipt).length,
    missingReceipt: trip.filter((e) => !e.hasReceipt).length,
    submitted:      trip.filter((e) => e.status === 'submitted').length,
    approved:       trip.filter((e) => e.status === 'approved').length,
    paid:           trip.filter((e) => e.status === 'paid').length,
  };
}

export interface BatchReadiness {
  total: number;
  withReceipt: number;
  missingReceipt: number;
  unsubmitted: number;
}

export function batchReadiness(expenses: Expense[], batchId: string): BatchReadiness {
  const batch = expenses.filter((e) => e.reimbursementBatchId === batchId);
  return {
    total:          batch.length,
    withReceipt:    batch.filter((e) =>  e.hasReceipt).length,
    missingReceipt: batch.filter((e) => !e.hasReceipt).length,
    unsubmitted:    batch.filter((e) => e.status === 'unsubmitted').length,
  };
}
