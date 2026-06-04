import { Link, router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TripStatusBadge } from '@/components/TripStatusBadge';
import { useTripStore } from '@/store/tripSlice';
import type { WorkTrip } from '@/types/trip';

function TripItem({ trip }: { trip: WorkTrip }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => router.push(`/trip/${trip.id}`)}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemTitle} numberOfLines={1}>{trip.name}</Text>
        <Text style={styles.itemMeta}>{trip.destination}</Text>
        <Text style={styles.itemDates}>{trip.startDate} → {trip.endDate}</Text>
        <View style={styles.itemBadge}>
          <TripStatusBadge status={trip.status} />
        </View>
      </View>
    </Pressable>
  );
}

export default function TripsScreen() {
  const trips = useTripStore((s) => s.trips);
  const isLoading = useTripStore((s) => s.isLoading);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />
      ) : (
        <FlatList
          style={styles.list}
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TripItem trip={item} />}
          contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptySubtitle}>Tap the button below to create one</Text>
            </View>
          }
        />
      )}

      <Link href="/add-trip" asChild>
        <Pressable style={styles.addButton}>
          <Text style={styles.addButtonText}>+ New Trip</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  item: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemPressed: {
    backgroundColor: '#f0f4ff',
  },
  itemLeft: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  itemMeta: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  itemDates: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  itemBadge: {
    marginTop: 6,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5e5',
    marginLeft: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
  },
  addButton: {
    margin: 16,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
