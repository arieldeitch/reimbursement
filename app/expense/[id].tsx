import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useExpenseStore } from '@/store/expenseSlice';
import type { Expense } from '@/types/expense';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  personal_card: 'Personal Card',
  company_card: 'Company Card',
  cash: 'Cash',
  other: 'Other',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getExpenseById = useExpenseStore((s) => s.getExpenseById);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const found = await getExpenseById(id);
        if (found) {
          setExpense(found);
        } else {
          setNotFound(true);
        }
      } catch (e) {
        console.error('Failed to load expense:', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getExpenseById]);

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
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.title}>{expense.title}</Text>
      <Text style={styles.amount}>{expense.currency} {expense.amount.toFixed(2)}</Text>

      <View style={styles.divider} />

      <Field label="Date" value={expense.date} />
      <Field label="Category" value={capitalize(expense.category)} />
      <Field label="Payment Method" value={PAYMENT_METHOD_LABELS[expense.paymentMethod] ?? expense.paymentMethod} />
      <Field label="Status" value={capitalize(expense.status)} />
      {expense.notes ? <Field label="Notes" value={expense.notes} /> : null}

      <View style={styles.divider} />

      <View style={styles.primaryActions}>
        <Pressable
          style={[styles.button, styles.outlineButton]}
          onPress={() => Alert.alert('Coming soon', 'Edit will be available in the next phase.')}
        >
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Edit</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.outlineButton]}
          onPress={() => Alert.alert('Coming soon', 'Status change will be available in the next phase.')}
        >
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Change Status</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, styles.dangerButton]}
        onPress={() => Alert.alert('Coming soon', 'Delete will be available in the next phase.')}
      >
        <Text style={[styles.buttonText, styles.dangerButtonText]}>Delete</Text>
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
  outlineButtonText: {
    color: '#2563EB',
  },
  dangerButton: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  dangerButtonText: {
    color: '#DC2626',
  },
});
