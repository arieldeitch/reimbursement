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
import type { BatchStatus, ReimbursementBatch } from '@/types/batch';

const STATUS_OPTIONS: { value: BatchStatus; label: string }[] = [
  { value: 'draft',     label: 'Draft'     },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved',  label: 'Approved'  },
  { value: 'paid',      label: 'Paid'      },
];

export default function EditBatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getBatchById = useBatchStore((s) => s.getBatchById);
  const updateBatch  = useBatchStore((s) => s.updateBatch);

  const [original, setOriginal] = useState<ReimbursementBatch | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [name, setName]     = useState('');
  const [notes, setNotes]   = useState('');
  const [status, setStatus] = useState<BatchStatus>('draft');

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    getBatchById(id)
      .then((found) => {
        if (found) {
          setOriginal(found);
          setName(found.name);
          setNotes(found.notes ?? '');
          setStatus(found.status);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, getBatchById]);

  const isValid = name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || !original) return;
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await updateBatch({
        ...original,
        name: name.trim(),
        notes: notes.trim() || undefined,
        status,
        submittedAt: status === 'submitted' && !original.submittedAt ? now : original.submittedAt,
        approvedAt:  status === 'approved'  && !original.approvedAt  ? now : original.approvedAt,
        paidAt:      status === 'paid'      && !original.paidAt      ? now : original.paidAt,
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
        <Text style={styles.notFoundText}>Batch not found</Text>
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
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. March 2025 Expenses"
          placeholderTextColor="#aaa"
          returnKeyType="next"
        />

        <Text style={styles.label}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, status === opt.value && styles.chipActive]}
              onPress={() => setStatus(opt.value)}
            >
              <Text style={[styles.chipText, status === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
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
  notesInput: {
    height: 88,
    paddingTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
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
