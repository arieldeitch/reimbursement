import { StyleSheet, Text, View } from 'react-native';

import type { BatchStatus } from '@/types/batch';

interface Config {
  label: string;
  bg: string;
  text: string;
}

const STATUS_CONFIG: Record<BatchStatus, Config> = {
  draft:     { label: 'Draft',     bg: '#e5e7eb', text: '#374151' },
  submitted: { label: 'Submitted', bg: '#dbeafe', text: '#1e40af' },
  approved:  { label: 'Approved',  bg: '#d1fae5', text: '#065f46' },
  paid:      { label: 'Paid',      bg: '#065f46', text: '#ecfdf5' },
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
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
