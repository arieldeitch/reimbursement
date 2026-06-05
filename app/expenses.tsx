import { Link, router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { useExpenseStore } from '@/store/expenseSlice';
import type { Expense } from '@/types/expense';

function ExpenseItem({ expense }: { expense: Expense }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => router.push(`/expense/${expense.id}`)}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemTitle} numberOfLines={1}>{expense.title}</Text>
        <Text style={styles.itemMeta}>{expense.date} · {expense.category}</Text>
        <View style={styles.itemBadge}>
          <StatusBadge status={expense.status} />
        </View>
      </View>
      <Text style={styles.itemAmount}>{expense.currency} {expense.amount.toFixed(2)}</Text>
    </Pressable>
  );
}

export default function ExpensesScreen() {
  const expenses  = useExpenseStore((s) => s.expenses);
  const isLoading = useExpenseStore((s) => s.isLoading);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />
      ) : (
        <FlatList
          style={styles.list}
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpenseItem expense={item} />}
          contentContainerStyle={expenses.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptySubtitle}>Tap the button below to add one</Text>
            </View>
          }
        />
      )}

      <Link href="/add-expense" asChild>
        <Pressable style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Expense</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemPressed: {
    backgroundColor: '#f0f4ff',
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
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
    textTransform: 'capitalize',
  },
  itemBadge: {
    marginTop: 6,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
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
