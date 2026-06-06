import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Sidebar } from '@/components/Sidebar';
import { getDatabase } from '@/db/client';
import { initBatchRepository } from '@/repositories/batchRepository';
import { initExpenseRepository } from '@/repositories/expenseRepository';
import { initTripRepository } from '@/repositories/tripRepository';
import { useAppStore } from '@/store';
import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
    <View style={styles.shell}>
      {isDesktop && <Sidebar />}
      <View style={styles.main}>
        <Stack>
          <Stack.Screen name="index"        options={{ title: 'Dashboard', headerShown: !isDesktop }} />
          <Stack.Screen name="expenses"     options={{ title: 'Expenses',  headerShown: !isDesktop }} />
          <Stack.Screen name="trips"        options={{ title: 'Trips',     headerShown: !isDesktop }} />
          <Stack.Screen name="batches"      options={{ title: 'Batches',   headerShown: !isDesktop }} />
          <Stack.Screen name="add-expense"  options={{ title: 'Add Expense',  presentation: 'modal' }} />
          <Stack.Screen name="expense/[id]" options={{ title: 'Expense' }} />
          <Stack.Screen name="edit-expense" options={{ title: 'Edit Expense' }} />
          <Stack.Screen name="add-trip"     options={{ title: 'New Trip',    presentation: 'modal' }} />
          <Stack.Screen name="trip/[id]"    options={{ title: 'Trip' }} />
          <Stack.Screen name="edit-trip"    options={{ title: 'Edit Trip' }} />
          <Stack.Screen name="add-batch"    options={{ title: 'New Batch',   presentation: 'modal' }} />
          <Stack.Screen name="batch/[id]"   options={{ title: 'Batch' }} />
          <Stack.Screen name="edit-batch"   options={{ title: 'Edit Batch' }} />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
  },
});
