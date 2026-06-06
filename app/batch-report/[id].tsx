import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { BatchStatusBadge } from '@/components/BatchStatusBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';
import type { BatchSummaryReport } from '@/utils/reportData';
import { batchSummaryReportData } from '@/utils/reportData';
import { exportBatchCsv } from '@/utils/batchExport';

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

function StatRow({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, warn === true && styles.statValueWarn]}>{String(value)}</Text>
    </View>
  );
}

// ─── Metadata + summary panel ─────────────────────────────────────────────────

function MetaPanel({
  report,
  exporting,
  onExport,
}: {
  report: BatchSummaryReport;
  exporting: boolean;
  onExport: () => void;
}) {
  const { batch, expenses, generatedAt } = report;

  return (
    <View>
      <Text style={styles.reportTitle}>{batch.name}</Text>
      <View style={styles.badgeRow}>
        <BatchStatusBadge status={batch.status as 'draft' | 'submitted' | 'approved' | 'paid'} />
      </View>

      {(batch.submittedAt || batch.approvedAt || batch.paidAt) && (
        <View style={styles.timestamps}>
          {batch.submittedAt && (
            <Text style={styles.timestamp}>Submitted: {batch.submittedAt.slice(0, 10)}</Text>
          )}
          {batch.approvedAt && (
            <Text style={styles.timestamp}>Approved: {batch.approvedAt.slice(0, 10)}</Text>
          )}
          {batch.paidAt && (
            <Text style={styles.timestamp}>Paid: {batch.paidAt.slice(0, 10)}</Text>
          )}
        </View>
      )}

      <Divider />

      <Field label="Report Generated" value={generatedAt.slice(0, 10)} />

      <Divider />

      <SectionTitle>Receipt Readiness</SectionTitle>
      <View style={styles.statsBlock}>
        <StatRow label="Total expenses"   value={expenses.total} />
        <StatRow label="Receipts present" value={expenses.withReceipt} />
        <StatRow
          label="Receipts missing"
          value={expenses.missingReceipt}
          warn={expenses.missingReceipt > 0}
        />
        <StatRow
          label="Unsubmitted"
          value={expenses.unsubmitted}
          warn={expenses.unsubmitted > 0}
        />
      </View>

      <Divider />

      <SectionTitle>Currency Totals</SectionTitle>
      <View style={styles.statsBlock}>
        {Object.keys(expenses.byCurrency).length === 0 ? (
          <Text style={styles.emptyNote}>No expenses</Text>
        ) : (
          Object.entries(expenses.byCurrency)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([currency, { count, amount }]) => (
              <StatRow
                key={currency}
                label={`${currency} (${count} expense${count !== 1 ? 's' : ''})`}
                value={`${currency} ${amount.toFixed(2)}`}
              />
            ))
        )}
      </View>

      <Divider />

      <Pressable
        style={[styles.exportBtn, exporting && styles.exportBtnBusy]}
        onPress={onExport}
        disabled={exporting}
      >
        <Text style={styles.exportBtnText}>{exporting ? 'Exporting…' : 'Export CSV'}</Text>
      </Pressable>
    </View>
  );
}

// ─── Expense list panel ───────────────────────────────────────────────────────

