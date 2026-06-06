import { Platform, Share } from 'react-native';

import type { Expense } from '@/types/expense';
import type { WorkTrip } from '@/types/trip';

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

export function buildTripCsv(trip: WorkTrip, expenses: Expense[]): string {
  const CRLF = '\r\n';
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  // Metadata block
  lines.push(row('Trip Name:', trip.name));
  lines.push(row('Destination:', trip.destination));
  lines.push(row('Date Range:', `${trip.startDate} to ${trip.endDate}`));
  if (trip.client) lines.push(row('Client:', trip.client));
  lines.push(row('Exported:', today));
  lines.push('');

  // Column headers
  lines.push(row('Date', 'Title', 'Category', 'Amount', 'Currency', 'Payment Method', 'Status', 'Has Receipt', 'Missing Reason', 'Notes'));

  // One row per expense, sorted by date
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    lines.push(row(
      e.date,
      e.title,
      CATEGORY_LABELS[e.category] ?? e.category,
      e.amount.toFixed(2),
      e.currency,
      PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod,
      capitalize(e.status),
      e.hasReceipt ? 'Yes' : 'No',
      e.receiptMissingReason ?? '',
      e.notes ?? '',
    ));
  }

  lines.push('');

  // Summary block (no cross-currency total — see CURRENCY TOTALS below)
  const withReceipt = expenses.filter((e) => e.hasReceipt).length;
  lines.push(row('SUMMARY'));
  lines.push(row('Expense Count:', expenses.length));
  lines.push(row('Receipts Present:', withReceipt));
  lines.push(row('Receipts Missing:', expenses.length - withReceipt));
  lines.push('');

  // Currency breakdown
  const byCurrency: Record<string, { amount: number; count: number }> = {};
  for (const e of expenses) {
    const prev = byCurrency[e.currency];
    if (prev) {
      prev.amount += e.amount;
      prev.count  += 1;
    } else {
      byCurrency[e.currency] = { amount: e.amount, count: 1 };
    }
  }
  const currencies = Object.keys(byCurrency);
  if (currencies.length > 0) {
    lines.push(row('CURRENCY TOTALS'));
    lines.push(row('Currency', 'Amount', 'Count'));
    for (const currency of currencies) {
      const { amount, count } = byCurrency[currency];
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

export async function exportTripCsv(trip: WorkTrip, expenses: Expense[]): Promise<void> {
  const csv = buildTripCsv(trip, expenses);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${sanitizeFilename(trip.name)}_${today}.csv`;

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
    // Native: share the CSV text via the OS share sheet (Files, email, AirDrop, etc.)
    await Share.share({ title: filename, message: csv });
  }
}
