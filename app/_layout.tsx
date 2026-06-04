import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDatabase } from '@/db/client';
import { initBatchRepository } from '@/repositories/batchRepository';
import { initExpenseRepository } from '@/repositories/expenseRepository';
import { initTripRepository } from '@/repositories/tripRepository';
import { useAppStore } from '@/store';
import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';

export default function RootLayout() {
  const setDbReady   = useAppStore((s) => s.setDbReady);
  const loadExpenses = useExpenseStore((s) => s.loadExpenses);
  const loadTrips    = useTripStore((s) => s.loadTrips);
  const loadBatches  = useBatchStore((s) => s.loadBatches);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        initExpenseRepository(db);
        initTripRepository(db);
        initBatchRepository(db);
        await loadExpenses();
        await loadTrips();
        await loadBatches();
        setDbReady(true);
      } catch (e) {
        console.error('Boot error:', e);
        Alert.alert('Startup Error', 'The app failed to initialize. Please restart and try again.');
      }
    })();
  }, [setDbReady, loadExpenses, loadTrips, loadBatches]);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Expenses',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable onPress={() => router.push('/trips')} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Trips</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/batches')} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Batches</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen name="add-expense" options={{ title: 'Add Expense', presentation: 'modal' }} />
      <Stack.Screen name="expense/[id]" options={{ title: 'Expense' }} />
      <Stack.Screen name="edit-expense" options={{ title: 'Edit Expense' }} />
      <Stack.Screen name="trips" options={{ title: 'Trips' }} />
      <Stack.Screen name="add-trip" options={{ title: 'New Trip', presentation: 'modal' }} />
      <Stack.Screen name="trip/[id]" options={{ title: 'Trip' }} />
      <Stack.Screen name="edit-trip" options={{ title: 'Edit Trip' }} />
      <Stack.Screen name="batches" options={{ title: 'Batches' }} />
      <Stack.Screen name="add-batch" options={{ title: 'New Batch', presentation: 'modal' }} />
      <Stack.Screen name="batch/[id]" options={{ title: 'Batch' }} />
      <Stack.Screen name="edit-batch" options={{ title: 'Edit Batch' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
});
