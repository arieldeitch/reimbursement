import { create } from 'zustand';

import { getExpenseRepository } from '@/repositories/expenseRepository';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types/expense';

export interface AddExpenseInput {
  title: string;
  amount: number;
  currency: string;
  date: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  notes?: string;
  workTripId?: string;
  hasReceipt?: boolean;
}

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  loadExpenses: () => Promise<void>;
  addExpense: (input: AddExpenseInput) => Promise<void>;
  getExpenseById: (id: string) => Promise<Expense | null>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  assignExpenseToBatch: (expenseId: string, batchId: string | null) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoading: false,

  loadExpenses: async () => {
    set({ isLoading: true });
    try {
      const expenses = await getExpenseRepository().findAll();
      set({ expenses, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  addExpense: async (input) => {
    const expense = await getExpenseRepository().save({
      ...input,
      status: 'unsubmitted',
      hasReceipt: input.hasReceipt ?? false,
      deletedAt: null,
    });
    set((state) => ({ expenses: [expense, ...state.expenses] }));
  },

  getExpenseById: async (id) => {
    const cached = get().expenses.find((e) => e.id === id) ?? null;
    if (cached) return cached;
    return getExpenseRepository().getById(id);
  },

  updateExpense: async (expense) => {
    const updated = await getExpenseRepository().update(expense);
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === updated.id ? updated : e)),
    }));
  },

  deleteExpense: async (id) => {
    await getExpenseRepository().softDelete(id);
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    }));
  },

  assignExpenseToBatch: async (expenseId, batchId) => {
    await getExpenseRepository().assignToBatch(expenseId, batchId);
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? { ...e, reimbursementBatchId: batchId ?? undefined }
          : e,
      ),
    }));
  },
}));
