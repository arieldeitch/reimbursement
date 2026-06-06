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
  View,
} from 'react-native';

import { DateField } from '@/components/DateField';
import { useTripStore } from '@/store/tripSlice';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddTripScreen() {
  const addTrip = useTripStore((s) => s.addTrip);

  const [name, setName]               = useState('');
  const [destination, setDestination] = useState('');
  const [client, setClient]           = useState('');
  const [startDate, setStartDate]     = useState(todayISO);
  const [endDate, setEndDate]         = useState(todayISO);
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);

  const isValid =
    name.trim().length > 0 &&
    destination.trim().length > 0 &&
    startDate.trim().length > 0 &&
    endDate.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await addTrip({
        name: name.trim(),
        destination: destination.trim(),
        client: client.trim() || undefined,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        notes: notes.trim() || undefined,
        status: 'open',
      });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save trip. Please try again.');
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
          placeholder="e.g. HIMSS 2025"
          placeholderTextColor="#aaa"
          returnKeyType="next"
        />

        <Text style={styles.label}>Destination *</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="e.g. Chicago, IL"
          placeholderTextColor="#aaa"
          returnKeyType="next"
        />

        <Text style={styles.label}>Client (optional)</Text>
        <TextInput
          style={styles.input}
          value={client}
          onChangeText={setClient}
          placeholder="e.g. Acme Corp"
          placeholderTextColor="#aaa"
          returnKeyType="next"
        />

        <View style={styles.row}>
          <DateField
            label="Start Date *"
            value={startDate}
            onChange={setStartDate}
            containerStyle={styles.flex}
          />
          <DateField
            label="End Date *"
            value={endDate}
            onChange={setEndDate}
            containerStyle={styles.flex}
          />
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
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Trip'}</Text>
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
  row: {
    flexDirection: 'row',
    gap: 12,
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
