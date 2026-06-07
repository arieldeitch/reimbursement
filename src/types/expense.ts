import type { Entity } from './entity';

export type ExpenseStatus = 'unsubmitted' | 'submitted' | 'approved' | 'paid' | 'rejected';

export type ExpenseCategory =
  | 'transportation'
  | 'food'
  | 'hotel'
  | 'parking'
  | 'taxi'
  | 'flight'
  | 'equipment'
  | 'other';

export type PaymentMethod = 'personal_card' | 'company_card' | 'cash' | 'other';

export interface Expense extends Entity {
  title: string;
  amount: number;
  currency: string;
  date: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  notes?: string;
  hasReceipt: boolean;
  receiptMissingReason?: string;
  deletedAt: string | null;
  workTripId?: string;
  reimbursementBatchId?: string;
  // Multi-currency fields (populated on import from dual-amount bank exports)
  originalAmount?: number;
  originalCurrency?: string;
  chargedAmount?: number;
  chargedCurrency?: string;
  effectiveRate?: number;
  // Installment fields (populated when bank notes contain "תשלום X מתוך Y")
  isInstallment?: boolean;
  installmentIndex?: number;
  installmentTotal?: number;
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'transportation', label: 'Transport' },
  { value: 'food', label: 'Food' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'parking', label: 'Parking' },
  { value: 'taxi', label: 'Taxi' },
  { value: 'flight', label: 'Flight' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'personal_card', label: 'Personal Card' },
  { value: 'company_card', label: 'Company Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];
