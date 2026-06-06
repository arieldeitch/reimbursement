import { router } from 'expo-router';
import React, { useRef, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';
import { PAYMENT_METHODS } from '@/types/expense';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types/expense';

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines
    .map((line) => {
      const fields: string[] = [];
      let field = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          fields.push(field.trim()); field = '';
        } else {
          field += ch;
        }
      }
      fields.push(field.trim());
      return fields;
    })
    .filter((row) => row.some((cell) => cell !== ''));
}

const COL_ALIASES: Record<string, string[]> = {
  date:     ['date', 'transaction date', 'trans date', 'posting date', 'value date', 'תאריך'],
  title:    ['title', 'description', 'desc', 'memo', 'narrative', 'payee', 'name', 'merchant', 'details', 'תיאור'],
  amount:   ['amount', 'debit', 'credit', 'charge', 'sum', 'total', 'value', 'סכום'],
  currency: ['currency', 'ccy', 'curr', 'מטבע'],
  category: ['category', 'type', 'tag', 'קטגוריה'],
  notes:    ['notes', 'note', 'comment', 'reference', 'ref', 'הערות'],
};

function detectColumns(headers: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  const norm = headers.map((h) => h.toLowerCase().trim());
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    const idx = norm.findIndex((h) => aliases.includes(h));
    if (idx !== -1) result[field] = idx;
  }
  return result;
}

