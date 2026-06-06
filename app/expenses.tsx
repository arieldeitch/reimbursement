import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import type { Expense, ExpenseStatus } from '@/types/expense';

const ALL_STATUSES: ExpenseStatus[] = ['unsubmitted', 'submitted', 'approved', 'paid', 'rejected'];

// ─── Column widths ────────────────────────────────────────────────────────────
const W = {
  date:     82,
  category: 105,
  amount:   76,
  currency: 54,
  status:   108,
  trip:     110,
  batch:    110,
  receipt:  58,
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Filters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  tripFilter,
  onTripChange,
  batchFilter,
  onBatchChange,
  trips,
  batches,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: ExpenseStatus | '';
  onStatusChange: (v: ExpenseStatus | '') => void;
  tripFilter: string;
  onTripChange: (v: string) => void;
  batchFilter: string;
  onBatchChange: (v: string) => void;
  trips: { id: string; name: string }[];
  batches: { id: string; name: string }[];
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipRowContent}
      >
        <FilterChip label="All" active={statusFilter === ''} onPress={() => onStatusChange('')} />
        {ALL_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            active={statusFilter === s}
            onPress={() => onStatusChange(s)}
          />
        ))}
      </ScrollView>
      {trips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipRowContent}
        >
          <FilterChip label="All Trips" active={tripFilter === ''} onPress={() => onTripChange('')} />
          {trips.map((t) => (
            <FilterChip
              key={t.id}
              label={t.name}
              active={tripFilter === t.id}
              onPress={() => onTripChange(t.id)}
            />
          ))}
        </ScrollView>
      )}
      {batches.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipRowContent}
        >
          <FilterChip label="All Batches" active={batchFilter === ''} onPress={() => onBatchChange('')} />
          {batches.map((b) => (
            <FilterChip
              key={b.id}
              label={b.name}
              active={batchFilter === b.id}
              onPress={() => onBatchChange(b.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function ExpenseCard({
  expense,
  tripName,
  batchName,
}: {
  expense: Expense;
  tripName?: string;
  batchName?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => router.push(`/expense/${expense.id}`)}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemTitle} numberOfLines={1}>{expense.title}</Text>
        <Text style={styles.itemMeta}>{expense.date} · {expense.category}</Text>
        {tripName  && <Text style={styles.itemMeta}>Trip: {tripName}</Text>}
        {batchName && <Text style={styles.itemMeta}>Batch: {batchName}</Text>}
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
      <Text style={[styles.th, { width: W.category }]}>Category</Text>
      <Text style={[styles.th, { width: W.amount, textAlign: 'right' }]}>Amount</Text>
      <Text style={[styles.th, { width: W.currency }]}>Curr.</Text>
      <Text style={[styles.th, { width: W.status }]}>Status</Text>
      <Text style={[styles.th, { width: W.trip }]}>Trip</Text>
      <Text style={[styles.th, { width: W.receipt }]}>Receipt</Text>
    </View>
  );
}

function TableRow({
  expense,
  tripName,
}: {
  expense: Expense;
  tripName?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tableRow, pressed && styles.tableRowPressed]}
      onPress={() => router.push(`/expense/${expense.id}`)}
    >
      <Text style={[styles.td, { width: W.date }]}>{expense.date}</Text>
      <Text style={[styles.td, styles.tdFlex]} numberOfLines={1}>{expense.title}</Text>
      <Text style={[styles.td, { width: W.category, textTransform: 'capitalize' }]} numberOfLines={1}>
        {expense.category}
      </Text>
      <Text style={[styles.td, { width: W.amount, textAlign: 'right' }]}>{expense.amount.toFixed(2)}</Text>
      <Text style={[styles.td, { width: W.currency }]}>{expense.currency}</Text>
      <View style={{ width: W.status, justifyContent: 'center' }}>
        <StatusBadge status={expense.status} />
      </View>
      <Text style={[styles.td, { width: W.trip }]} numberOfLines={1}>{tripName ?? '—'}</Text>
      <Text style={[styles.td, { width: W.receipt }]}>{expense.hasReceipt ? 'Yes' : 'No'}</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { status: initialStatus } = useLocalSearchParams<{ status?: string }>();

  const expenses  = useExpenseStore((s) => s.expenses);
  const isLoading = useExpenseStore((s) => s.isLoading);
  const trips     = useTripStore((s) => s.trips);
  const batches   = useBatchStore((s) => s.batches);

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>(
    (ALL_STATUSES as string[]).includes(initialStatus ?? '') ? (initialStatus as ExpenseStatus) : '',
  );
  const [tripFilter,  setTripFilter]  = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  const tripMap  = useMemo(() => new Map(trips.map((t) => [t.id, t.name])),   [trips]);
  const batchMap = useMemo(() => new Map(batches.map((b) => [b.id, b.name])), [batches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (statusFilter && e.status !== statusFilter) return false;
      if (tripFilter   && e.workTripId !== tripFilter) return false;
      if (batchFilter  && e.reimbursementBatchId !== batchFilter) return false;
      if (q && !e.title.toLowerCase().includes(q) && !(e.notes ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [expenses, search, statusFilter, tripFilter, batchFilter]);

  const filterProps = {
    search,
    onSearchChange: setSearch,
    statusFilter,
    onStatusChange: setStatusFilter,
    tripFilter,
    onTripChange:   setTripFilter,
    batchFilter,
    onBatchChange:  setBatchFilter,
    trips,
    batches,
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
                  tripName={item.workTripId ? tripMap.get(item.workTripId) : undefined}
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
            batchName={item.reimbursementBatchId ? batchMap.get(item.reimbursementBatchId) : undefined}
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

  // ── Filters ──────────────────────────────────────────────────────────────
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
  chipRow: {
    marginBottom: 8,
  },
  chipRowContent: {
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },

  // ── Desktop ───────────────────────────────────────────────────────────────
  desktopContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  desktopTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  desktopHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  addBtnPressed: {
    backgroundColor: '#1D4ED8',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Table
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thFlex: {
    flex: 1,
  },
  tableScroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#fff',
  },
  tableRowPressed: {
    backgroundColor: '#EFF6FF',
  },
  td: {
    fontSize: 13,
    color: '#111827',
  },
  tdFlex: {
    flex: 1,
  },
  emptyTable: {
    paddingVertical: 48,
    alignItems: 'center',
  },

  // ── Mobile ─────────────────────────────────────────────────────────────────
  mobileContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemPressed: {
    backgroundColor: '#f0f4ff',
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  itemMeta: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  itemBadge: {
    marginTop: 6,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
  },
  fab: {
    margin: 16,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },

  // Shared
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5e5',
  },
});
