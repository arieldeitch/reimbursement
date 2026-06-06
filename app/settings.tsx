import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { VERSION, RELEASE_DATE, RELEASE_NAME } from '@/constants/version';
import { useAppStore } from '@/store';
import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { useTripStore } from '@/store/tripSlice';

export default function SettingsScreen() {
  const dbReady    = useAppStore((s) => s.isDbReady);
  const expenses   = useExpenseStore((s) => s.expenses);
  const trips      = useTripStore((s) => s.trips);
  const batches    = useBatchStore((s) => s.batches);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Application</Text>
        <Row label="Version"      value={`v${VERSION}`} />
        <Row label="Release"      value={RELEASE_NAME} />
        <Row label="Release Date" value={RELEASE_DATE} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Database</Text>
        <Row
          label="Status"
          value={dbReady ? 'Connected' : 'Initializing…'}
          valueStyle={dbReady ? styles.statusOk : styles.statusPending}
        />
        <Row label="Storage" value="Local SQLite" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Records</Text>
        <Row label="Expenses" value={String(expenses.length)} />
        <Row label="Trips"    value={String(trips.length)} />
        <Row label="Batches"  value={String(batches.length)} />
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusOk: {
    color: '#059669',
  },
  statusPending: {
    color: '#D97706',
  },
});
