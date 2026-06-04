import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';
import type { Expense, ExpenseStatus } from '@/types/expense';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  personal_card: 'Personal Card',
  company_card:  'Company Card',
  cash:          'Cash',
  other:         'Other',
};

const STATUS_OPTIONS: { value: ExpenseStatus; label: string }[] = [
  { value: 'unsubmitted', label: 'Unsubmitted' },
  { value: 'submitted',   label: 'Submitted' },
  { value: 'approved',    label: 'Approved' },
  { value: 'paid',        label: 'Paid' },
  { value: 'rejected',    label: 'Rejected' },
];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

function LinkField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
      onPress={onPress}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldLinkRow}>
        <Text style={[styles.fieldValue, styles.fieldLinkValue]}>{value || '—'}</Text>
        <Text style={styles.fieldLinkChevron}>›</Text>
      </View>
    </Pressable>
  );
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getExpenseById  = useExpenseStore((s) => s.getExpenseById);
  const updateExpense   = useExpenseStore((s) => s.updateExpense);
  const deleteExpense   = useExpenseStore((s) => s.deleteExpense);
  const trips           = useTripStore((s) => s.trips);
  const batches         = useBatchStore((s) => s.batches);

  const [expense, setExpense]               = useState<Expense | null>(null);
  const [loading, setLoading]               = useState(true);
  const [notFound, setNotFound]             = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [deleting, setDeleting]             = useState(false);

  // Reload on every focus so the screen reflects edits made on the edit screen.
  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      getExpenseById(id)
        .then((found) => {
          if (found) {
            setExpense(found);
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
    }, [id, getExpenseById]),
  );

  const handleEdit = () => {
    if (!expense) return;
    router.push({ pathname: '/edit-expense', params: { id: expense.id } });
  };

  const handleStatusChange = async (newStatus: ExpenseStatus) => {
    if (!expense) return;
    setChangingStatus(true);
    try {
      await updateExpense({ ...expense, status: newStatus });
      setExpense((prev) => prev ? { ...prev, status: newStatus } : prev);
      setShowStatusPicker(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDelete = () => {
    if (!expense) return;
    Alert.alert(
      'Delete Expense',
      `Remove "${expense.title}" from your list? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpense(expense.id);
              router.back();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
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

  if (notFound || !expense) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Expense not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.title}>{expense.title}</Text>
      <Text style={styles.amount}>{expense.currency} {expense.amount.toFixed(2)}</Text>
      <View style={styles.badgeRow}>
        <StatusBadge status={expense.status} />
      </View>

      <View style={styles.divider} />

      <Field label="Date" value={expense.date} />
      <Field
        label="Category"
        value={expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
      />
      <Field
        label="Payment Method"
        value={PAYMENT_METHOD_LABELS[expense.paymentMethod] ?? expense.paymentMethod}
      />
      {expense.workTripId && (
        <LinkField
          label="Trip"
          value={trips.find((t) => t.id === expense.workTripId)?.name ?? '—'}
          onPress={() => router.push(`/trip/${expense.workTripId}`)}
        />
      )}
      {expense.reimbursementBatchId && (
        <LinkField
          label="Batch"
          value={batches.find((b) => b.id === expense.reimbursementBatchId)?.name ?? '—'}
          onPress={() => router.push(`/batch/${expense.reimbursementBatchId}`)}
        />
      )}
      {expense.notes ? <Field label="Notes" value={expense.notes} /> : null}

      <View style={styles.divider} />

      {/* Action buttons */}
      <View style={styles.primaryActions}>
        <Pressable
          style={[styles.button, styles.outlineButton]}
          onPress={handleEdit}
        >
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Edit</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.outlineButton, showStatusPicker && styles.outlineButtonActive]}
          onPress={() => setShowStatusPicker((v) => !v)}
        >
          <Text style={[
            styles.buttonText,
            styles.outlineButtonText,
            showStatusPicker && styles.outlineButtonTextActive,
          ]}>
            Change Status
          </Text>
        </Pressable>
      </View>

      {/* Inline status picker */}
      {showStatusPicker && (
        <View style={styles.statusPicker}>
          {STATUS_OPTIONS.map((opt) => {
            const isCurrent = expense.status === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.statusOption, isCurrent && styles.statusOptionCurrent]}
                onPress={() => handleStatusChange(opt.value)}
                disabled={changingStatus || isCurrent}
              >
                <StatusBadge status={opt.value} />
                {isCurrent && <Text style={styles.statusOptionTick}> ✓</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.button, styles.dangerButton, deleting && styles.dangerButtonDisabled]}
        onPress={handleDelete}
        disabled={deleting}
      >
        <Text style={[styles.buttonText, styles.dangerButtonText]}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Text>
      </Pressable>

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
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 4,
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
  fieldPressed: {
    backgroundColor: '#f0f4ff',
    borderRadius: 6,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  fieldLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLinkValue: {
    color: '#2563EB',
  },
  fieldLinkChevron: {
    fontSize: 20,
    color: '#2563EB',
    lineHeight: 22,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  outlineButtonActive: {
    backgroundColor: '#2563EB',
  },
  outlineButtonText: {
    color: '#2563EB',
  },
  outlineButtonTextActive: {
    color: '#fff',
  },
  dangerButton: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
    marginTop: 0,
  },
  dangerButtonDisabled: {
    borderColor: '#fca5a5',
  },
  dangerButtonText: {
    color: '#DC2626',
  },
  statusPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 4,
    opacity: 1,
  },
  statusOptionCurrent: {
    opacity: 0.6,
  },
  statusOptionTick: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
  },
});
