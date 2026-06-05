import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type Expense,
  type ExpenseCategory,
  type PaymentMethod,
} from '@/types/expense';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getExpenseById = useExpenseStore((s) => s.getExpenseById);
  const updateExpense  = useExpenseStore((s) => s.updateExpense);
  const trips          = useTripStore((s) => s.trips);
  const batches        = useBatchStore((s) => s.batches);

  const [original, setOriginal] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('personal_card');
  const [notes, setNotes]                       = useState('');
  const [workTripId, setWorkTripId]             = useState<string | undefined>(undefined);
  const [reimbursementBatchId, setReimbursementBatchId] = useState<string | undefined>(undefined);
  const [hasReceipt, setHasReceipt]                     = useState(false);
  const [receiptMissingReason, setReceiptMissingReason] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getExpenseById(id).then((found) => {
      if (found) {
        setOriginal(found);
        setTitle(found.title);
        setAmount(found.amount.toString());
        setCurrency(found.currency);
        setDate(found.date);
        setCategory(found.category);
        setPaymentMethod(found.paymentMethod);
        setNotes(found.notes ?? '');
        setWorkTripId(found.workTripId);
        setReimbursementBatchId(found.reimbursementBatchId);
        setHasReceipt(found.hasReceipt);
        setReceiptMissingReason(found.receiptMissingReason ?? '');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, getExpenseById]);

  const isValid = title.trim().length > 0 && parseFloat(amount) > 0;

  const handleSave = async () => {
    if (!isValid || !original) return;
    setSaving(true);
    try {
      await updateExpense({
        ...original,
        title: title.trim(),
        amount: parseFloat(amount),
        currency: currency.trim().toUpperCase() || 'USD',
        date,
        category,
        paymentMethod,
        notes: notes.trim() || undefined,
        hasReceipt,
        receiptMissingReason: !hasReceipt && receiptMissingReason.trim() ? receiptMissingReason.trim() : undefined,
        workTripId,
        reimbursementBatchId,
      });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!original) {
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Team lunch"
          placeholderTextColor="#aaa"
          returnKeyType="next"
        />

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>
          <View style={styles.currencyWrap}>
            <Text style={styles.label}>Currency</Text>
            <TextInput
              style={[styles.input, styles.currencyInput]}
              value={currency}
              onChangeText={setCurrency}
              placeholder="USD"
              placeholderTextColor="#aaa"
              maxLength={3}
              autoCapitalize="characters"
              returnKeyType="next"
            />
          </View>
        </View>

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="2025-01-15"
          placeholderTextColor="#aaa"
          keyboardType="numbers-and-punctuation"
          returnKeyType="next"
        />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              style={[styles.chip, category === cat.value && styles.chipActive]}
              onPress={() => setCategory(cat.value)}
            >
              <Text style={[styles.chipText, category === cat.value && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Payment Method</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {PAYMENT_METHODS.map((pm) => (
            <Pressable
              key={pm.value}
              style={[styles.chip, paymentMethod === pm.value && styles.chipActive]}
              onPress={() => setPaymentMethod(pm.value)}
            >
              <Text style={[styles.chipText, paymentMethod === pm.value && styles.chipTextActive]}>
                {pm.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Trip (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <Pressable
            style={[styles.chip, !workTripId && styles.chipActive]}
            onPress={() => setWorkTripId(undefined)}
          >
            <Text style={[styles.chipText, !workTripId && styles.chipTextActive]}>None</Text>
          </Pressable>
          {trips.map((trip) => (
            <Pressable
              key={trip.id}
              style={[styles.chip, workTripId === trip.id && styles.chipActive]}
              onPress={() => setWorkTripId(trip.id)}
            >
              <Text
                style={[styles.chipText, workTripId === trip.id && styles.chipTextActive]}
                numberOfLines={1}
              >
                {trip.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Batch (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <Pressable
            style={[styles.chip, !reimbursementBatchId && styles.chipActive]}
            onPress={() => setReimbursementBatchId(undefined)}
          >
            <Text style={[styles.chipText, !reimbursementBatchId && styles.chipTextActive]}>None</Text>
          </Pressable>
          {batches.map((batch) => (
            <Pressable
              key={batch.id}
              style={[styles.chip, reimbursementBatchId === batch.id && styles.chipActive]}
              onPress={() => setReimbursementBatchId(batch.id)}
            >
              <Text
                style={[styles.chipText, reimbursementBatchId === batch.id && styles.chipTextActive]}
                numberOfLines={1}
              >
                {batch.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Receipt</Text>
        <View style={styles.receiptRow}>
          <Pressable
            style={[styles.chip, hasReceipt && styles.chipActive]}
            onPress={() => setHasReceipt(true)}
          >
            <Text style={[styles.chipText, hasReceipt && styles.chipTextActive]}>✓ Present</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, !hasReceipt && styles.chipMissing]}
            onPress={() => setHasReceipt(false)}
          >
            <Text style={[styles.chipText, !hasReceipt && styles.chipMissingText]}>⚠ Missing</Text>
          </Pressable>
        </View>

        {!hasReceipt && (
          <>
            <Text style={styles.label}>Missing Reason (optional)</Text>
            <TextInput
              style={styles.input}
              value={receiptMissingReason}
              onChangeText={setReceiptMissingReason}
              placeholder="e.g. Lost, digital only, pending"
              placeholderTextColor="#aaa"
            />
          </>
        )}

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional details..."
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.saveButton, (!isValid || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isValid || saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ACCENT = '#2563EB';

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  content: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyWrap: {
    width: 80,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  currencyInput: {
    textAlign: 'center',
  },
  notesInput: {
    height: 88,
    paddingTop: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    gap: 10,
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
  chipMissing: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  chipMissingText: {
    color: '#D97706',
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 32,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
