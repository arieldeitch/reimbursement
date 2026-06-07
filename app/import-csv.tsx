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
import {
  parseImportFile,
  type ParseDiagnostics,
  type ParsedRow,
  type ParseFallback,
} from '@/utils/csvParser';
import {
  scoreRowsForTrip,
  type RecommendationScore,
  type ScoredRow,
} from '@/utils/tripScorer';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'fallback';

// ─── Duplicate detection ──────────────────────────────────────────────────────

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

// ─── Import provenance helpers ────────────────────────────────────────────────

function extractSourceCard(filename: string): string {
  const m = filename.match(/(\d{4})/);
  return m ? m[1] : '';
}

function detectBillingMonth(rows: ParsedRow[]): string {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (r.date) {
      const ym = r.date.slice(0, 7);
      counts[ym] = (counts[ym] ?? 0) + 1;
    }
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best?.[0] ?? new Date().toISOString().slice(0, 7);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ImportCSVScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const addExpense = useExpenseStore((s) => s.addExpense);
  const expenses   = useExpenseStore((s) => s.expenses);
  const trips      = useTripStore((s) => s.trips);
  const openTrips  = trips.filter((t) => t.status === 'open');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep]               = useState<Step>('upload');
  const [fileName, setFileName]       = useState('');
  const [headers, setHeaders]         = useState<string[]>([]);
  const [colMap, setColMap]           = useState<Record<string, number>>({});
  const [rows, setRows]               = useState<ParsedRow[]>([]);
  const [diagnostics, setDiagnostics] = useState<ParseDiagnostics | null>(null);
  const [sheetNames, setSheetNames]   = useState<string[]>([]);
  const [selectedTripId, setSelectedTripId]       = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod]         = useState<PaymentMethod>('personal_card');
  const [currencyOverride, setCurrencyOverride]   = useState('');
  const [importing, setImporting]     = useState(false);
  // Row exclusion
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  // Import provenance (populated per file)
  const [importBatchId, setImportBatchId]   = useState('');
  const [sourceCard, setSourceCard]         = useState('');
  const [billingMonth, setBillingMonth]     = useState('');

  // Fallback state
  const [fallbackInfo, setFallbackInfo] = useState<ParseFallback | null>(null);
  const [fbSheetIdx, setFbSheetIdx]     = useState(0);
  const [fbHeaderRow, setFbHeaderRow]   = useState('');
  const [lastBuffer, setLastBuffer]     = useState<ArrayBuffer | null>(null);
  const [lastFileName, setLastFileName] = useState('');

  const validRows   = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);
  const missingCurrency = rows.length > 0 && colMap.currency === undefined &&
    colMap.chargedAmount === undefined && colMap.originalAmount === undefined;
  // Rows selected for import (valid and not manually excluded)
  const importableCount = rows.filter((r, i) => r.isValid && !excludedIndices.has(i)).length;

  const duplicateIndices = useMemo<Set<number>>(() => {
    const set = new Set<number>();
    rows.forEach((row, i) => {
      if (row.isValid && isDuplicateOf(row, expenses)) set.add(i);
    });
    return set;
  }, [rows, expenses]);

  // Trip recommendation scoring
  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;
  const scoredRows = useMemo<ScoredRow[]>(() => {
    if (!selectedTrip || rows.length === 0) return [];
    return scoreRowsForTrip(rows, selectedTrip);
  }, [rows, selectedTrip]);

  const scoreByIndex = useMemo<Map<number, ScoredRow>>(() => {
    const m = new Map<number, ScoredRow>();
    scoredRows.forEach((s) => m.set(s.rowIndex, s));
    return m;
  }, [scoredRows]);

  const recommendedCount = useMemo(() => {
    return scoredRows.filter(
      (s) => (s.score === 'VERY_LIKELY' || s.score === 'LIKELY') && rows[s.rowIndex]?.isValid,
    ).length;
  }, [scoredRows, rows]);

  function applyParseResult(result: ReturnType<typeof parseImportFile>, name: string) {
    if (!result.ok) {
      setFallbackInfo(result);
      setSheetNames(result.sheetNames);
      setFbSheetIdx(0);
      setFbHeaderRow('');
      setFileName(name);
      setStep('fallback');
      return;
    }
    setHeaders(result.headers);
    setColMap(result.colMap);
    setRows(result.rows);
    setDiagnostics(result.diagnostics);
    setSheetNames(result.sheetNames);
    setFileName(name);
    setExcludedIndices(new Set());
    // Populate import provenance
    setImportBatchId(`ib-${Date.now().toString(36)}`);
    setSourceCard(extractSourceCard(name));
    setBillingMonth(detectBillingMonth(result.rows));
    setStep('preview');
  }

  function toggleRowExclusion(i: number) {
    if (!rows[i]?.isValid) return;
    setExcludedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function selectAllRows() { setExcludedIndices(new Set()); }
  function deselectAllRows() {
    setExcludedIndices(new Set(rows.map((r, i) => r.isValid ? i : -1).filter((i) => i >= 0)));
  }

  async function processFileBuffer(buffer: ArrayBuffer, name: string) {
    setLastBuffer(buffer);
    setLastFileName(name);
    const result = parseImportFile(buffer, name);
    applyParseResult(result, name);
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
      const buf = evt.target?.result;
      if (buf instanceof ArrayBuffer) processFileBuffer(buf, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFallbackRetry() {
    if (!lastBuffer) return;
    const headerRow = parseInt(fbHeaderRow, 10);
    const result = parseImportFile(lastBuffer, lastFileName, {
      sheetIndex: fbSheetIdx,
      headerRowOverride: isNaN(headerRow) ? undefined : headerRow - 1,
    });
    applyParseResult(result, lastFileName);
  }

  async function handleImport(recommendedOnly = false) {
    if (validRows.length === 0) return;
    const resolvedCurrency = missingCurrency && currencyOverride.trim()
      ? currencyOverride.trim().toUpperCase().slice(0, 3)
      : undefined;

    let rowsToImport: ParsedRow[];
    if (recommendedOnly && scoredRows.length > 0) {
      const highScoreIndices = new Set(
        scoredRows
          .filter((s) => s.score === 'VERY_LIKELY' || s.score === 'LIKELY')
          .map((s) => s.rowIndex),
      );
      rowsToImport = rows.filter((r, i) => highScoreIndices.has(i) && r.isValid && !excludedIndices.has(i));
    } else {
      rowsToImport = rows.filter((r, i) => r.isValid && !excludedIndices.has(i));
    }

    setImporting(true);
    try {
      for (const row of rowsToImport) {
        await addExpense({
          title: row.merchantName ?? row.title!,
          amount: row.amount!,
          currency: resolvedCurrency ?? row.currency,
          date: row.date!,
          category: row.category,
          paymentMethod,
          notes: row.notes || undefined,
          workTripId: selectedTripId,
          originalAmount: row.originalAmount ?? undefined,
          originalCurrency: row.originalCurrency ?? undefined,
          chargedAmount: row.chargedAmount ?? undefined,
          chargedCurrency: row.chargedCurrency ?? undefined,
          effectiveRate: row.effectiveRate ?? undefined,
          isInstallment: row.isInstallment || undefined,
          installmentIndex: row.installmentIndex ?? undefined,
          installmentTotal: row.installmentTotal ?? undefined,
          sourceCard: sourceCard || undefined,
          billingMonth: billingMonth || undefined,
          importBatchId: importBatchId || undefined,
        });
      }
      Alert.alert(
        'Import Complete',
        `${rowsToImport.length} expense${rowsToImport.length !== 1 ? 's' : ''} imported successfully.`,
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
          accept: '.csv,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

        {step === 'upload' && <UploadStep onPickFile={handlePickFile} />}

        {step === 'preview' && diagnostics && (
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
            diagnostics={diagnostics}
            openTrips={openTrips}
            selectedTripId={selectedTripId}
            onSelectTrip={setSelectedTripId}
            scoreByIndex={scoreByIndex}
            recommendedCount={recommendedCount}
            excludedIndices={excludedIndices}
            importableCount={importableCount}
            onToggleRow={toggleRowExclusion}
            onSelectAll={selectAllRows}
            onDeselectAll={deselectAllRows}
            onImport={handleImport}
            onBack={() => setStep('upload')}
            importing={importing}
            isWide={isWide}
          />
        )}

        {step === 'fallback' && (
          <FallbackStep
            fileName={fileName}
            fallbackInfo={fallbackInfo}
            sheetNames={sheetNames}
            fbSheetIdx={fbSheetIdx}
            onSheetIdx={setFbSheetIdx}
            fbHeaderRow={fbHeaderRow}
            onHeaderRow={setFbHeaderRow}
            onRetry={handleFallbackRetry}
            onBack={() => setStep('upload')}
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
      <Text style={styles.heading}>Import CSV / XLSX</Text>
      <Text style={styles.subheading}>
        Import expenses from a CSV or Excel file exported from your bank or credit card.
        Hebrew bank exports (Bank Hapoalim, Cal, Discount) are supported automatically.
      </Text>

      <View style={styles.formatBox}>
        <Text style={styles.formatTitle}>Auto-detected columns:</Text>
        {[
          ['Date', 'תאריך עסקה / date / transaction date'],
          ['Title', 'שם בית עסק / description / merchant / payee'],
          ['Amount', 'סכום עסקה / סכום חיוב / amount / charge / debit'],
          ['Currency', 'מטבע / currency  (optional, embedded in amount if absent)'],
          ['Category', 'קטגוריה / ענף / category  (optional)'],
          ['Notes', 'הערות / notes / memo  (optional)'],
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
          <Text style={styles.uploadBtnText}>Choose CSV / XLSX File</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Fallback Step ────────────────────────────────────────────────────────────

interface FallbackProps {
  fileName: string;
  fallbackInfo: ParseFallback | null;
  sheetNames: string[];
  fbSheetIdx: number;
  onSheetIdx: (i: number) => void;
  fbHeaderRow: string;
  onHeaderRow: (s: string) => void;
  onRetry: () => void;
  onBack: () => void;
}

function FallbackStep({
  fileName,
  fallbackInfo,
  sheetNames,
  fbSheetIdx,
  onSheetIdx,
  fbHeaderRow,
  onHeaderRow,
  onRetry,
  onBack,
}: FallbackProps) {
  const preview = fallbackInfo?.sheetPreviews?.[fbSheetIdx]?.rows ?? [];

  return (
    <View>
      <Text style={styles.heading}>Manual Setup Required</Text>

      <View style={styles.fallbackBanner}>
        <Text style={styles.fallbackBannerText}>
          ⚠ {fallbackInfo?.reason ?? 'We could not automatically detect the transaction table.'}
        </Text>
      </View>

      <Text style={styles.subheading}>{fileName}</Text>

      {sheetNames.length > 1 && (
        <>
          <Text style={styles.sectionLabel}>Worksheet</Text>
          {Platform.OS === 'web' ? (
            React.createElement(
              'select',
              {
                value: fbSheetIdx,
                onChange: (e: any) => onSheetIdx(parseInt(e.target.value, 10)),
                style: {
                  width: '100%', padding: '10px 12px', fontSize: 15,
                  borderRadius: 8, border: '1px solid #D1D5DB',
                  backgroundColor: '#fafafa', color: '#111827',
                  fontFamily: 'inherit', marginBottom: 0,
                } as React.CSSProperties,
              },
              ...sheetNames.map((name, i) =>
                React.createElement('option', { key: i, value: i }, name),
              ),
            )
          ) : (
            <ScrollView horizontal style={styles.chips}>
              {sheetNames.map((name, i) => (
                <Pressable
                  key={i}
                  style={[styles.chip, fbSheetIdx === i && styles.chipActive]}
                  onPress={() => onSheetIdx(i)}
                >
                  <Text style={[styles.chipText, fbSheetIdx === i && styles.chipTextActive]}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </>
      )}

      <Text style={styles.sectionLabel}>Header Row Number</Text>
      <Text style={styles.fallbackHint}>
        Look at the preview below. Enter the row number that contains column headers.
      </Text>
      <TextInput
        style={[styles.currencyInput, { width: 80 }]}
        value={fbHeaderRow}
        onChangeText={onHeaderRow}
        placeholder="e.g. 4"
        placeholderTextColor="#aaa"
        keyboardType="number-pad"
      />

      {preview.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>File Preview (first {preview.length} rows)</Text>
          <ScrollView horizontal>
            <View>
              {preview.map((row, ri) => (
                <View key={ri} style={[styles.fbPreviewRow, ri % 2 === 1 && styles.fbPreviewRowAlt]}>
                  <Text style={styles.fbRowNum}>{ri + 1}</Text>
                  {row.slice(0, 6).map((cell, ci) => (
                    <Text key={ci} style={styles.fbCell} numberOfLines={1}>{cell || '—'}</Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      <View style={styles.bottomActions}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Pressable
          style={[styles.importBtn, !fbHeaderRow.trim() && styles.importBtnDisabled]}
          onPress={onRetry}
          disabled={!fbHeaderRow.trim()}
        >
          <Text style={styles.importBtnText}>Try These Settings</Text>
        </Pressable>
      </View>
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
  diagnostics: ParseDiagnostics;
  openTrips: { id: string; name: string }[];
  selectedTripId: string | undefined;
  onSelectTrip: (id: string | undefined) => void;
  scoreByIndex: Map<number, ScoredRow>;
  recommendedCount: number;
  excludedIndices: Set<number>;
  importableCount: number;
  onToggleRow: (i: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onImport: (recommendedOnly?: boolean) => void;
  onBack: () => void;
  importing: boolean;
  isWide: boolean;
}

function PreviewStep({
  fileName,
  rows,
  validRows,
  invalidRows,
  duplicateIndices,
  missingCurrency,
  currencyOverride,
  onCurrencyOverride,
  paymentMethod,
  onPaymentMethod,
  diagnostics,
  openTrips,
  selectedTripId,
  onSelectTrip,
  scoreByIndex,
  recommendedCount,
  excludedIndices,
  importableCount,
  onToggleRow,
  onSelectAll,
  onDeselectAll,
  onImport,
  onBack,
  importing,
  isWide,
}: PreviewProps) {
  const duplicateCount = duplicateIndices.size;
  const hasScoring = scoreByIndex.size > 0;
  const hasDualCurrency = rows.some((r) => r.originalCurrency && r.originalCurrency !== r.chargedCurrency);

  return (
    <View>
      <Text style={styles.heading}>Preview Import</Text>

      <View style={styles.fileNameRow}>
        <Text style={styles.fileNameLabel}>File:</Text>
        <Text style={styles.fileName}>{fileName}</Text>
      </View>

      {/* Stats */}
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

      {/* Diagnostics panel */}
      <Text style={styles.sectionLabel}>Import Diagnostics</Text>
      <View style={styles.diagnosticsBox}>
        {diagnostics.sheetName !== 'Sheet1' && (
          <DiagRow label="Detected sheet" value={diagnostics.sheetName} />
        )}
        <DiagRow label="Detected header row" value={String(diagnostics.headerRowIndex)} />
        {Object.entries(diagnostics.columns).map(([field, col]) => (
          <DiagRow key={field} label={`${field.charAt(0).toUpperCase() + field.slice(1)} column`} value={`"${col}"`} />
        ))}
        <DiagRow label="Valid rows" value={String(diagnostics.rowCount)} />
        {diagnostics.encodingNote !== 'XLSX' && (
          <DiagRow label="Encoding" value={diagnostics.encodingNote} />
        )}
      </View>

      {/* Required columns warning */}
      {(diagnostics.columns.date === undefined || diagnostics.columns.title === undefined || diagnostics.columns.amount === undefined) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            ⚠ Required columns (date, title, amount) could not be detected. Check the diagnostics above.
          </Text>
        </View>
      )}

      {/* Duplicate warning */}
      {duplicateCount > 0 && (
        <View style={styles.duplicateBanner}>
          <Text style={styles.duplicateBannerText}>
            ⚠ {duplicateCount} row{duplicateCount !== 1 ? 's' : ''} may already exist (same date, title, and amount). They will still be imported — review before confirming.
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
              width: '100%', padding: '10px 12px', fontSize: 15,
              borderRadius: 8, border: '1px solid #D1D5DB',
              backgroundColor: '#fafafa', color: '#111827',
              fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
            } as React.CSSProperties,
          },
          React.createElement('option', { value: '' }, 'None — unassigned'),
          ...openTrips.map((trip) =>
            React.createElement('option', { key: trip.id, value: trip.id }, trip.name),
          ),
        )
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <Pressable style={[styles.chip, !selectedTripId && styles.chipActive]} onPress={() => onSelectTrip(undefined)}>
            <Text style={[styles.chipText, !selectedTripId && styles.chipTextActive]}>None</Text>
          </Pressable>
          {openTrips.map((trip) => (
            <Pressable
              key={trip.id}
              style={[styles.chip, selectedTripId === trip.id && styles.chipActive]}
              onPress={() => onSelectTrip(trip.id)}
            >
              <Text style={[styles.chipText, selectedTripId === trip.id && styles.chipTextActive]} numberOfLines={1}>
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

      {/* Smart trip assignment wizard */}
      {hasScoring && selectedTripId && (
        <>
          <Text style={styles.sectionLabel}>Smart Trip Assignment</Text>
          <View style={styles.wizardBox}>
            <ScoreSummaryRow rows={rows} scoreByIndex={scoreByIndex} />
            {recommendedCount > 0 && (
              <Text style={styles.wizardHint}>
                {recommendedCount} expense{recommendedCount !== 1 ? 's' : ''} scored VERY LIKELY or LIKELY for this trip.
                Use "Import Matched" to import only those, or "Import All" for everything valid.
              </Text>
            )}
          </View>
        </>
      )}

      {/* Preview table with row-level inclusion checkboxes */}
      <View style={styles.previewTableHeader}>
        <Text style={styles.sectionLabel}>Select Rows ({importableCount} of {validRows.length} selected)</Text>
        <View style={styles.selectAllRow}>
          <Pressable onPress={onSelectAll} style={styles.selectAllBtn}>
            <Text style={styles.selectAllBtnText}>All</Text>
          </Pressable>
          <Pressable onPress={onDeselectAll} style={styles.selectAllBtn}>
            <Text style={styles.selectAllBtnText}>None</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView horizontal={isWide && (hasDualCurrency || hasScoring)}>
        <View style={[styles.table, isWide && (hasDualCurrency || hasScoring) && { minWidth: 820 }]}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.tableCellCheck, styles.tableHeaderText]}>☑</Text>
            <Text style={[styles.tableCell, styles.tableCellDate, styles.tableHeaderText]}>Date</Text>
            <Text style={[styles.tableCell, styles.tableCellTitle, styles.tableHeaderText]}>Merchant</Text>
            {isWide && hasDualCurrency && (
              <Text style={[styles.tableCell, styles.tableCellFx, styles.tableHeaderText]}>Original</Text>
            )}
            <Text style={[styles.tableCell, styles.tableCellAmount, styles.tableHeaderText]}>Charged</Text>
            {isWide && hasDualCurrency && (
              <Text style={[styles.tableCell, styles.tableCellRate, styles.tableHeaderText]}>Rate</Text>
            )}
            {isWide && hasScoring && (
              <Text style={[styles.tableCell, styles.tableCellScore, styles.tableHeaderText]}>Match</Text>
            )}
            <Text style={[styles.tableCell, styles.tableCellStatus, styles.tableHeaderText]}>OK</Text>
          </View>
          {rows.map((row, i) => {
            const isDup = duplicateIndices.has(i);
            const scored = scoreByIndex.get(i);
            const showFx = isWide && hasDualCurrency;
            const showScore = isWide && hasScoring;
            const isExcluded = excludedIndices.has(i);
            const isIncluded = row.isValid && !isExcluded;
            return (
              <Pressable
                key={i}
                style={[
                  styles.tableRow,
                  !row.isValid && styles.tableRowInvalid,
                  isDup && styles.tableRowDuplicate,
                  isExcluded && styles.tableRowExcluded,
                ]}
                onPress={() => onToggleRow(i)}
                disabled={!row.isValid}
              >
                <Text style={[styles.tableCell, styles.tableCellCheck, isIncluded && styles.checkOn]}>
                  {!row.isValid ? ' ' : isIncluded ? '☑' : '☐'}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellDate, isExcluded && styles.cellExcluded]} numberOfLines={1}>
                  {row.date ?? '—'}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellTitle, isExcluded && styles.cellExcluded]} numberOfLines={1}>
                  {row.merchantName ?? row.title ?? '—'}
                </Text>
                {showFx && (
                  <Text style={[styles.tableCell, styles.tableCellFx, isExcluded && styles.cellExcluded]} numberOfLines={1}>
                    {row.originalAmount !== null && row.originalCurrency && row.originalCurrency !== row.chargedCurrency
                      ? `${row.originalCurrency} ${row.originalAmount.toFixed(2)}`
                      : '—'}
                  </Text>
                )}
                <Text style={[styles.tableCell, styles.tableCellAmount, isExcluded && styles.cellExcluded]} numberOfLines={1}>
                  {row.amount !== null ? `${row.currency} ${row.amount.toFixed(2)}` : '—'}
                </Text>
                {showFx && (
                  <Text style={[styles.tableCell, styles.tableCellRate, isExcluded && styles.cellExcluded]} numberOfLines={1}>
                    {row.effectiveRate ? `×${row.effectiveRate.toFixed(2)}` : '—'}
                  </Text>
                )}
                {showScore && (
                  <View style={[styles.tableCell, styles.tableCellScore]}>
                    {scored && scored.score !== 'IGNORE' ? (
                      <ScoreBadge score={scored.score} compact />
                    ) : (
                      <Text style={styles.scoreIgnore}>—</Text>
                    )}
                  </View>
                )}
                <Text style={[styles.tableCell, styles.tableCellStatus, isDup && styles.tableCellDuplicate]}>
                  {!row.isValid ? '✗' : isDup ? '⚠' : '✓'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.bottomActions}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        {hasScoring && recommendedCount > 0 && (
          <Pressable
            style={[styles.importBtnMatched, importing && styles.importBtnDisabled]}
            onPress={() => onImport(true)}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.importBtnText}>
                Import Matched ({recommendedCount})
              </Text>
            )}
          </Pressable>
        )}
        <Pressable
          style={[styles.importBtn, (validRows.length === 0 || importing) && styles.importBtnDisabled]}
          onPress={() => onImport(false)}
          disabled={validRows.length === 0 || importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.importBtnText}>
              {hasScoring && recommendedCount > 0
                ? `Import All (${validRows.length})`
                : `Import ${validRows.length} Expense${validRows.length !== 1 ? 's' : ''}`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Score summary row ───────────────────────────────────────────────────────

function ScoreSummaryRow({
  rows,
  scoreByIndex,
}: {
  rows: ParsedRow[];
  scoreByIndex: Map<number, ScoredRow>;
}) {
  const counts: Record<RecommendationScore, number> = {
    VERY_LIKELY: 0, LIKELY: 0, REVIEW: 0, IGNORE: 0,
  };
  rows.forEach((r, i) => {
    if (!r.isValid) return;
    const s = scoreByIndex.get(i);
    if (s) counts[s.score]++;
  });

  const SCORE_LABELS: { score: RecommendationScore; label: string; color: string; bg: string }[] = [
    { score: 'VERY_LIKELY', label: 'Very Likely', color: '#065F46', bg: '#D1FAE5' },
    { score: 'LIKELY',      label: 'Likely',      color: '#1D4ED8', bg: '#DBEAFE' },
    { score: 'REVIEW',      label: 'Review',      color: '#92400E', bg: '#FEF3C7' },
    { score: 'IGNORE',      label: 'Ignore',      color: '#6B7280', bg: '#F3F4F6' },
  ];

  return (
    <View style={styles.scoreSummaryRow}>
      {SCORE_LABELS.map(({ score, label, color, bg }) => (
        <View key={score} style={[styles.scoreSummaryChip, { backgroundColor: bg }]}>
          <Text style={[styles.scoreSummaryCount, { color }]}>{counts[score]}</Text>
          <Text style={[styles.scoreSummaryLabel, { color }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Score badge ─────────────────────────────────────────────────────────────

const SCORE_STYLE: Record<RecommendationScore, { color: string; bg: string; label: string }> = {
  VERY_LIKELY: { color: '#065F46', bg: '#D1FAE5', label: 'VL' },
  LIKELY:      { color: '#1D4ED8', bg: '#DBEAFE', label: 'L'  },
  REVIEW:      { color: '#92400E', bg: '#FEF3C7', label: 'R'  },
  IGNORE:      { color: '#6B7280', bg: '#F3F4F6', label: '—'  },
};

function ScoreBadge({ score, compact }: { score: RecommendationScore; compact?: boolean }) {
  const s = SCORE_STYLE[score];
  return (
    <View style={[styles.scoreBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.scoreBadgeText, { color: s.color }]}>
        {compact ? s.label : score.replace('_', ' ')}
      </Text>
    </View>
  );
}

// ─── Diagnostics row ──────────────────────────────────────────────────────────

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.diagRow}>
      <Text style={styles.diagLabel}>{label}:</Text>
      <Text style={styles.diagValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ACCENT = '#2563EB';

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  scrollContentWide: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32 },
  container: { width: '100%' },
  containerWide: { maxWidth: 720 },

  heading: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subheading: { fontSize: 15, color: '#6B7280', marginBottom: 24, lineHeight: 22 },

  formatBox: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 28,
  },
  formatTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 },
  formatRow: { flexDirection: 'row', marginBottom: 6 },
  formatField: { fontSize: 13, fontWeight: '600', color: ACCENT, width: 80 },
  formatAliases: { fontSize: 13, color: '#6B7280', flex: 1 },

  notAvailable: {
    backgroundColor: '#FFF7ED', borderRadius: 10, padding: 20,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  notAvailableText: { fontSize: 14, color: '#92400E', textAlign: 'center' },

  uploadBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  uploadBtnPressed: { backgroundColor: '#1D4ED8' },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Fallback
  fallbackBanner: {
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 20,
  },
  fallbackBannerText: { fontSize: 14, color: '#92400E', fontWeight: '600', lineHeight: 20 },
  fallbackHint: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  fbPreviewRow: { flexDirection: 'row', paddingVertical: 4 },
  fbPreviewRowAlt: { backgroundColor: '#F9FAFB' },
  fbRowNum: { width: 28, fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  fbCell: { width: 120, fontSize: 12, color: '#374151', paddingHorizontal: 4 },

  // Diagnostics
  diagnosticsBox: {
    backgroundColor: '#F0F9FF', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  diagRow: { flexDirection: 'row', paddingVertical: 3, flexWrap: 'wrap' },
  diagLabel: { fontSize: 12, color: '#0369A1', fontWeight: '600', width: 180 },
  diagValue: { fontSize: 12, color: '#0C4A6E', flex: 1 },

  fileNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  fileNameLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  fileName: { fontSize: 13, color: '#374151', fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  statBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  statBadgeTotal: { backgroundColor: '#F3F4F6' },
  statBadgeValid: { backgroundColor: '#ECFDF5' },
  statBadgeInvalid: { backgroundColor: '#FEF2F2' },
  statBadgeDuplicate: { backgroundColor: '#FFFBEB' },
  statBadgeText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginTop: 20,
  },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginTop: 12,
  },
  errorBannerText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },

  duplicateBanner: {
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 4,
  },
  duplicateBannerText: { fontSize: 13, color: '#92400E', fontWeight: '500', lineHeight: 18 },

  noTripsHint: {
    backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  noTripsHintText: { fontSize: 13, color: '#9CA3AF' },

  chips: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', marginRight: 8, backgroundColor: '#fafafa',
  },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 14, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  currencyWarning: {
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 8,
  },
  currencyWarningText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  currencyInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
    color: '#111', backgroundColor: '#fafafa', width: 90,
  },

  table: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
    borderColor: '#E5E7EB', overflow: 'hidden',
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  tableRowInvalid: { backgroundColor: '#FEF2F2' },
  tableRowDuplicate: { backgroundColor: '#FFFBEB' },
  tableRowExcluded: { opacity: 0.4 },
  tableCellCheck: { flex: 0.8, textAlign: 'center' as const, fontSize: 15, color: '#9CA3AF' },
  checkOn: { color: '#059669' },
  cellExcluded: { color: '#9CA3AF' },
  previewTableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  selectAllRow: { flexDirection: 'row', gap: 8 },
  selectAllBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  selectAllBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  tableHeader: { backgroundColor: '#F9FAFB' },
  tableCell: { paddingHorizontal: 10, paddingVertical: 10, fontSize: 13, color: '#374151' },
  tableHeaderText: { fontWeight: '700', color: '#6B7280', fontSize: 11, textTransform: 'uppercase' },
  tableCellDate: { flex: 2 },
  tableCellTitle: { flex: 3 },
  tableCellAmount: { flex: 2 },
  tableCellStatus: { flex: 1, textAlign: 'center' },
  tableCellDuplicate: { color: '#D97706', fontWeight: '700' },

  bottomActions: { flexDirection: 'row', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  backBtn: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  importBtn: {
    flex: 1, backgroundColor: '#059669', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', minWidth: 140,
  },
  importBtnMatched: {
    flex: 1, backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', minWidth: 140,
  },
  importBtnDisabled: { backgroundColor: '#6EE7B7' },
  importBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // New table columns
  tableCellFx: { flex: 1.5 },
  tableCellRate: { flex: 1, textAlign: 'right' as const },
  tableCellScore: { flex: 1.5, alignItems: 'center' as const, justifyContent: 'center' as const },
  scoreIgnore: { fontSize: 11, color: '#9CA3AF' },

  // Score badge
  scoreBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  scoreBadgeText: { fontSize: 11, fontWeight: '700' },

  // Wizard box
  wizardBox: {
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 4,
  },
  wizardHint: { fontSize: 13, color: '#065F46', marginTop: 8, lineHeight: 18 },

  // Score summary
  scoreSummaryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  scoreSummaryChip: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', minWidth: 60,
  },
  scoreSummaryCount: { fontSize: 18, fontWeight: '800' },
  scoreSummaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
});