function ExpenseList({ report, isDesktop }: { report: BatchSummaryReport; isDesktop: boolean }) {
  const rows = report.expenses.rows;

  if (rows.length === 0) {
    return <Text style={styles.emptyNote}>No expenses assigned to this batch.</Text>;
  }

  if (isDesktop) {
    return (
      <View>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, styles.colDate]}>Date</Text>
          <Text style={[styles.th, styles.colTitle]}>Title</Text>
          <Text style={[styles.th, styles.colTrip]}>Trip</Text>
          <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          <Text style={[styles.th, styles.colStatus]}>Status</Text>
          <Text style={[styles.th, styles.colReceipt]}>Receipt</Text>
        </View>
        {rows.map((e, idx) => (
          <Pressable
            key={e.id}
            style={({ pressed }) => [
              styles.tableRow,
              idx % 2 === 1 && styles.tableRowAlt,
              pressed && styles.tableRowPressed,
            ]}
            onPress={() => router.push(`/expense/${e.id}`)}
          >
            <Text style={[styles.td, styles.colDate]}>{e.date}</Text>
            <Text style={[styles.td, styles.colTitle]} numberOfLines={1}>{e.title}</Text>
            <Text style={[styles.td, styles.colTrip]} numberOfLines={1}>
              {e.tripName ?? '—'}
            </Text>
            <Text style={[styles.td, styles.colAmount]}>
              {e.currency} {e.amount.toFixed(2)}
            </Text>
            <View style={styles.colStatus}>
              <StatusBadge status={e.status} />
            </View>
            <Text style={[styles.td, styles.colReceipt, !e.hasReceipt && styles.tdWarn]}>
              {e.hasReceipt ? 'Yes' : '⚠ No'}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  // Mobile cards
  return (
    <View>
      {rows.map((e) => (
        <Pressable
          key={e.id}
          style={({ pressed }) => [styles.expenseCard, pressed && styles.expenseCardPressed]}
          onPress={() => router.push(`/expense/${e.id}`)}
        >
          <View style={styles.expenseCardLeft}>
            <Text style={styles.expenseCardTitle} numberOfLines={1}>{e.title}</Text>
            <Text style={styles.expenseCardMeta}>{e.date}</Text>
            {e.tripName && (
              <Text style={styles.expenseCardMeta}>Trip: {e.tripName}</Text>
            )}
            <View style={styles.expenseCardBadge}>
              <StatusBadge status={e.status} />
            </View>
          </View>
          <View style={styles.expenseCardRight}>
            <Text style={styles.expenseCardAmount}>{e.currency} {e.amount.toFixed(2)}</Text>
            {!e.hasReceipt && <Text style={styles.expenseCardNoReceipt}>⚠ No receipt</Text>}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BatchReportScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { id } = useLocalSearchParams<{ id: string }>();
  const batches  = useBatchStore((s) => s.batches);
  const expenses = useExpenseStore((s) => s.expenses);
  const trips    = useTripStore((s) => s.trips);

  const [exporting, setExporting] = useState(false);

  const batch = useMemo(() => batches.find((b) => b.id === id) ?? null, [batches, id]);
  const batchExpenses = useMemo(
    () => expenses.filter((e) => e.reimbursementBatchId === id),
    [expenses, id],
  );
  const report = useMemo(
    () => (batch ? batchSummaryReportData(batch, batchExpenses, trips) : null),
    [batch, batchExpenses, trips],
  );

  const handleExport = async () => {
    if (!batch) return;
    setExporting(true);
    try {
      await exportBatchCsv(batch, batchExpenses, trips);
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', 'Could not generate the CSV file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!report) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Batch not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <View style={isDesktop ? styles.innerDesktop : undefined}>
        {/* Page heading */}
        <View style={styles.pageHeader}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </Pressable>
          <Text style={styles.pageHeading}>Batch Report</Text>
        </View>

        {isDesktop ? (
          <View style={styles.columns}>
            <View style={styles.colLeft}>
              <MetaPanel report={report} exporting={exporting} onExport={handleExport} />
            </View>
            <View style={styles.colRight}>
              <SectionTitle>Expenses ({report.expenses.total})</SectionTitle>
              <View style={styles.tableCard}>
                <ExpenseList report={report} isDesktop={isDesktop} />
              </View>
            </View>
          </View>
        ) : (
          <>
            <MetaPanel report={report} exporting={exporting} onExport={handleExport} />
            <Divider />
            <SectionTitle>Expenses ({report.expenses.total})</SectionTitle>
            <ExpenseList report={report} isDesktop={isDesktop} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  contentDesktop: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  innerDesktop: {
    maxWidth: 1100,
    width: '100%',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  notFoundText: {
    fontSize: 16,
    color: '#888',
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  backBtnText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },

  // Page header
  pageHeader: {
    marginBottom: 24,
  },
  backLink: {
    marginBottom: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  pageHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  // Two-column layout (desktop)
  columns: {
    flexDirection: 'row',
    gap: 40,
    alignItems: 'flex-start',
  },
  colLeft: {
    flex: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colRight: {
    flex: 3,
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 12,
  },

  // Primitives
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    color: '#111827',
  },
  badgeRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  timestamps: {
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Stats
  statsBlock: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#374151',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  statValueWarn: {
    color: '#D97706',
  },
  emptyNote: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Export button
  exportBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  exportBtnBusy: {
    backgroundColor: '#6EE7B7',
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Desktop table
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableRowPressed: {
    backgroundColor: '#EFF6FF',
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 13,
    color: '#111827',
  },
  tdWarn: {
    color: '#D97706',
    fontWeight: '600',
  },
  colDate:    { width: 88 },
  colTitle:   { flex: 1 },
  colTrip:    { width: 120 },
  colAmount:  { width: 110 },
  colStatus:  { width: 108, justifyContent: 'center' },
  colReceipt: { width: 70 },

  // Mobile expense cards
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  expenseCardPressed: {
    backgroundColor: '#EFF6FF',
  },
  expenseCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  expenseCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  expenseCardMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  expenseCardBadge: {
    marginTop: 6,
  },
  expenseCardRight: {
    alignItems: 'flex-end',
  },
  expenseCardAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  expenseCardNoReceipt: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 4,
  },
});
