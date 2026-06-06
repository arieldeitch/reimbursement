import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RELEASE_DATE, RELEASE_NAME, VERSION } from '@/constants/version';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.appName}>Reimbursement</Text>
      <Text style={styles.tagline}>Work Expense Tracker</Text>

      <View style={styles.card}>
        <Row label="Version"      value={`v${VERSION}`} />
        <Row label="Release"      value={RELEASE_NAME} />
        <Row label="Release Date" value={RELEASE_DATE} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Purpose</Text>
        <Text style={styles.body}>
          Track every work expense that requires reimbursement — from the moment you
          pay until you get paid back.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Capabilities</Text>
        {CAPABILITIES.map((c) => (
          <Text key={c} style={styles.bullet}>· {c}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const CAPABILITIES = [
  'Add, edit, and track expenses',
  'Manage work trips and assign expenses to them',
  'Group expenses into reimbursement batches',
  'Track receipt status per expense',
  'Monitor submission, approval, and payment status',
  'Desktop workspace with table view, search, and filters',
  'Trip and batch summary reports',
  'CSV export for trips and batches',
  'Offline-first — all data stored locally',
];

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
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 28,
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
  body: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  bullet: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 24,
  },
});
