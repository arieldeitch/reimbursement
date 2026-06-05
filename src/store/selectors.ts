import type { Expense, ExpenseStatus } from '@/types/expense';

function sumByStatus(expenses: Expense[], status: ExpenseStatus): number {
  return expenses
    .filter((e) => e.status === status)
    .reduce((sum, e) => sum + e.amount, 0);
}

function countByStatus(expenses: Expense[], status: ExpenseStatus): number {
  return expenses.filter((e) => e.status === status).length;
}

export const expenseSelectors = {
  totalUnsubmitted: (expenses: Expense[]) => sumByStatus(expenses, 'unsubmitted'),
  totalSubmitted:   (expenses: Expense[]) => sumByStatus(expenses, 'submitted'),
  totalApproved:    (expenses: Expense[]) => sumByStatus(expenses, 'approved'),
  totalPaid:        (expenses: Expense[]) => sumByStatus(expenses, 'paid'),

  countUnsubmitted: (expenses: Expense[]) => countByStatus(expenses, 'unsubmitted'),
  countSubmitted:   (expenses: Expense[]) => countByStatus(expenses, 'submitted'),
  countApproved:    (expenses: Expense[]) => countByStatus(expenses, 'approved'),
  countPaid:        (expenses: Expense[]) => countByStatus(expenses, 'paid'),

  totalByStatus: sumByStatus,
  countByStatus,
};

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
