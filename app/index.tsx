import { StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '@/store';

export default function HomeScreen() {
  const isDbReady = useAppStore((s) => s.isDbReady);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reimbursements</Text>
      <Text style={styles.subtitle}>Phase 1 — Foundation</Text>
      <Text style={styles.status}>DB: {isDbReady ? 'ready' : 'initializing...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  status: {
    fontSize: 13,
    color: '#999',
    marginTop: 24,
  },
});
