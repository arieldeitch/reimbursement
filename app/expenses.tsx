import { Link, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';
import type { Expense, ExpenseStatus, ReimbursementRelevance } from '@/types/expense';

const ALL_STATUSES: ExpenseStatus[] = ['unsubmitted', 'submitted', 'approved', 'paid', 'rejected'];

// ─── Column widths ────────────────────────────────────────────────────────────
const W = {
  date:      82,
  amount:   108,
  relevance: 90,
  reviewed:  72,
  trip:     130,
  receipt:   58,
  status:   108,
};

// ─── Relevance cycling ────────────────────────────────────────────────────────

function nextRelevance(current: ReimbursementRelevance | undefined): ReimbursementRelevance | null {
  if (!current) return 'YES';
  if (current === 'YES') return 'NO';
  if (current === 'NO') return 'REVIEW';
  return null;
}

const RELEVANCE_COLORS: Record<ReimbursementRelevance, { bg: string; text: string }> = {
  YES:    { bg: '#D1FAE5', text: '#065F46' },
  NO:     { bg: '#FEE2E2', text: '#991B1B' },
  REVIEW: { bg: '#FEF3C7', text: '#92400E' },
};

// ─── MetricsPanel ─────────────────────────────────────────────────────────────

function MetricsPanel({ expenses }: { expenses: Expense[] }) {
  const total    = expenses.length;
  const reviewed = expenses.filter((e) => e.isReviewed).length;
  const remaining = total - reviewed;
  const assigned = expenses.filter((e) => e.workTripId).length;
  const ready    = expenses.filter(
    (e) => e.isReviewed && e.reimbursementRelevance === 'YES' && e.hasReceipt,
  ).length;

  const stats = [
    { label: 'Total',    value: total,     color: '#2563EB' },
    { label: 'Reviewed', value: reviewed,  color: '#059669' },
    { label: 'Remaining',value: remaining, color: '#D97706' },
    { label: 'Assigned', value: assigned,  color: '#7C3AED' },
    { label: 'Ready',    value: ready,     color: '#0891B2' },
  ];

  return (
    <View style={styles.metrics}>
      {stats.map((s) => (
        <View key={s.label} style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: s.color }]}>{s.value}</Text>
          <Text style={styles.metricLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function Filters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  tripFilter, onTripChange,
  reviewedFilter, onReviewedChange,
  relevanceFilter, onRelevanceChange,
  trips,
}: {
  search: string; onSearchChange: (v: string) => void;
  statusFilter: ExpenseStatus | ''; onStatusChange: (v: ExpenseStatus | '') => void;
  tripFilter: string; onTripChange: (v: string) => void;
  reviewedFilter: '' | 'reviewed' | 'unreviewed'; onReviewedChange: (v: '' | 'reviewed' | 'unreviewed') => void;
  relevanceFilter: ReimbursementRelevance | ''; onRelevanceChange: (v: ReimbursementRelevance | '') => void;
  trips: { id: string; name: string }[];
}) {
  return (
    <View style={styles.filtersContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by title or notes…"
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={onSearchChange}
        clearButtonMode="while-editing"
      />
      {/* Review state filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
        <FilterChip label="All" active={reviewedFilter === ''} onPress={() => onReviewedChange('')} />
        <FilterChip label="✓ Reviewed" active={reviewedFilter === 'reviewed'} onPress={() => onReviewedChange('reviewed')} />
        <FilterChip label="Unreviewed" active={reviewedFilter === 'unreviewed'} onPress={() => onReviewedChange('unreviewed')} />
      </ScrollView>
      {/* Relevance filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
        <FilterChip label="All Relevance" active={relevanceFilter === ''} onPress={() => onRelevanceChange('')} />
        <FilterChip label="YES" active={relevanceFilter === 'YES'} onPress={() => onRelevanceChange('YES')} />
        <FilterChip label="NO" active={relevanceFilter === 'NO'} onPress={() => onRelevanceChange('NO')} />
        <FilterChip label="REVIEW" active={relevanceFilter === 'REVIEW'} onPress={() => onRelevanceChange('REVIEW')} />
      </ScrollView>
      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
        <FilterChip label="All Status" active={statusFilter === ''} onPress={() => onStatusChange('')} />
        {ALL_STATUSES.map((s) => (
          <FilterChip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={statusFilter === s} onPress={() => onStatusChange(s)} />
        ))}
      </ScrollView>
      {/* Trip filter */}
      {trips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
          <FilterChip label="All Trips" active={tripFilter === ''} onPress={() => onTripChange('')} />
          {trips.map((t) => (
            <FilterChip key={t.id} label={t.name} active={tripFilter === t.id} onPress={() => onTripChange(t.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function ExpenseCard({ expense, tripName }: { expense: Expense; tripName?: string }) {
  const relevance = expense.reimbursementRelevance;
  const relColors = relevance ? RELEVANCE_COLORS[relevance] : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => router.push(`/expense/${expense.id}`)}
    >
      <View style={styles.itemLeft}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemTitle} numberOfLines={1}>{expense.title}</Text>
          {relColors && (
            <View style={[styles.relBadge, { backgroundColor: relColors.bg }]}>
              <Text style={[styles.relBadgeText, { color: relColors.text }]}>{relevance}</Text>
            </View>
          )}
          {expense.isReviewed && <Text style={styles.reviewedDot}>✓</Text>}
        </View>
        <Text style={styles.itemMeta}>{expense.date} · {expense.category}</Text>
        {tripName && <Text style={styles.itemMeta}>Trip: {tripName}</Text>}
        <View style={styles.itemBadge}>
          <StatusBadge status={expense.status} />
        </View>
      </View>
      <Text style={styles.itemAmount}>{expense.currency} {expense.amount.toFixed(2)}</Text>
    </Pressable>
  );
}

// ─── Desktop table ────────────────────────────────────────────────────────────

function TableHeaderRow() {
  return (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.th, { width: W.date }]}>Date</Text>
      <Text style={[styles.th, styles.thFlex]}>Title</Text>
      <Text style={[styles.th, { width: W.amount, textAlign: 'right' }]}>Amount</Text>
      <Text style={[styles.th, { width: W.relevance, textAlign: 'center' }]}>Relevance</Text>
      <Text style={[styles.th, { width: W.reviewed, textAlign: 'center' }]}>Done</Text>
      <Text style={[styles.th, { width: W.trip }]}>Trip</Text>
      <Text style={[styles.th, { width: W.receipt, textAlign: 'center' }]}>Rcpt</Text>
      <Text style={[styles.th, { width: W.status }]}>Status</Text>
    </View>
  );
}

function TableRow({
  expense,
  trips,
  onAssignTrip,
  onToggleReviewed,
  onCycleRelevance,
}: {
  expense: Expense;
  trips: { id: string; name: string }[];
  onAssignTrip: (id: string, tripId: string | null) => void;
  onToggleReviewed: (id: string, val: boolean) => void;
  onCycleRelevance: (id: string, next: ReimbursementRelevance | null) => void;
}) {
  const relevance = expense.reimbursementRelevance;
  const relColors = relevance ? RELEVANCE_COLORS[relevance] : null;

  const displayAmount = expense.chargedAmount != null
    ? `${expense.chargedCurrency ?? expense.currency} ${expense.chargedAmount.toFixed(2)}`
    : `${expense.currency} ${expense.amount.toFixed(2)}`;

  const foreignLine = expense.originalAmount != null && expense.originalCurrency && expense.originalCurrency !== (expense.chargedCurrency ?? expense.currency)
    ? `${expense.originalCurrency} ${expense.originalAmount.toFixed(2)}`
    : null;

  return (
    <View style={[styles.tableRow, expense.isReviewed && styles.tableRowReviewed]}>
      {/* Date — navigate on press */}
      <Pressable
        style={[styles.tdCell, { width: W.date }]}
        onPress={() => router.push(`/expense/${expense.id}`)}
      >
        <Text style={styles.td}>{expense.date}</Text>
      </Pressable>

      {/* Title — navigate on press */}
      <Pressable
        style={[styles.tdCell, styles.tdFlex]}
        onPress={() => router.push(`/expense/${expense.id}`)}
      >
        <Text style={styles.td} numberOfLines={1}>{expense.title}</Text>
        {expense.isInstallment && expense.installmentIndex != null && (
          <Text style={styles.tdSub}>{expense.installmentIndex}/{expense.installmentTotal}</Text>
        )}
      </Pressable>

      {/* Amount */}
      <Pressable
        style={[styles.tdCell, { width: W.amount, alignItems: 'flex-end' }]}
        onPress={() => router.push(`/expense/${expense.id}`)}
      >
        <Text style={styles.td}>{displayAmount}</Text>
        {foreignLine && <Text style={styles.tdSub}>{foreignLine}</Text>}
      </Pressable>

      {/* Relevance — cycles on tap */}
      <Pressable
        style={[styles.tdCell, { width: W.relevance, alignItems: 'center', justifyContent: 'center' }]}
        onPress={() => onCycleRelevance(expense.id, nextRelevance(relevance))}
      >
        {relColors ? (
          <View style={[styles.relChip, { backgroundColor: relColors.bg }]}>
            <Text style={[styles.relChipText, { color: relColors.text }]}>{relevance}</Text>
          </View>
        ) : (
          <Text style={styles.relEmpty}>—</Text>
        )}
      </Pressable>

      {/* Reviewed toggle */}
      <Pressable
        style={[styles.tdCell, { width: W.reviewed, alignItems: 'center', justifyContent: 'center' }]}
        onPress={() => onToggleReviewed(expense.id, !expense.isReviewed)}
      >
        <View style={[styles.reviewBtn, expense.isReviewed && styles.reviewBtnOn]}>
          <Text style={[styles.reviewBtnText, expense.isReviewed && styles.reviewBtnTextOn]}>✓</Text>
        </View>
      </Pressable>

      {/* Trip select */}
      <View style={[styles.tdCell, { width: W.trip }]}>
        {Platform.OS === 'web' ? (
          React.createElement('select', {
            value: expense.workTripId ?? '',
            onChange: (e: any) => onAssignTrip(expense.id, e.target.value || null),
            style: {
              fontSize: 12, border: '1px solid #D1D5DB', borderRadius: 6,
              padding: '3px 4px', backgroundColor: '#fff', color: '#111827',
              width: '100%', cursor: 'pointer',
            },
          },
            React.createElement('option', { key: '', value: '' }, '— None —'),
            ...trips.map((t) =>
              React.createElement('option', { key: t.id, value: t.id }, t.name),
            ),
          )
        ) : (
          <Text style={styles.td} numberOfLines={1}>
            {expense.workTripId ? (trips.find((t) => t.id === expense.workTripId)?.name ?? '—') : '—'}
          </Text>
        )}
      </View>

      {/* Receipt */}
      <Pressable
        style={[styles.tdCell, { width: W.receipt, alignItems: 'center', justifyContent: 'center' }]}
        onPress={() => router.push(`/expense/${expense.id}`)}
      >
        <Text style={expense.hasReceipt ? styles.receiptYes : styles.receiptNo}>
          {expense.hasReceipt ? '✓' : '✗'}
        </Text>
      </Pressable>

      {/* Status */}
      <View style={[styles.tdCell, { width: W.status }]}>
        <StatusBadge status={expense.status} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { status: initialStatus } = useLocalSearchParams<{ status?: string }>();

  const expenses           = useExpenseStore((s) => s.expenses);
  const isLoading          = useExpenseStore((s) => s.isLoading);
  const assignExpenseToTrip = useExpenseStore((s) => s.assignExpenseToTrip);
  const markReviewed       = useExpenseStore((s) => s.markReviewed);
  const setRelevance       = useExpenseStore((s) => s.setRelevance);
  const trips              = useTripStore((s) => s.trips);
  const batches            = useBatchStore((s) => s.batches);

  const [search,          setSearch]          = useState('');
  const [statusFilter,    setStatusFilter]    = useState<ExpenseStatus | ''>(
    (ALL_STATUSES as string[]).includes(initialStatus ?? '') ? (initialStatus as ExpenseStatus) : '',
  );
  const [tripFilter,      setTripFilter]      = useState('');
  const [reviewedFilter,  setReviewedFilter]  = useState<'' | 'reviewed' | 'unreviewed'>('');
  const [relevanceFilter, setRelevanceFilter] = useState<ReimbursementRelevance | ''>('');

  const tripMap  = useMemo(() => new Map(trips.map((t) => [t.id, t.name])), [trips]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (statusFilter    && e.status !== statusFilter) return false;
      if (tripFilter      && e.workTripId !== tripFilter) return false;
      if (reviewedFilter === 'reviewed'   && !e.isReviewed) return false;
      if (reviewedFilter === 'unreviewed' && e.isReviewed) return false;
      if (relevanceFilter && e.reimbursementRelevance !== relevanceFilter) return false;
      if (q && !e.title.toLowerCase().includes(q) && !(e.notes ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [expenses, search, statusFilter, tripFilter, reviewedFilter, relevanceFilter]);

  function handleAssignTrip(id: string, tripId: string | null) {
    assignExpenseToTrip(id, tripId);
  }
  function handleToggleReviewed(id: string, val: boolean) {
    markReviewed(id, val);
  }
  function handleCycleRelevance(id: string, next: ReimbursementRelevance | null) {
    setRelevance(id, next);
  }

  const filterProps = {
    search, onSearchChange: setSearch,
    statusFilter, onStatusChange: setStatusFilter,
    tripFilter, onTripChange: setTripFilter,
    reviewedFilter, onReviewedChange: setReviewedFilter,
    relevanceFilter, onRelevanceChange: setRelevanceFilter,
    trips,
  };

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />;
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <View style={styles.desktopTop}>
          <Text style={styles.desktopHeading}>Expenses</Text>
          <Link href="/add-expense" asChild>
            <Pressable style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}>
              <Text style={styles.addBtnText}>+ Add Expense</Text>
            </Pressable>
          </Link>
        </View>

        <MetricsPanel expenses={expenses} />
        <Filters {...filterProps} />
        <TableHeaderRow />

        <ScrollView style={styles.tableScroll}>
          {filtered.length === 0 ? (
            <View style={styles.emptyTable}>
              <Text style={styles.emptyTitle}>No expenses match the current filters</Text>
            </View>
          ) : (
            filtered.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <View style={styles.separator} />}
                <TableRow
                  expense={item}
                  trips={trips}
                  onAssignTrip={handleAssignTrip}
                  onToggleReviewed={handleToggleReviewed}
                  onCycleRelevance={handleCycleRelevance}
                />
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Mobile ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.mobileContainer}>
      <Filters {...filterProps} />
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            tripName={item.workTripId ? tripMap.get(item.workTripId) : undefined}
          />
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No expenses</Text>
            <Text style={styles.emptySubtitle}>Tap the button below to add one</Text>
          </View>
        }
      />
      <Link href="/add-expense" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.addBtnText}>+ Add Expense</Text>
        </Pressable>
      </Link>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loader: { flex: 1 },

  // ── Metrics ───────────────────────────────────────────────────────────────
  metrics: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  metricLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // ── Filters ───────────────────────────────────────────────────────────────
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  chipRow: { marginBottom: 8 },
  chipRowContent: { gap: 6, paddingRight: 4 },
  chip: {
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  // ── Desktop ───────────────────────────────────────────────────────────────
  desktopContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  desktopTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16,
  },
  desktopHeading: { fontSize: 26, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  addBtnPressed: { backgroundColor: '#1D4ED8' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Table
  tableHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  th: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  thFlex: { flex: 1 },
  tableScroll: { flex: 1, backgroundColor: '#fff' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: '#fff',
  },
  tableRowReviewed: { backgroundColor: '#F0FDF4' },
  tdCell: { justifyContent: 'center', paddingHorizontal: 4 },
  td: { fontSize: 13, color: '#111827' },
  tdSub: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  tdFlex: { flex: 1 },
  emptyTable: { paddingVertical: 48, alignItems: 'center' },

  // Relevance chip
  relChip: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  relChipText: { fontSize: 11, fontWeight: '700' },
  relEmpty: { fontSize: 13, color: '#D1D5DB' },

  // Reviewed button
  reviewBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  reviewBtnOn: { backgroundColor: '#059669', borderColor: '#059669' },
  reviewBtnText: { fontSize: 14, color: '#9CA3AF', fontWeight: '700' },
  reviewBtnTextOn: { color: '#fff' },

  // Receipt
  receiptYes: { fontSize: 14, color: '#059669', fontWeight: '700' },
  receiptNo: { fontSize: 14, color: '#EF4444' },

  // ── Mobile ─────────────────────────────────────────────────────────────────
  mobileContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { flex: 1 },
  listContent: { paddingVertical: 8 },
  emptyContainer: { flex: 1 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
  },
  itemPressed: { backgroundColor: '#f0f4ff' },
  itemLeft: { flex: 1, marginRight: 12 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#111', flexShrink: 1 },
  itemMeta: { fontSize: 13, color: '#888', marginTop: 2, textTransform: 'capitalize' },
  itemBadge: { marginTop: 6 },
  itemAmount: { fontSize: 16, fontWeight: '700', color: '#111' },
  relBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  relBadgeText: { fontSize: 10, fontWeight: '700' },
  reviewedDot: { fontSize: 14, color: '#059669', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#555' },
  emptySubtitle: { fontSize: 14, color: '#999', marginTop: 6 },
  fab: {
    margin: 16, backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 15, alignItems: 'center',
  },

  // Shared
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e5e5' },
});
