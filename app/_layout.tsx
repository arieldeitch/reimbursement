import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { getDatabase } from '@/db/client';
import { useAppStore } from '@/store';

export default function RootLayout() {
  const setDbReady = useAppStore((s) => s.setDbReady);

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch(console.error);
  }, [setDbReady]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Reimbursements' }} />
    </Stack>
  );
}
