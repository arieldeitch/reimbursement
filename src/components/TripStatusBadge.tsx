import { StyleSheet, Text, View } from 'react-native';

import type { TripStatus } from '@/types/trip';

interface Config {
  label: string;
  bg: string;
  text: string;
}

const STATUS_CONFIG: Record<TripStatus, Config> = {
  open:   { label: 'Open',   bg: '#dbeafe', text: '#1e40af' },
  closed: { label: 'Closed', bg: '#e5e7eb', text: '#374151' },
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
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
