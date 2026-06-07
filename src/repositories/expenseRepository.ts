import type { SQLiteDatabase } from 'expo-sqlite';

import type { Expense, ExpenseCategory, ExpenseStatus, PaymentMethod, ReimbursementRelevance } from '@/types/expense';
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
  has_receipt: number;
  receipt_missing_reason: string | null;
  deleted_at: string | null;
  work_trip_id: string | null;
  reimbursement_batch_id: string | null;
  created_at: string;
  updated_at: string;
  original_amount: number | null;
  original_currency: string | null;
  charged_amount: number | null;
  charged_currency: string | null;
  effective_rate: number | null;
  is_installment: number;
  installment_index: number | null;
  installment_total: number | null;
  reimbursement_relevance: string | null;
  is_reviewed: number;
  source_card: string | null;
  billing_month: string | null;
  import_batch_id: string | null;
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
    hasReceipt: row.has_receipt === 1,
    receiptMissingReason: row.receipt_missing_reason ?? undefined,
    deletedAt: row.deleted_at,
    workTripId: row.work_trip_id ?? undefined,
    reimbursementBatchId: row.reimbursement_batch_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    originalAmount: row.original_amount ?? undefined,
    originalCurrency: row.original_currency ?? undefined,
    chargedAmount: row.charged_amount ?? undefined,
    chargedCurrency: row.charged_currency ?? undefined,
    effectiveRate: row.effective_rate ?? undefined,
    isInstallment: row.is_installment === 1 ? true : undefined,
    installmentIndex: row.installment_index ?? undefined,
    installmentTotal: row.installment_total ?? undefined,
    reimbursementRelevance: (row.reimbursement_relevance as ReimbursementRelevance | null) ?? undefined,
    isReviewed: row.is_reviewed === 1 ? true : undefined,
    sourceCard: row.source_card ?? undefined,
    billingMonth: row.billing_month ?? undefined,
    importBatchId: row.import_batch_id ?? undefined,
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
         payment_method = ?, status = ?, notes = ?,
         has_receipt = ?, receipt_missing_reason = ?,
         deleted_at = ?, work_trip_id = ?, reimbursement_batch_id = ?,
         original_amount = ?, original_currency = ?, charged_amount = ?,
         charged_currency = ?, effective_rate = ?, is_installment = ?,
         installment_index = ?, installment_total = ?,
         reimbursement_relevance = ?, is_reviewed = ?,
         source_card = ?, billing_month = ?, import_batch_id = ?,
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
        expense.hasReceipt ? 1 : 0,
        expense.receiptMissingReason ?? null,
        expense.deletedAt ?? null,
        expense.workTripId ?? null,
        expense.reimbursementBatchId ?? null,
        expense.originalAmount ?? null,
        expense.originalCurrency ?? null,
        expense.chargedAmount ?? null,
        expense.chargedCurrency ?? null,
        expense.effectiveRate ?? null,
        expense.isInstallment ? 1 : 0,
        expense.installmentIndex ?? null,
        expense.installmentTotal ?? null,
        expense.reimbursementRelevance ?? null,
        expense.isReviewed ? 1 : 0,
        expense.sourceCard ?? null,
        expense.billingMonth ?? null,
        expense.importBatchId ?? null,
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
          status, notes, has_receipt, receipt_missing_reason,
          deleted_at, work_trip_id, reimbursement_batch_id,
          original_amount, original_currency, charged_amount, charged_currency,
          effective_rate, is_installment, installment_index, installment_total,
          reimbursement_relevance, is_reviewed, source_card, billing_month, import_batch_id,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        data.hasReceipt ? 1 : 0,
        data.receiptMissingReason ?? null,
        data.deletedAt ?? null,
        data.workTripId ?? null,
        data.reimbursementBatchId ?? null,
        data.originalAmount ?? null,
        data.originalCurrency ?? null,
        data.chargedAmount ?? null,
        data.chargedCurrency ?? null,
        data.effectiveRate ?? null,
        data.isInstallment ? 1 : 0,
        data.installmentIndex ?? null,
        data.installmentTotal ?? null,
        data.reimbursementRelevance ?? null,
        data.isReviewed ? 1 : 0,
        data.sourceCard ?? null,
        data.billingMonth ?? null,
        data.importBatchId ?? null,
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

  async findByTripId(tripId: string): Promise<Expense[]> {
    const rows = await this.db.getAllAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE work_trip_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC',
      [tripId],
    );
    return rows.map(rowToExpense);
  }

  async findByBatchId(batchId: string): Promise<Expense[]> {
    const rows = await this.db.getAllAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE reimbursement_batch_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC',
      [batchId],
    );
    return rows.map(rowToExpense);
  }

  async findUnbatched(): Promise<Expense[]> {
    const rows = await this.db.getAllAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE reimbursement_batch_id IS NULL AND deleted_at IS NULL ORDER BY date DESC, created_at DESC',
    );
    return rows.map(rowToExpense);
  }

  async assignToTrip(expenseId: string, tripId: string | null): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      'UPDATE expenses SET work_trip_id = ?, updated_at = ? WHERE id = ?',
      [tripId, now, expenseId],
    );
  }

  async setReviewed(expenseId: string, isReviewed: boolean): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      'UPDATE expenses SET is_reviewed = ?, updated_at = ? WHERE id = ?',
      [isReviewed ? 1 : 0, now, expenseId],
    );
  }

  async setRelevance(expenseId: string, relevance: ReimbursementRelevance | null): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      'UPDATE expenses SET reimbursement_relevance = ?, updated_at = ? WHERE id = ?',
      [relevance, now, expenseId],
    );
  }

  async assignToBatch(expenseId: string, batchId: string | null): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      'UPDATE expenses SET reimbursement_batch_id = ?, updated_at = ? WHERE id = ?',
      [batchId, now, expenseId],
    );
  }

  async getSummaryByTripId(tripId: string): Promise<{ count: number; total: number }> {
    const row = await this.db.getFirstAsync<{ cnt: number; total: number }>(
      'SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total FROM expenses WHERE work_trip_id = ? AND deleted_at IS NULL',
      [tripId],
    );
    return { count: row?.cnt ?? 0, total: row?.total ?? 0 };
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
