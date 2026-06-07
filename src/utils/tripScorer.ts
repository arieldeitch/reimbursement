import type { WorkTrip } from '@/types/trip';

import type { ParsedRow } from './csvParser';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecommendationScore = 'VERY_LIKELY' | 'LIKELY' | 'REVIEW' | 'IGNORE';

export interface ScoredRow {
  rowIndex: number;
  score: RecommendationScore;
  points: number;
  reasons: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRAVEL_CATEGORIES = new Set(['hotel', 'flight', 'transportation', 'taxi']);

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function scoreRowForTrip(row: ParsedRow, rowIndex: number, trip: WorkTrip): ScoredRow {
  if (!row.isValid || !row.date) {
    return { rowIndex, score: 'IGNORE', points: 0, reasons: [] };
  }

  let points = 0;
  const reasons: string[] = [];

  // Date overlap: within trip date range (+4), within 2 days (+2)
  if (isInRange(row.date, trip.startDate, trip.endDate)) {
    points += 4;
    reasons.push('Date within trip');
  } else if (
    isInRange(row.date, addDays(trip.startDate, -2), addDays(trip.endDate, 2))
  ) {
    points += 2;
    reasons.push('Date near trip (±2 days)');
  }

  // Foreign currency: original transaction was in a non-ILS currency (+3), or expense itself (+2)
  const origCcy = row.originalCurrency;
  const mainCcy = row.currency;
  if (origCcy && origCcy !== 'ILS') {
    points += 3;
    reasons.push(`Foreign currency (${origCcy})`);
  } else if (mainCcy !== 'ILS') {
    points += 2;
    reasons.push(`Non-ILS currency (${mainCcy})`);
  }

  // Travel category: hotel, flight, transportation, taxi (+2)
  if (TRAVEL_CATEGORIES.has(row.category)) {
    points += 2;
    reasons.push(`Travel category (${row.category})`);
  }

  // Destination keyword match in merchant name (+3)
  const searchText = (row.merchantName ?? row.title ?? '').toLowerCase();
  if (trip.destination && searchText) {
    const destWords = trip.destination
      .toLowerCase()
      .split(/[\s,/\-]+/)
      .filter((w) => w.length > 2);
    const matched = destWords.find((w) => searchText.includes(w));
    if (matched) {
      points += 3;
      reasons.push(`Destination keyword "${matched}"`);
    }
  }

  let score: RecommendationScore;
  if (points >= 6) score = 'VERY_LIKELY';
  else if (points >= 3) score = 'LIKELY';
  else if (points >= 1) score = 'REVIEW';
  else score = 'IGNORE';

  return { rowIndex, score, points, reasons };
}

export function scoreRowsForTrip(rows: ParsedRow[], trip: WorkTrip): ScoredRow[] {
  return rows.map((row, i) => scoreRowForTrip(row, i, trip));
}
