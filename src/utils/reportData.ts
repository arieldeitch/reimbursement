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
    /** Per-currency totals. Never aggregate across currencies. */
    byCurrency: Record<string, { count: number; amount: number }>;
    withReceipt: number;
    missingReceipt: number;
    byStatus: Partial<Record<ExpenseStatus, { count: number; byCurrency: Record<string, number> }>>;
    byCategory: Partial<Record<ExpenseCategory, { count: number; byCurrency: Record<string, number> }>>;
    rows: Expense[];
  };
}

export function tripSummaryReportData(trip: WorkTrip, expenses: Expense[]): TripSummaryReport {
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  const byStatus: TripSummaryReport['expenses']['byStatus'] = {};
  const byCurrency: TripSummaryReport['expenses']['byCurrency'] = {};
  const byCategory: TripSummaryReport['expenses']['byCategory'] = {};
  let withReceipt = 0;

  for (const e of sorted) {
    if (e.hasReceipt) withReceipt++;

    // byStatus: group amounts by currency within each status
    const prevStatus = byStatus[e.status] ?? { count: 0, byCurrency: {} };
    byStatus[e.status] = {
      count: prevStatus.count + 1,
      byCurrency: { ...prevStatus.byCurrency, [e.currency]: (prevStatus.byCurrency[e.currency] ?? 0) + e.amount },
    };

    // byCurrency: top-level per-currency totals (the authoritative total view)
    const prevCurrency = byCurrency[e.currency] ?? { count: 0, amount: 0 };
    byCurrency[e.currency] = { count: prevCurrency.count + 1, amount: prevCurrency.amount + e.amount };

    // byCategory: group amounts by currency within each category
    const prevCategory = byCategory[e.category] ?? { count: 0, byCurrency: {} };
    byCategory[e.category] = {
      count: prevCategory.count + 1,
      byCurrency: { ...prevCategory.byCurrency, [e.currency]: (prevCategory.byCurrency[e.currency] ?? 0) + e.amount },
    };
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
      byCurrency,
      withReceipt,
      missingReceipt: sorted.length - withReceipt,
      byStatus,
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
    /** Per-currency totals. Never aggregate across currencies. */
    byCurrency: Record<string, { count: number; amount: number }>;
    withReceipt: number;
    missingReceipt: number;
    unsubmitted: number;
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
  let withReceipt = 0;
  let unsubmitted = 0;

  for (const e of sorted) {
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
      byCurrency,
      withReceipt,
      missingReceipt: sorted.length - withReceipt,
      unsubmitted,
      rows,
    },
  };
}
