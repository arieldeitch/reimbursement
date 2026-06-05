import { Link } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { expenseSelectors } from '@/store/selectors';
import { useTripStore } from '@/store/tripSlice';

const STATUS_CARDS = [
  { key: 'unsubmitted' as const, label: 'Unsubmitted', accent: '#F59E0B', bg: '#FFFBEB' },
  { key: 'submitted'   as const, label: 'Submitted',   accent: '#3B82F6', bg: '#EFF6FF' },
  { key: 'approved'    as const, label: 'Approved',    accent: '#10B981', bg: '#ECFDF5' },
  { key: 'paid'        as const, label: 'Paid',        accent: '#0D9488', bg: '#F0FDFA' },
];

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const expenses = useExpenseStore((s) => s.expenses);
  const trips    = useTripStore((s) => s.trips);
  const batches  = useBatchStore((s) => s.batches);

  const stats = useMemo(() => ({
    unsubmitted: {
      total: expenseSelectors.totalUnsubmitted(expenses),
      count: expenseSelectors.countUnsubmitted(expenses),
    },
    submitted: {
      total: expenseSelectors.totalSubmitted(expenses),
      count: expenseSelectors.countSubmitted(expenses),
    },
    approved: {
      total: expenseSelectors.totalApproved(expenses),
      count: expenseSelectors.countApproved(expenses),
    },
    paid: {
      total: expenseSelectors.totalPaid(expenses),
      count: expenseSelectors.countPaid(expenses),
    },
  }), [expenses]);

  const openTrips    = useMemo(() => trips.filter((t) => t.status === 'open').length, [trips]);
  const draftBatches = useMemo(() => batches.filter((b) => b.status === 'draft').length, [batches]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
    >
      <View style={[styles.container, isWide && styles.containerWide]}>

        <Text style={[styles.heading, isWide && styles.headingWide]}>Dashboard</Text>

        <Text style={styles.sectionLabel}>Expense Overview</Text>
        <View style={styles.grid}>
          {STATUS_CARDS.map(({ key, label, accent, bg }) => {
            const s = stats[key];
            return (
              <View
                key={key}
                style={[styles.card, { backgroundColor: bg, borderLeftColor: accent }]}
              >
                <Text style={[styles.cardLabel, { color: accent }]}>{label}</Text>
                <Text style={styles.cardAmount}>{s.total.toFixed(2)}</Text>
                <Text style={styles.cardCount}>
                  {s.count} expense{s.count !== 1 ? 's' : ''}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Open Items</Text>
        <View style={styles.openRow}>
          <View style={[styles.openCard, isWide && styles.openCardWide]}>
            <Text style={styles.openCount}>{openTrips}</Text>
            <Text style={styles.openLabel}>open trip{openTrips !== 1 ? 's' : ''}</Text>
          </View>
          <View style={[styles.openCard, isWide && styles.openCardWide]}>
            <Text style={styles.openCount}>{draftBatches}</Text>
            <Text style={styles.openLabel}>draft batch{draftBatches !== 1 ? 'es' : ''}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actions}>
          <Link href="/expenses" asChild>
            <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
              <Text style={styles.actionText}>Expenses</Text>
            </Pressable>
          </Link>
          <Link href="/trips" asChild>
            <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
              <Text style={styles.actionText}>Trips</Text>
            </Pressable>
          </Link>
          <Link href="/batches" asChild>
            <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
              <Text style={styles.actionText}>Batches</Text>
            </Pressable>
          </Link>
        </View>

      </View>
    </ScrollView>
  );
}

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
    maxWidth: 900,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 24,
  },
  headingWide: {
    fontSize: 34,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  cardCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  openRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  openCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  openCardWide: {
    paddingVertical: 24,
  },
  openCount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },
  openLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionPressed: {
    backgroundColor: '#1D4ED8',
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
