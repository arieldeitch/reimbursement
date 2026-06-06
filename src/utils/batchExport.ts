import { Platform, Share } from 'react-native';

import type { ReimbursementBatch } from '@/types/batch';
import type { Expense } from '@/types/expense';
import type { WorkTrip } from '@/types/trip';
import { batchSummaryReportData } from '@/utils/reportData';

const CATEGORY_LABELS: Record<string, string> = {
  transportation: 'Transportation',
  food:           'Food',
  hotel:          'Hotel',
  parking:        'Parking',
  taxi:           'Taxi',
  flight:         'Flight',
  equipment:      'Equipment',
  other:          'Other',
};

const PAYMENT_LABELS: Record<string, string> = {
  personal_card: 'Personal Card',
  company_card:  'Company Card',
  cash:          'Cash',
  other:         'Other',
};

function cell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function row(...values: (string | number | null | undefined)[]): string {
  return values.map(cell).join(',');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildBatchCsv(
  batch: ReimbursementBatch,
  expenses: Expense[],
  trips: WorkTrip[],
): string {
  const report = batchSummaryReportData(batch, expenses, trips);
  const CRLF = '\r\n';
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  // Metadata block
  lines.push(row('Batch Name:', batch.name));
  lines.push(row('Status:', capitalize(batch.status)));
  if (batch.submittedAt) lines.push(row('Submitted:', batch.submittedAt.slice(0, 10)));
  if (batch.approvedAt)  lines.push(row('Approved:',  batch.approvedAt.slice(0, 10)));
  if (batch.paidAt)      lines.push(row('Paid:',      batch.paidAt.slice(0, 10)));
  lines.push(row('Exported:', today));
  lines.push('');

  // Column headers
  lines.push(row(
    'Date', 'Title', 'Category', 'Amount', 'Currency',
    'Payment Method', 'Status', 'Trip', 'Has Receipt', 'Missing Reason', 'Notes',
  ));

  // Expense rows sorted by date (batchSummaryReportData already sorts)
  for (const e of report.expenses.rows) {
    lines.push(row(
      e.date,
      e.title,
      CATEGORY_LABELS[e.category] ?? e.category,
      e.amount.toFixed(2),
      e.currency,
      PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod,
      capitalize(e.status),
      e.tripName ?? '',
      e.hasReceipt ? 'Yes' : 'No',
      e.receiptMissingReason ?? '',
      e.notes ?? '',
    ));
  }
  lines.push('');

  // Summary block
  lines.push(row('SUMMARY'));
  lines.push(row('Expense Count:',     report.expenses.total));
  lines.push(row('Receipts Present:',  report.expenses.withReceipt));
  lines.push(row('Receipts Missing:',  report.expenses.missingReceipt));
  lines.push(row('Unsubmitted:',       report.expenses.unsubmitted));
  lines.push('');

  // Currency breakdown — never aggregate across currencies
  const currencies = Object.keys(report.expenses.byCurrency);
  if (currencies.length > 0) {
    lines.push(row('CURRENCY TOTALS'));
    lines.push(row('Currency', 'Amount', 'Count'));
    for (const currency of currencies) {
      const { amount, count } = report.expenses.byCurrency[currency];
      lines.push(row(currency, amount.toFixed(2), count));
    }
  }

  // UTF-8 BOM so Excel recognises the encoding; CRLF line endings for Windows/Excel
  return '﻿' + lines.join(CRLF);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export async function exportBatchCsv(
  batch: ReimbursementBatch,
  expenses: Expense[],
  trips: WorkTrip[],
): Promise<void> {
  const csv = buildBatchCsv(batch, expenses, trips);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${sanitizeFilename(batch.name)}_${today}_batch.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ title: filename, message: csv });
  }
}
