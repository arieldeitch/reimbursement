import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useExpenseStore } from '@/store/expenseSlice';
import { totalsByCurrencyAndStatus } from '@/store/selectors';
import { useTripStore } from '@/store/tripSlice';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const expenses = useExpenseStore((s) => s.expenses);
  const trips    = useTripStore((s) => s.trips);

  const openTrips = useMemo(
    () => trips.filter((t) => t.status === 'open'),
    [trips],
  );

  const unsubmittedByCurrency = useMemo(
    () => totalsByCurrencyAndStatus(expenses, 'unsubmitted'),
    [expenses],
  );

  const unsubmittedCount = useMemo(
    () => expenses.filter((e) => e.status === 'unsubmitted').length,
    [expenses],
  );

  const expenseCountByTrip = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      if (e.workTripId) map[e.workTripId] = (map[e.workTripId] ?? 0) + 1;
    });
    return map;
  }, [expenses]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
    >
      <View style={[styles.container, isWide && styles.containerWide]}>

        <Text style={[styles.heading, isWide && styles.headingWide]}>Dashboard</Text>

        {/* Primary actions */}
        <View style={[styles.actionRow, isWide && styles.actionRowWide]}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => router.push('/add-trip')}
          >
            <Text style={styles.primaryBtnText}>+ Create Trip</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
            onPress={() => router.push('/import-csv')}
          >
            <Text style={styles.secondaryBtnText}>↑ Import CSV</Text>
          </Pressable>
        </View>

        {/* Open trips */}
        <Text style={styles.sectionLabel}>Continue a Trip</Text>
        {openTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No open trips. Create one to get started.</Text>
          </View>
        ) : (
          openTrips.slice(0, 5).map((trip) => {
            const count = expenseCountByTrip[trip.id] ?? 0;
            return (
              <Pressable
                key={trip.id}
                style={({ pressed }) => [styles.tripCard, pressed && styles.tripCardPressed]}
                onPress={() => router.push(`/trip/${trip.id}`)}
              >
                <View style={styles.tripCardBody}>
                  <Text style={styles.tripName} numberOfLines={1}>{trip.name}</Text>
                  <Text style={styles.tripMeta}>
                    {trip.destination}  ·  {trip.startDate} → {trip.endDate}
                  </Text>
                </View>
                <View style={styles.tripCountBadge}>
                  <Text style={styles.tripCountText}>{count}</Text>
                  <Text style={styles.tripCountLabel}>expense{count !== 1 ? 's' : ''}</Text>
                </View>
              </Pressable>
            );
          })
        )}
        {openTrips.length > 5 && (
          <Pressable onPress={() => router.push('/trips')}>
            <Text style={styles.viewAllLink}>View all {openTrips.length} open trips →</Text>
          </Pressable>
        )}

        {/* Pending summary */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Pending Reimbursement</Text>
        {unsubmittedCount === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No unsubmitted expenses.</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.summaryCard, pressed && styles.summaryCardPressed]}
            onPress={() => router.push('/expenses?status=unsubmitted')}
          >
            <View>
              {Object.entries(unsubmittedByCurrency)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([currency, amount]) => (
                  <Text key={currency} style={styles.summaryAmount}>
                    {currency} {amount.toFixed(2)}
                  </Text>
                ))}
              <Text style={styles.summaryCount}>
                {unsubmittedCount} unsubmitted expense{unsubmittedCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.summaryArrow}>→</Text>
          </Pressable>
        )}

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
    maxWidth: 720,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionRowWide: {
    gap: 16,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: '#1D4ED8',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: '#047857',
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionLabelSpaced: {
    marginTop: 28,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tripCardPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  tripCardBody: {
    flex: 1,
    marginRight: 12,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  tripMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  tripCountBadge: {
    alignItems: 'center',
    minWidth: 48,
  },
  tripCountText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
  },
  tripCountLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  viewAllLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryCardPressed: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  summaryCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryArrow: {
    fontSize: 20,
    color: '#D1D5DB',
    marginLeft: 'auto',
  },
});
