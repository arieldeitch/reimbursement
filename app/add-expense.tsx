import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
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

import { DateField } from '@/components/DateField';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type PaymentMethod,
} from '@/types/expense';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddExpenseScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const addExpense = useExpenseStore((s) => s.addExpense);
  const trips      = useTripStore((s) => s.trips);

  const preselectedTrip = tripId ? trips.find((t) => t.id === tripId) : undefined;

  const [title, setTitle]             = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('USD');
  const [date, setDate]               = useState(todayISO);
  const [category, setCategory]       = useState<ExpenseCategory>('other');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('personal_card');
  const [notes, setNotes]             = useState('');
  const [hasReceipt, setHasReceipt]   = useState(true);
  const [saving, setSaving]           = useState(false);

  const isValid = title.trim().length > 0 && parseFloat(amount) > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await addExpense({
        title: title.trim(),
        amount: parseFloat(amount),
        currency: currency.trim().toUpperCase() || 'USD',
        date,
        category,
        paymentMethod,
        notes: notes.trim() || undefined,
        workTripId: tripId ?? undefined,
        hasReceipt,
      });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {preselectedTrip && (
          <View style={styles.tripBanner}>
            <Text style={styles.tripBannerText}>Trip: {preselectedTrip.name}</Text>
          </View>
        )}

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

        <DateField label="Date" value={date} onChange={setDate} />

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
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Expense'}</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ACCENT = '#2563EB';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  tripBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  tripBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
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
  chipMissing: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  chipMissingText: {
    color: '#D97706',
    fontWeight: '600',
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
