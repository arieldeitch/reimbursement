import { router } from 'expo-router';
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
} from 'react-native';

import { useBatchStore } from '@/store/batchSlice';

export default function AddBatchScreen() {
  const addBatch = useBatchStore((s) => s.addBatch);

  const [name, setName]     = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await addBatch({
        name: name.trim(),
        notes: notes.trim() || undefined,
        status: 'draft',
      });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save batch. Please try again.');
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

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. March 2025 Expenses"
          placeholderTextColor="#aaa"
          returnKeyType="next"
        />

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
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Batch'}</Text>
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