function parseDate(s: string): string | null {
  const clean = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const m1 = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`;
  const m2 = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return null;
}

function parseAmount(s: string): number | null {
  const cleaned = s.replace(/[$€£¥₪,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.abs(n);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
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

type Step = 'upload' | 'preview';

// ─── Screen ───────────────────────────────────────────────────────────────────

function isDuplicateOf(row: ParsedRow, existing: Expense[]): boolean {
  if (!row.date || !row.title || row.amount === null) return false;
  const titleNorm = row.title.trim().toLowerCase();
  return existing.some(
    (e) =>
      e.date === row.date &&
      e.title.trim().toLowerCase() === titleNorm &&
      Math.abs(e.amount - row.amount!) <= 0.01,
  );
}

export default function ImportCSVScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const addExpense = useExpenseStore((s) => s.addExpense);
  const expenses   = useExpenseStore((s) => s.expenses);
  const trips      = useTripStore((s) => s.trips);
  const openTrips  = trips.filter((t) => t.status === 'open');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep]           = useState<Step>('upload');
  const [fileName, setFileName]   = useState('');
  const [headers, setHeaders]     = useState<string[]>([]);
  const [colMap, setColMap]       = useState<Record<string, number>>({});
  const [rows, setRows]           = useState<ParsedRow[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>('personal_card');
  const [currencyOverride, setCurrencyOverride] = useState('');
  const [importing, setImporting] = useState(false);

  const validRows   = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  const missingCurrency = rows.length > 0 && colMap.currency === undefined;

  const duplicateIndices = useMemo<Set<number>>(() => {
    const set = new Set<number>();
    rows.forEach((row, i) => {
      if (row.isValid && isDuplicateOf(row, expenses)) set.add(i);
    });
    return set;
  }, [rows, expenses]);

  function processFileText(text: string, name: string) {
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      Alert.alert('Error', 'The CSV file appears to be empty or invalid.');
      return;
    }

    const hdrs = parsed[0];
    const data = parsed.slice(1);
    const map  = detectColumns(hdrs);

    const parsedRows: ParsedRow[] = data.map((raw) => {
      const dateStr   = map.date   !== undefined ? raw[map.date]   ?? '' : '';
      const titleStr  = map.title  !== undefined ? raw[map.title]  ?? '' : '';
      const amountStr = map.amount !== undefined ? raw[map.amount] ?? '' : '';
      const currStr   = map.currency !== undefined ? raw[map.currency] ?? 'USD' : 'USD';
      const catStr    = map.category !== undefined ? raw[map.category] ?? '' : '';
      const notesStr  = map.notes  !== undefined ? raw[map.notes]  ?? '' : '';

      const date   = parseDate(dateStr);
      const title  = titleStr.trim() || null;
      const amount = parseAmount(amountStr);

      const knownCategories: ExpenseCategory[] = [
        'transportation', 'food', 'hotel', 'parking', 'taxi', 'flight', 'equipment', 'other',
      ];
      const catNorm = catStr.toLowerCase().trim();
      const category: ExpenseCategory =
        knownCategories.find((c) => c === catNorm) ?? 'other';

      const currency = (currStr.trim().toUpperCase() || 'USD').slice(0, 3);

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

    setFileName(name);
    setHeaders(hdrs);
    setColMap(map);
    setRows(parsedRows);
    setStep('preview');
  }

  function handlePickFile() {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  function handleFileChange(e: any) {
    const file: File | undefined = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') processFileText(text, file.name);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    const resolvedCurrency = missingCurrency && currencyOverride.trim()
      ? currencyOverride.trim().toUpperCase().slice(0, 3)
      : undefined;
    setImporting(true);
    try {
      for (const row of validRows) {
        await addExpense({
          title: row.title!,
          amount: row.amount!,
          currency: resolvedCurrency ?? row.currency,
          date: row.date!,
          category: row.category,
          paymentMethod,
          notes: row.notes || undefined,
          workTripId: selectedTripId,
        });
      }
      Alert.alert(
        'Import Complete',
        `${validRows.length} expense${validRows.length !== 1 ? 's' : ''} imported successfully.`,
        [{ text: 'OK', onPress: () => router.push(selectedTripId ? `/trip/${selectedTripId}` : '/expenses') }],
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Import Failed', 'Some expenses could not be saved. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  const hiddenFileInput =
    Platform.OS === 'web'
      ? React.createElement('input', {
          type: 'file',
          accept: '.csv,text/csv,text/plain',
          ref: fileInputRef,
          style: { display: 'none' },
          onChange: handleFileChange,
        })
      : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
    >
      <View style={[styles.container, isWide && styles.containerWide]}>
        {hiddenFileInput}

        {step === 'upload' && (
          <UploadStep onPickFile={handlePickFile} />
        )}

        {step === 'preview' && (
          <PreviewStep
            fileName={fileName}
            headers={headers}
            colMap={colMap}
            rows={rows}
            validRows={validRows}
            invalidRows={invalidRows}
            duplicateIndices={duplicateIndices}
            missingCurrency={missingCurrency}
            currencyOverride={currencyOverride}
            onCurrencyOverride={setCurrencyOverride}
            paymentMethod={paymentMethod}
            onPaymentMethod={setPaymentMethod}
            openTrips={openTrips}
            selectedTripId={selectedTripId}
            onSelectTrip={setSelectedTripId}
            onImport={handleImport}
            onBack={() => setStep('upload')}
            importing={importing}
          />
        )}
      </View>
    </ScrollView>
  );
}

// ─── Upload Step ─────────────────────────────────────────────────────────────

function UploadStep({ onPickFile }: { onPickFile: () => void }) {
  return (
    <View>
      <Text style={styles.heading}>Import CSV</Text>
      <Text style={styles.subheading}>
        Import expenses from a CSV file exported by your bank, credit card, or accounting tool.
      </Text>

      <View style={styles.formatBox}>
        <Text style={styles.formatTitle}>Expected columns (auto-detected):</Text>
        {[
          ['Date', 'date, transaction date, posting date'],
          ['Title', 'title, description, memo, payee, merchant'],
          ['Amount', 'amount, debit, credit, charge'],
          ['Currency', 'currency, ccy  (optional, defaults to USD)'],
          ['Category', 'category, type  (optional)'],
          ['Notes', 'notes, note, memo  (optional)'],
        ].map(([field, aliases]) => (
          <View key={field} style={styles.formatRow}>
            <Text style={styles.formatField}>{field}</Text>
            <Text style={styles.formatAliases}>{aliases}</Text>
          </View>
        ))}
      </View>

      {Platform.OS !== 'web' ? (
        <View style={styles.notAvailable}>
          <Text style={styles.notAvailableText}>
            CSV import is only available in the web app.
          </Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.uploadBtn, pressed && styles.uploadBtnPressed]}
          onPress={onPickFile}
        >
          <Text style={styles.uploadBtnText}>Choose CSV File</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Preview Step ────────────────────────────────────────────────────────────

interface PreviewProps {
  fileName: string;
  headers: string[];
  colMap: Record<string, number>;
  rows: ParsedRow[];
  validRows: ParsedRow[];
  invalidRows: ParsedRow[];
  duplicateIndices: Set<number>;
  missingCurrency: boolean;
  currencyOverride: string;
  onCurrencyOverride: (v: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethod: (v: PaymentMethod) => void;
  openTrips: { id: string; name: string }[];
  selectedTripId: string | undefined;
  onSelectTrip: (id: string | undefined) => void;
  onImport: () => void;
  onBack: () => void;
  importing: boolean;
}

function PreviewStep({
  fileName,
  headers,
  colMap,
  rows,
  validRows,
  invalidRows,
  duplicateIndices,
  missingCurrency,
  currencyOverride,
  onCurrencyOverride,
  paymentMethod,
  onPaymentMethod,
  openTrips,
  selectedTripId,
  onSelectTrip,
  onImport,
  onBack,
  importing,
}: PreviewProps) {
  const previewRows = rows.slice(0, 10);
  const duplicateCount = duplicateIndices.size;

  return (
    <View>
      <Text style={styles.heading}>Preview Import</Text>

      <View style={styles.fileNameRow}>
        <Text style={styles.fileNameLabel}>File:</Text>
        <Text style={styles.fileName}>{fileName}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBadge, styles.statBadgeTotal]}>
          <Text style={styles.statBadgeText}>{rows.length} total rows</Text>
        </View>
        <View style={[styles.statBadge, styles.statBadgeValid]}>
          <Text style={styles.statBadgeText}>{validRows.length} valid</Text>
        </View>
        {invalidRows.length > 0 && (
          <View style={[styles.statBadge, styles.statBadgeInvalid]}>
            <Text style={styles.statBadgeText}>{invalidRows.length} errors</Text>
          </View>
        )}
        {duplicateCount > 0 && (
          <View style={[styles.statBadge, styles.statBadgeDuplicate]}>
            <Text style={styles.statBadgeText}>{duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {duplicateCount > 0 && (
        <View style={styles.duplicateBanner}>
          <Text style={styles.duplicateBannerText}>
            ⚠ {duplicateCount} row{duplicateCount !== 1 ? 's' : ''} may already exist (same date, title, and amount). They will still be imported — review before confirming.
          </Text>
        </View>
      )}

      {/* Detected columns */}
      <Text style={styles.sectionLabel}>Detected Mapping</Text>
      <View style={styles.mappingBox}>
        {Object.keys(COL_ALIASES).map((field) => {
          const colIdx = colMap[field];
          const found  = colIdx !== undefined;
          return (
            <View key={field} style={styles.mappingRow}>
              <Text style={styles.mappingField}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
              <Text style={[styles.mappingValue, !found && styles.mappingValueMissing]}>
                {found ? `"${headers[colIdx]}"` : '— not found'}
              </Text>
            </View>
          );
        })}
      </View>

      {(colMap.date === undefined || colMap.title === undefined || colMap.amount === undefined) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            ⚠ Required columns (date, title, amount) could not be detected. Please check your CSV headers.
          </Text>
        </View>
      )}

      {/* Trip assignment */}
      <Text style={styles.sectionLabel}>Assign to Trip (optional)</Text>
      {openTrips.length === 0 ? (
        <View style={styles.noTripsHint}>
          <Text style={styles.noTripsHintText}>
            No open trips — create a trip first to link these expenses.
          </Text>
        </View>
      ) : Platform.OS === 'web' ? (
        React.createElement(
          'select',
          {
            value: selectedTripId ?? '',
            onChange: (e: any) => onSelectTrip(e.target.value || undefined),
            style: {
              width: '100%',
              padding: '10px 12px',
              fontSize: 15,
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              backgroundColor: '#fafafa',
              color: '#111827',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              marginBottom: 0,
            } as React.CSSProperties,
          },
          React.createElement('option', { value: '' }, 'None — unassigned'),
          ...openTrips.map((trip) =>
            React.createElement('option', { key: trip.id, value: trip.id }, trip.name),
          ),
        )
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <Pressable
            style={[styles.chip, !selectedTripId && styles.chipActive]}
            onPress={() => onSelectTrip(undefined)}
          >
            <Text style={[styles.chipText, !selectedTripId && styles.chipTextActive]}>None</Text>
          </Pressable>
          {openTrips.map((trip) => (
            <Pressable
              key={trip.id}
              style={[styles.chip, selectedTripId === trip.id && styles.chipActive]}
              onPress={() => onSelectTrip(trip.id)}
            >
              <Text
                style={[styles.chipText, selectedTripId === trip.id && styles.chipTextActive]}
                numberOfLines={1}
              >
                {trip.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Payment method */}
      <Text style={styles.sectionLabel}>Payment Method</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {PAYMENT_METHODS.map((pm) => (
          <Pressable
            key={pm.value}
            style={[styles.chip, paymentMethod === pm.value && styles.chipActive]}
            onPress={() => onPaymentMethod(pm.value)}
          >
            <Text style={[styles.chipText, paymentMethod === pm.value && styles.chipTextActive]}>
              {pm.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Currency override */}
      {missingCurrency && (
        <>
          <Text style={styles.sectionLabel}>Currency</Text>
          <View style={styles.currencyWarning}>
            <Text style={styles.currencyWarningText}>
              ⚠ No currency column detected. All expenses will use the currency below.
            </Text>
          </View>
          <TextInput
            style={styles.currencyInput}
            value={currencyOverride}
            onChangeText={onCurrencyOverride}
            placeholder="USD"
            placeholderTextColor="#aaa"
            maxLength={3}
            autoCapitalize="characters"
          />
        </>
      )}

      {/* Preview table */}
      <Text style={styles.sectionLabel}>Preview (first {previewRows.length} rows)</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.tableCellDate, styles.tableHeaderText]}>Date</Text>
          <Text style={[styles.tableCell, styles.tableCellTitle, styles.tableHeaderText]}>Title</Text>
          <Text style={[styles.tableCell, styles.tableCellAmount, styles.tableHeaderText]}>Amount</Text>
          <Text style={[styles.tableCell, styles.tableCellStatus, styles.tableHeaderText]}>OK</Text>
        </View>
        {previewRows.map((row, i) => {
          const isDup = duplicateIndices.has(i);
          return (
            <View key={i} style={[
              styles.tableRow,
              !row.isValid && styles.tableRowInvalid,
              isDup && styles.tableRowDuplicate,
            ]}>
              <Text style={[styles.tableCell, styles.tableCellDate]} numberOfLines={1}>
                {row.date ?? '—'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellTitle]} numberOfLines={1}>
                {row.title ?? '—'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellAmount]} numberOfLines={1}>
                {row.amount !== null ? `${row.currency} ${row.amount.toFixed(2)}` : '—'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellStatus, isDup && styles.tableCellDuplicate]}>
                {!row.isValid ? '✗' : isDup ? '⚠' : '✓'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.bottomActions}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        <Pressable
          style={[
            styles.importBtn,
            (validRows.length === 0 || importing) && styles.importBtnDisabled,
          ]}
          onPress={onImport}
          disabled={validRows.length === 0 || importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.importBtnText}>
              Import {validRows.length} Expense{validRows.length !== 1 ? 's' : ''}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ACCENT = '#2563EB';

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollContentWide: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  container: {
    width: '100%',
  },
  containerWide: {
    maxWidth: 720,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  formatBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 28,
  },
  formatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  formatRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  formatField: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    width: 80,
  },
  formatAliases: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  notAvailable: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  notAvailableText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  uploadBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  uploadBtnPressed: {
    backgroundColor: '#1D4ED8',
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  fileNameLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  fileName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statBadgeTotal: {
    backgroundColor: '#F3F4F6',
  },
  statBadgeValid: {
    backgroundColor: '#ECFDF5',
  },
  statBadgeInvalid: {
    backgroundColor: '#FEF2F2',
  },
  statBadgeDuplicate: {
    backgroundColor: '#FFFBEB',
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 20,
  },
  mappingBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  mappingField: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    width: 80,
  },
  mappingValue: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  mappingValueMissing: {
    color: '#9CA3AF',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  noTripsHint: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noTripsHintText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  chips: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    backgroundColor: '#fafafa',
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    fontSize: 14,
    color: '#555',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  tableRowInvalid: {
    backgroundColor: '#FEF2F2',
  },
  tableRowDuplicate: {
    backgroundColor: '#FFFBEB',
  },
  tableCellDuplicate: {
    color: '#D97706',
    fontWeight: '700',
  },
  duplicateBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 4,
  },
  duplicateBannerText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 18,
  },
  tableHeader: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#374151',
  },
  tableHeaderText: {
    fontWeight: '700',
    color: '#6B7280',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  tableCellDate:   { flex: 2 },
  tableCellTitle:  { flex: 3 },
  tableCellAmount: { flex: 2 },
  tableCellStatus: { flex: 1, textAlign: 'center' },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  importBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  importBtnDisabled: {
    backgroundColor: '#6EE7B7',
  },
  importBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  currencyWarning: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 8,
  },
  currencyWarningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  currencyInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
    width: 90,
  },
});
