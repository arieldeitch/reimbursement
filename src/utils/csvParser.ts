import * as XLSX from 'xlsx';

import type { ExpenseCategory } from '@/types/expense';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedRow {
  raw: string[];
  date: string | null;
  title: string | null;
  amount: number | null;
  currency: string;
  category: ExpenseCategory;
  notes: string;
  isValid: boolean;
  error: string;
}

export interface ParseDiagnostics {
  sheetName: string;
  headerRowIndex: number; // 1-based for display
  columns: Record<string, string>; // field → matched header name
  rowCount: number;
  encodingNote: string;
}

export interface ParseSuccess {
  ok: true;
  headers: string[];
  colMap: Record<string, number>;
  rows: ParsedRow[];
  diagnostics: ParseDiagnostics;
  sheetNames: string[];
}

export interface ParseFallback {
  ok: false;
  reason: string;
  sheetNames: string[];
  sheetPreviews: Array<{ name: string; rows: string[][] }>;
}

export type ParseResult = ParseSuccess | ParseFallback;

export interface ParseOptions {
  sheetIndex?: number;
  headerRowOverride?: number; // 0-based
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

function decodeBuffer(buffer: ArrayBuffer): { text: string; encodingNote: string } {
  const bytes = new Uint8Array(buffer);

  // UTF-8 BOM
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(buffer), encodingNote: 'UTF-8 (BOM)' };
  }

  // Try UTF-8
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const replacements = (utf8.match(/�/g) ?? []).length;
  if (replacements === 0) {
    return { text: utf8, encodingNote: 'UTF-8' };
  }

  // Fall back to Windows-1255 (Hebrew Windows encoding)
  try {
    const win1255 = new TextDecoder('windows-1255', { fatal: false }).decode(buffer);
    return { text: win1255, encodingNote: 'Windows-1255 (Hebrew)' };
  } catch {
    return { text: utf8, encodingNote: 'UTF-8 (fallback)' };
  }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsvToRows(text: string): string[][] {
  // Character-by-character parser — handles multi-line quoted fields correctly.
  // Embedded newlines inside quotes become spaces (normalises "תאריך\nעסקה" → "תאריך עסקה").
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      row.push(field.trim()); field = '';
    } else if (ch === '\n' && !inQuotes) {
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = []; field = '';
    } else if (ch === '\n' && inQuotes) {
      field += ' '; // flatten embedded newline
    } else {
      field += ch;
    }
  }
  // Final field / row
  if (field.trim() || row.length > 0) {
    row.push(field.trim());
    if (row.some((c) => c !== '')) rows.push(row);
  }
  return rows;
}

// ─── Header scoring ───────────────────────────────────────────────────────────

