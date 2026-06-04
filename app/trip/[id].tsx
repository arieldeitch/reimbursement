import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { TripStatusBadge } from '@/components/TripStatusBadge';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';
import type { WorkTrip } from '@/types/trip';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getTripById = useTripStore((s) => s.getTripById);
  const deleteTrip  = useTripStore((s) => s.deleteTrip);
  const expenses    = useExpenseStore((s) => s.expenses);

  const [trip, setTrip]         = useState<WorkTrip | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      getTripById(id)
        .then((found) => {
          if (found) {
            setTrip(found);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
          setLoading(false);
        })
        .catch(() => {
          setNotFound(true);
          setLoading(false);
        });
    }, [id, getTripById]),
  );

  const tripExpenses = useMemo(
    () => (trip ? expenses.filter((e) => e.workTripId === trip.id) : []),
    [expenses, trip],
  );

  const expenseTotal    = useMemo(() => tripExpenses.reduce((sum, e) => sum + e.amount, 0), [tripExpenses]);
  const expenseCurrency = tripExpenses[0]?.currency ?? 'USD';

  const handleEdit = () => {
    if (!trip) return;
    router.push({ pathname: '/edit-trip', params: { id: trip.id } });
  };

  const handleDelete = () => {
    if (!trip) return;
    Alert.alert(
      'Delete Trip',
      `Remove "${trip.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteTrip(trip.id);
              router.back();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete trip. Please try again.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (notFound || !trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Trip not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.title}>{trip.name}</Text>
      <View style={styles.badgeRow}>
        <TripStatusBadge status={trip.status} />
      </View>

      <View style={styles.divider} />

      <Field label="Destination" value={trip.destination} />
      <Field label="Start Date"  value={trip.startDate} />
      <Field label="End Date"    value={trip.endDate} />
      {trip.client ? <Field label="Client" value={trip.client} /> : null}
      {trip.notes  ? <Field label="Notes"  value={trip.notes}  /> : null}

      <View style={styles.divider} />

      {/* Assigned Expenses */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Assigned Expenses{tripExpenses.length > 0 ? ` (${tripExpenses.length})` : ''}
        </Text>
        {tripExpenses.length > 0 && (
          <Text style={styles.sectionTotal}>
            {expenseCurrency} {expenseTotal.toFixed(2)}
          </Text>
        )}
      </View>

      {tripExpenses.length === 0 ? (
        <Text style={styles.noExpenses}>No expenses assigned to this trip.</Text>
      ) : (
        tripExpenses.map((expense) => (
          <Pressable
            key={expense.id}
            style={({ pressed }) => [styles.expenseRow, pressed && styles.expenseRowPressed]}
            onPress={() => router.push(`/expense/${expense.id}`)}
          >
            <View style={styles.expenseRowLeft}>
              <Text style={styles.expenseRowTitle} numberOfLines={1}>{expense.title}</Text>
              <View style={styles.expenseRowBadge}>
                <StatusBadge status={expense.status} />
              </View>
            </View>
            <Text style={styles.expenseRowAmount}>
              {expense.currency} {expense.amount.toFixed(2)}
            </Text>
          </Pressable>
        ))
      )}

      <View style={styles.divider} />

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.outlineButton]} onPress={handleEdit}>
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Edit</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.dangerButton, deleting && styles.dangerButtonDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={[styles.buttonText, styles.dangerButtonText]}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  badgeRow: {
    marginTop: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5e5',
    marginVertical: 20,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  noExpenses: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  expenseRowPressed: {
    backgroundColor: '#eff6ff',
  },
  expenseRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  expenseRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  expenseRowBadge: {
    marginTop: 4,
  },
  expenseRowAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  outlineButtonText: {
    color: '#2563EB',
  },
  dangerButton: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  dangerButtonDisabled: {
    borderColor: '#fca5a5',
  },
  dangerButtonText: {
    color: '#DC2626',
  },
});
