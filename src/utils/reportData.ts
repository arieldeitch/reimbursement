import type { Expense, ExpenseCategory, ExpenseStatus } from '@/types/expense';
import type { ReimbursementBatch } from '@/types/batch';
import type { WorkTrip } from '@/types/trip';

export interface TripSummaryReport {
  trip: {
    id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    client?: string;
    status: string;
  };
  generatedAt: string;
  expenses: {
    total: number;
    totalAmount: number;
    withReceipt: number;
    missingReceipt: number;
    byStatus: Partial<Record<ExpenseStatus, { count: number; amount: number }>>;
    byCurrency: Record<string, { count: number; amount: number }>;
    byCategory: Partial<Record<ExpenseCategory, { count: number; amount: number }>>;
    rows: Expense[];
  };
}

export function tripSummaryReportData(trip: WorkTrip, expenses: Expense[]): TripSummaryReport {
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  const byStatus: TripSummaryReport['expenses']['byStatus'] = {};
  const byCurrency: TripSummaryReport['expenses']['byCurrency'] = {};
  const byCategory: TripSummaryReport['expenses']['byCategory'] = {};
  let totalAmount = 0;
  let withReceipt = 0;

  for (const e of sorted) {
    totalAmount += e.amount;
    if (e.hasReceipt) withReceipt++;

    const prevStatus = byStatus[e.status] ?? { count: 0, amount: 0 };
    byStatus[e.status] = { count: prevStatus.count + 1, amount: prevStatus.amount + e.amount };

    const prevCurrency = byCurrency[e.currency] ?? { count: 0, amount: 0 };
    byCurrency[e.currency] = { count: prevCurrency.count + 1, amount: prevCurrency.amount + e.amount };

    const prevCategory = byCategory[e.category] ?? { count: 0, amount: 0 };
    byCategory[e.category] = { count: prevCategory.count + 1, amount: prevCategory.amount + e.amount };
  }

  return {
    trip: {
      id:          trip.id,
      name:        trip.name,
      destination: trip.destination,
      startDate:   trip.startDate,
      endDate:     trip.endDate,
      client:      trip.client,
      status:      trip.status,
    },
    generatedAt: new Date().toISOString(),
    expenses: {
      total:          sorted.length,
      totalAmount,
      withReceipt,
      missingReceipt: sorted.length - withReceipt,
      byStatus,
      byCurrency,
      byCategory,
      rows: sorted,
    },
  };
}

export interface BatchSummaryReport {
  batch: {
    id: string;
    name: string;
    status: string;
    submittedAt: string | null;
    approvedAt: string | null;
    paidAt: string | null;
  };
  generatedAt: string;
  expenses: {
    total: number;
    totalAmount: number;
    withReceipt: number;
    missingReceipt: number;
    unsubmitted: number;
    byCurrency: Record<string, { count: number; amount: number }>;
    rows: Array<Expense & { tripName?: string }>;
  };
}

export function batchSummaryReportData(
  batch: ReimbursementBatch,
  expenses: Expense[],
  trips: WorkTrip[],
): BatchSummaryReport {
  const tripMap = new Map(trips.map((t) => [t.id, t.name]));
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  const byCurrency: BatchSummaryReport['expenses']['byCurrency'] = {};
  let totalAmount = 0;
  let withReceipt = 0;
  let unsubmitted = 0;

  for (const e of sorted) {
    totalAmount += e.amount;
    if (e.hasReceipt) withReceipt++;
    if (e.status === 'unsubmitted') unsubmitted++;

    const prev = byCurrency[e.currency] ?? { count: 0, amount: 0 };
    byCurrency[e.currency] = { count: prev.count + 1, amount: prev.amount + e.amount };
  }

  const rows = sorted.map((e) => ({
    ...e,
    tripName: e.workTripId ? tripMap.get(e.workTripId) : undefined,
  }));

  return {
    batch: {
      id:          batch.id,
      name:        batch.name,
      status:      batch.status,
      submittedAt: batch.submittedAt,
      approvedAt:  batch.approvedAt,
      paidAt:      batch.paidAt,
    },
    generatedAt: new Date().toISOString(),
    expenses: {
      total:          sorted.length,
      totalAmount,
      withReceipt,
      missingReceipt: sorted.length - withReceipt,
      unsubmitted,
      byCurrency,
      rows,
    },
  };
}
