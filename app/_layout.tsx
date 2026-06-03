import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { getDatabase } from '@/db/client';
import { initExpenseRepository } from '@/repositories/expenseRepository';
import { useAppStore } from '@/store';
import { useExpenseStore } from '@/store/expenseSlice';

export default function RootLayout() {
  const setDbReady = useAppStore((s) => s.setDbReady);
  const loadExpenses = useExpenseStore((s) => s.loadExpenses);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        initExpenseRepository(db);
        await loadExpenses();
        setDbReady(true);
      } catch (e) {
        console.error('Boot error:', e);
      }
    })();
  }, [setDbReady, loadExpenses]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Expenses' }} />
      <Stack.Screen name="add-expense" options={{ title: 'Add Expense', presentation: 'modal' }} />
      <Stack.Screen name="expense/[id]" options={{ title: 'Expense' }} />
    </Stack>
  );
}
