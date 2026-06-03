import type { SQLiteDatabase } from 'expo-sqlite';

import type { Expense, ExpenseCategory, ExpenseStatus, PaymentMethod } from '@/types/expense';
import type { Repository } from './index';

interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  payment_method: string;
  status: string;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    category: row.category as ExpenseCategory,
    paymentMethod: row.payment_method as PaymentMethod,
    status: row.status as ExpenseStatus,
    notes: row.notes ?? undefined,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export class ExpenseRepository implements Repository<Expense> {
  constructor(private readonly db: SQLiteDatabase) {}

  async findAll(): Promise<Expense[]> {
    const rows = await this.db.getAllAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC',
    );
    return rows.map(rowToExpense);
  }

  async findById(id: string): Promise<Expense | null> {
    const row = await this.db.getFirstAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return row ? rowToExpense(row) : null;
  }

  getById(id: string): Promise<Expense | null> {
    return this.findById(id);
  }

  async update(expense: Expense): Promise<Expense> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE expenses SET
         title = ?, amount = ?, currency = ?, date = ?, category = ?,
         payment_method = ?, status = ?, notes = ?, deleted_at = ?,
         updated_at = ?
       WHERE id = ?`,
      [
        expense.title,
        expense.amount,
        expense.currency,
        expense.date,
        expense.category,
        expense.paymentMethod,
        expense.status,
        expense.notes ?? null,
        expense.deletedAt ?? null,
        now,
        expense.id,
      ],
    );
    return { ...expense, updatedAt: now };
  }

  softDelete(id: string): Promise<void> {
    return this.delete(id);
  }

  async save(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const id = generateId();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO expenses
         (id, title, amount, currency, date, category, payment_method,
          status, notes, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.amount,
        data.currency,
        data.date,
        data.category,
        data.paymentMethod,
        data.status,
        data.notes ?? null,
        data.deletedAt ?? null,
        now,
        now,
      ],
    );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      'UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id],
    );
  }
}

let _instance: ExpenseRepository | null = null;

export function initExpenseRepository(db: SQLiteDatabase): void {
  _instance = new ExpenseRepository(db);
}

export function getExpenseRepository(): ExpenseRepository {
  if (!_instance) throw new Error('ExpenseRepository not initialized — call initExpenseRepository first');
  return _instance;
}
