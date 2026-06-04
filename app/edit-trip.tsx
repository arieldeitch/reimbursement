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

import { useTripStore } from '@/store/tripSlice';
import type { TripStatus, WorkTrip } from '@/types/trip';

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'open',   label: 'Open'   },
  { value: 'closed', label: 'Closed' },
];

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getTripById = useTripStore((s) => s.getTripById);
  const updateTrip  = useTripStore((s) => s.updateTrip);

  const [original, setOriginal]       = useState<WorkTrip | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  const [name, setName]               = useState('');
  const [destination, setDestination] = useState('');
  const [client, setClient]           = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [notes, setNotes]             = useState('');
  const [status, setStatus]           = useState<TripStatus>('open');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getTripById(id)
      .then((found) => {
        if (found) {
          setOriginal(found);
          setName(found.name);
          setDestination(found.destination);
          setClient(found.client ?? '');
          setStartDate(found.startDate);
          setEndDate(found.endDate);
          setNotes(found.notes ?? '');
          setStatus(found.status);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, getTripById]);

  const isValid =
    name.trim().length > 0 &&
    destination.trim().length > 0 &&
    startDate.trim().length > 0 &&
    endDate.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || !original) return;
    setSaving(true);
    try {
      await updateTrip({
        ...original,
        name: name.trim(),
        destination: destination.trim(),
        client: client.trim() || undefined,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        notes: notes.trim() || undefined,
        status,
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
        <Text style={styles.notFoundText}>Trip not found</Text>
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
          <View style={styles.flex}>
            <Text style={styles.label}>Start Date *</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#aaa"
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>End Date *</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#aaa"
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
            />
          </View>
        </View>

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
  chipRow: {
    flexDirection: 'row',
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
