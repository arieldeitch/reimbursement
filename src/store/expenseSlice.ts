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
}

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  loadExpenses: () => Promise<void>;
  addExpense: (input: AddExpenseInput) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
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
      deletedAt: null,
    });
    set((state) => ({ expenses: [expense, ...state.expenses] }));
  },
}));
