import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { getDatabase } from '@/db/client';
import { initExpenseRepository } from '@/repositories/expenseRepository';
import { initTripRepository } from '@/repositories/tripRepository';
import { useAppStore } from '@/store';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';

export default function RootLayout() {
  const setDbReady   = useAppStore((s) => s.setDbReady);
  const loadExpenses = useExpenseStore((s) => s.loadExpenses);
  const loadTrips    = useTripStore((s) => s.loadTrips);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        initExpenseRepository(db);
        initTripRepository(db);
        await loadExpenses();
        await loadTrips();
        setDbReady(true);
      } catch (e) {
        console.error('Boot error:', e);
        Alert.alert('Startup Error', 'The app failed to initialize. Please restart and try again.');
      }
    })();
  }, [setDbReady, loadExpenses, loadTrips]);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Expenses',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/trips')}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Trips</Text>
            </Pressable>
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
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
});
