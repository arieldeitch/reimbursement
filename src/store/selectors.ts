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