// Normalize a cell: collapse whitespace, lower-case, strip newlines
function normCell(s: string): string {
  return s.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

const HEADER_KEYWORDS: Array<[string, number]> = [
  // Hebrew — date
  ['תאריך עסקה', 5], ['תאריך', 3],
  // Hebrew — title
  ['שם בית עסק', 5], ['שם בית העסק', 5], ['שם עסק', 4], ['שם העסק', 3],
  ['תיאור עסקה', 4], ['פירוט', 3],
  // Hebrew — amount
  ['סכום עסקה', 4], ['סכום חיוב', 4], ['סכום', 3],
  // Hebrew — currency
  ['מטבע חיוב', 4], ['מטבע עסקה מקורי', 3], ['מטבע', 3],
  // Hebrew — category
  ['קטגוריה', 3], ['ענף', 2],
  // Hebrew — notes
  ['הערות', 2], ['הערה', 2],
  // English — date
  ['transaction date', 4], ['date', 3], ['posting date', 3], ['value date', 2],
  // English — title
  ['description', 3], ['merchant', 3], ['payee', 3], ['name', 2], ['memo', 2], ['details', 2],
  // English — amount
  ['amount', 3], ['charge', 3], ['debit', 3], ['credit', 3], ['sum', 2],
  // English — currency
  ['currency', 3], ['ccy', 2],
  // English — category
  ['category', 3], ['type', 1],
  // English — notes
  ['notes', 2], ['note', 2], ['reference', 2],
];

function scoreHeaderRow(cells: string[]): number {
  let score = 0;
  const normalized = cells.map(normCell);
  for (const [kw, points] of HEADER_KEYWORDS) {
    if (normalized.some((c) => c === kw || c.includes(kw))) {
      score += points;
    }
  }
  return score;
}

const MIN_HEADER_SCORE = 6;
const MAX_SCAN_ROWS = 30;

function detectHeaderRow(rows: string[][]): number | null {
  let bestScore = 0;
  let bestIndex: number | null = null;
  const limit = Math.min(rows.length, MAX_SCAN_ROWS);
  for (let i = 0; i < limit; i++) {
    const score = scoreHeaderRow(rows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestScore >= MIN_HEADER_SCORE ? bestIndex : null;
}

// ─── Column detection ─────────────────────────────────────────────────────────

const COL_ALIASES: Record<string, string[]> = {
  date: [
    'תאריך עסקה', 'תאריך', 'date', 'transaction date', 'trans date',
    'posting date', 'value date',
  ],
  title: [
    'שם בית עסק', 'שם בית העסק', 'שם עסק', 'שם העסק',
    'תיאור עסקה', 'פירוט',
    'title', 'description', 'desc', 'memo', 'narrative', 'payee', 'name',
    'merchant', 'details',
  ],
  amount: [
    'סכום עסקה', 'סכום חיוב', 'סכום',
    'amount', 'debit', 'credit', 'charge', 'sum', 'total', 'value',
  ],
  currency: [
    'מטבע חיוב', 'מטבע עסקה מקורי', 'מטבע',
    'currency', 'ccy', 'curr',
  ],
  category: ['קטגוריה', 'ענף', 'category', 'type', 'tag'],
  notes: ['הערות', 'הערה', 'notes', 'note', 'comment', 'reference', 'ref', 'remarks'],
};

function detectColumns(headers: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  const normalized = headers.map(normCell);
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    const aliasesNorm = aliases.map((a) => a.toLowerCase().trim());
    // Exact match first
    let idx = normalized.findIndex((h) => aliasesNorm.includes(h));
    // Partial match fallback
    if (idx === -1) {
      idx = normalized.findIndex((h) => aliasesNorm.some((a) => h.includes(a)));
    }
    if (idx !== -1) result[field] = idx;
  }
  return result;
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

export function parseDate(s: string): string | null {
  const clean = s.trim();
  if (!clean) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // D/M/YYYY or D/M/YY
  const m1 = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) {
    const yr = parseInt(m1[3]);
    const year = yr < 100 ? 2000 + yr : yr;
    return `${year}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  }

  // DD-MM-YYYY or D-M-YYYY
  const m2 = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;

  // DD.MM.YYYY
  const m3 = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m3) return `${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;

  return null;
}

// ─── Amount / currency parsing ────────────────────────────────────────────────

const SYMBOL_TO_ISO: Record<string, string> = {
  '₪': 'ILS', '€': 'EUR', '$': 'USD', '£': 'GBP', '¥': 'JPY', '₩': 'KRW',
};

function normalizeCurrencyCode(s: string): string {
  const clean = s.trim();
  return SYMBOL_TO_ISO[clean] ?? (clean.toUpperCase().slice(0, 3) || 'ILS');
}

interface AmountParsed {
  amount: number | null;
  detectedCurrency: string | null;
}

function parseAmountFull(s: string): AmountParsed {
  const clean = s.trim();
  if (!clean) return { amount: null, detectedCurrency: null };

  // Symbol at start: "₪ 49.90", "€ 45.00"
  for (const [symbol, iso] of Object.entries(SYMBOL_TO_ISO)) {
    if (clean.startsWith(symbol)) {
      const rest = clean.slice(symbol.length).trim().replace(/[,\s]/g, '');
      const n = parseFloat(rest);
      return { amount: isNaN(n) ? null : Math.abs(n), detectedCurrency: iso };
    }
  }

  // Symbol at end: "49.90₪", "45.00 €"
  for (const [symbol, iso] of Object.entries(SYMBOL_TO_ISO)) {
    if (clean.endsWith(symbol) || clean.endsWith(` ${symbol}`)) {
      const rest = clean.replace(/[₪€$£¥₩\s]/g, '').replace(/,/g, '');
      const n = parseFloat(rest);
      return { amount: isNaN(n) ? null : Math.abs(n), detectedCurrency: iso };
    }
  }

  // Strip all known symbols and parse
  const stripped = clean.replace(/[$€£¥₪₩,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const n = parseFloat(stripped);
  return { amount: isNaN(n) ? null : Math.abs(n), detectedCurrency: null };
}

// ─── Category mapping ─────────────────────────────────────────────────────────

const KNOWN_CATEGORIES: ExpenseCategory[] = [
  'transportation', 'food', 'hotel', 'parking', 'taxi', 'flight', 'equipment', 'other',
];

const HEB_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  'רכב ותחבורה': 'transportation',
  'תחבורה': 'transportation',
  'מסעדות': 'food',
  'מזון ומשקאות': 'food',
  'מזון מהיר': 'food',
  'מלונאות ואירוח': 'hotel',
  'מלון': 'hotel',
  'חניה': 'parking',
  'מונית': 'taxi',
  'תיירות': 'flight',
  'טיסה': 'flight',
  'ציוד': 'equipment',
  'ציוד ומשרד': 'equipment',
  'תקשורת ומחשבים': 'equipment',
};

function mapCategory(s: string): ExpenseCategory {
  const clean = s.trim();
  const heb = HEB_CATEGORY_MAP[clean];
  if (heb) return heb;
  const norm = clean.toLowerCase();
  return KNOWN_CATEGORIES.find((c) => c === norm) ?? 'other';
}

// ─── Row parser ───────────────────────────────────────────────────────────────

const SKIP_ROW_PREFIXES = ['סך הכל', 'total', 'סה"כ', 'סה``כ', 'subtotal', 'grand total'];

function buildRows(
  dataRows: string[][],
  colMap: Record<string, number>,
): ParsedRow[] {
  return dataRows
    .filter((raw) => {
      // Skip fully empty rows
      if (raw.every((c) => c === '')) return false;
      // Skip single-value rows (footer totals, disclaimers)
      if (raw.filter((c) => c !== '').length < 2) return false;
      // Skip summary rows by keyword
      const first = (raw[0] ?? '').trim().toLowerCase();
      if (SKIP_ROW_PREFIXES.some((p) => first.startsWith(p.toLowerCase()))) return false;
      return true;
    })
    .map((raw) => {
      const dateStr   = colMap.date     !== undefined ? (raw[colMap.date]     ?? '') : '';
      const titleStr  = colMap.title    !== undefined ? (raw[colMap.title]    ?? '') : '';
      const amountStr = colMap.amount   !== undefined ? (raw[colMap.amount]   ?? '') : '';
      const currStr   = colMap.currency !== undefined ? (raw[colMap.currency] ?? '') : '';
      const catStr    = colMap.category !== undefined ? (raw[colMap.category] ?? '') : '';
      const notesStr  = colMap.notes    !== undefined ? (raw[colMap.notes]    ?? '') : '';

      const date  = parseDate(dateStr);
      const title = titleStr.trim() || null;

      const { amount, detectedCurrency } = parseAmountFull(amountStr);

      // Currency: explicit column > embedded in amount > default ILS for Israeli files
      const currency = currStr.trim()
        ? normalizeCurrencyCode(currStr)
        : (detectedCurrency ?? 'ILS');

      const category = mapCategory(catStr);

      let error = '';
      if (!date) error += 'Invalid date. ';
      if (!title) error += 'Missing title. ';
      if (amount === null) error += 'Invalid amount. ';

      return {
        raw,
        date,
        title,
        amount,
        currency,
        category,
        notes: notesStr.trim(),
        isValid: !error,
        error: error.trim(),
      };
    });
}

// ─── XLSX sheet → 2D string array ─────────────────────────────────────────────

function sheetToStringRows(ws: XLSX.WorkSheet): string[][] {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][];
  return aoa.map((row) =>
    (row as unknown[]).map((cell) => {
      if (cell == null) return '';
      if (cell instanceof Date) {
        const y = cell.getFullYear();
        const m = String(cell.getMonth() + 1).padStart(2, '0');
        const d = String(cell.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return String(cell).replace(/\r?\n/g, ' ').trim();
    }),
  );
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function parseImportFile(
  buffer: ArrayBuffer,
  filename: string,
  options: ParseOptions = {},
): ParseResult {
  const isXlsx = /\.(xlsx|xls|ods)$/i.test(filename);

  // ── Read all sheets ────────────────────────────────────────────────────────
  let sheets: Array<{ name: string; rows: string[][] }> = [];
  let encodingNote = '';

  if (isXlsx) {
    try {
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      sheets = wb.SheetNames.map((name) => ({
        name,
        rows: sheetToStringRows(wb.Sheets[name]),
      }));
      encodingNote = 'XLSX';
    } catch (e) {
      return {
        ok: false,
        reason: `Could not read XLSX file: ${String(e)}`,
        sheetNames: [],
        sheetPreviews: [],
      };
    }
  } else {
    const { text, encodingNote: enc } = decodeBuffer(buffer);
    encodingNote = enc;
    sheets = [{ name: 'Sheet1', rows: parseCsvToRows(text) }];
  }

  const sheetNames = sheets.map((s) => s.name);

  if (sheets.length === 0) {
    return { ok: false, reason: 'No sheets found in file.', sheetNames, sheetPreviews: [] };
  }

  // ── Select sheet ──────────────────────────────────────────────────────────
  let sheetIdx: number;
  if (options.sheetIndex !== undefined && options.sheetIndex < sheets.length) {
    sheetIdx = options.sheetIndex;
  } else {
    // Auto: pick sheet with highest header score (and most rows)
    let bestScore = -1;
    sheetIdx = 0;
    for (let i = 0; i < sheets.length; i++) {
      const headerIdx = detectHeaderRow(sheets[i].rows);
      const score = headerIdx !== null ? scoreHeaderRow(sheets[i].rows[headerIdx]) + sheets[i].rows.length * 0.01 : 0;
      if (score > bestScore) { bestScore = score; sheetIdx = i; }
    }
  }

  const selectedSheet = sheets[sheetIdx];
  const rows = selectedSheet.rows;

  // ── Detect header row ─────────────────────────────────────────────────────
  let headerRowIdx: number;
  if (options.headerRowOverride !== undefined) {
    headerRowIdx = options.headerRowOverride;
  } else {
    const detected = detectHeaderRow(rows);
    if (detected === null) {
      return {
        ok: false,
        reason: 'We could not automatically detect the transaction table.',
        sheetNames,
        sheetPreviews: sheets.map((s) => ({ name: s.name, rows: s.rows.slice(0, 10) })),
      };
    }
    headerRowIdx = detected;
  }

  const headers = rows[headerRowIdx] ?? [];
  const dataRows = rows.slice(headerRowIdx + 1);
  const colMap = detectColumns(headers);

  const parsedRows = buildRows(dataRows, colMap);

  // ── Build diagnostics ─────────────────────────────────────────────────────
  const colLabels: Record<string, string> = {};
  for (const [field, idx] of Object.entries(colMap)) {
    colLabels[field] = headers[idx] ?? `Col ${idx}`;
  }

  const diagnostics: ParseDiagnostics = {
    sheetName: selectedSheet.name,
    headerRowIndex: headerRowIdx + 1, // 1-based
    columns: colLabels,
    rowCount: parsedRows.filter((r) => r.isValid).length,
    encodingNote,
  };

  return {
    ok: true,
    headers,
    colMap,
    rows: parsedRows,
    diagnostics,
    sheetNames,
  };
}
