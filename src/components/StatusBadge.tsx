import { StyleSheet, Text, View } from 'react-native';

import type { ExpenseStatus } from '@/types/expense';

interface Config {
  label: string;
  bg: string;
  text: string;
}

const STATUS_CONFIG: Record<ExpenseStatus, Config> = {
  unsubmitted: { label: 'Unsubmitted', bg: '#e5e7eb', text: '#374151' },
  submitted:   { label: 'Submitted',   bg: '#dbeafe', text: '#1e40af' },
  approved:    { label: 'Approved',    bg: '#d1fae5', text: '#065f46' },
  paid:        { label: 'Paid',        bg: '#065f46', text: '#ecfdf5' },
  rejected:    { label: 'Rejected',    bg: '#fee2e2', text: '#991b1b' },
};

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unsubmitted;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
