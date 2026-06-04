import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BatchStatusBadge } from '@/components/BatchStatusBadge';
import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import type { ReimbursementBatch } from '@/types/batch';

function BatchItem({
  batch,
  count,
  total,
  currency,
}: {
  batch: ReimbursementBatch;
  count: number;
  total: number;
  currency: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => router.push(`/batch/${batch.id}`)}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemTitle} numberOfLines={1}>{batch.name}</Text>
        <View style={styles.itemBadge}>
          <BatchStatusBadge status={batch.status} />
        </View>
        {count > 0 && (
          <Text style={styles.itemMeta}>
            {count} expense{count !== 1 ? 's' : ''} · {currency} {total.toFixed(2)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function BatchesScreen() {
  const batches   = useBatchStore((s) => s.batches);
  const isLoading = useBatchStore((s) => s.isLoading);
  const expenses  = useExpenseStore((s) => s.expenses);

  const batchSummary = useMemo(() => {
    const map: Record<string, { count: number; total: number; currency: string }> = {};
    expenses.forEach((e) => {
      if (e.reimbursementBatchId) {
        const existing = map[e.reimbursementBatchId];
        if (existing) {
          existing.count++;
          existing.total += e.amount;
        } else {
          map[e.reimbursementBatchId] = { count: 1, total: e.amount, currency: e.currency };
        }
      }
    });
    return map;
  }, [expenses]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />
      ) : (
        <FlatList
          style={styles.list}
          data={batches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const s = batchSummary[item.id] ?? { count: 0, total: 0, currency: 'USD' };
            return <BatchItem batch={item} count={s.count} total={s.total} currency={s.currency} />;
          }}
          contentContainerStyle={batches.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No batches yet</Text>
              <Text style={styles.emptySubtitle}>Tap the button below to create one</Text>
            </View>
          }
        />
      )}

      <Link href="/add-batch" asChild>
        <Pressable style={styles.addButton}>
          <Text style={styles.addButtonText}>+ New Batch</Text>
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
  itemBadge: {
    marginTop: 6,
  },
  itemMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
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
