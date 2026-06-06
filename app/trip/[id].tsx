import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { TripStatusBadge } from '@/components/TripStatusBadge';
import { useExpenseStore } from '@/store/expenseSlice';
import { tripReadiness, totalsByCurrency, type CurrencyMap } from '@/store/selectors';
import { useTripStore } from '@/store/tripSlice';
import type { ExpenseStatus } from '@/types/expense';
import type { WorkTrip } from '@/types/trip';
import { exportTripCsv } from '@/utils/tripExport';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

function ReadinessRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Text style={ok ? styles.readinessOk : styles.readinessWarn}>
      {ok ? '✓' : '⚠'} {label}
    </Text>
  );
}

export default function TripDetailScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { id } = useLocalSearchParams<{ id: string }>();
  const getTripById    = useTripStore((s) => s.getTripById);
  const deleteTrip     = useTripStore((s) => s.deleteTrip);
  const expenses       = useExpenseStore((s) => s.expenses);
  const updateExpense  = useExpenseStore((s) => s.updateExpense);

  const [trip, setTrip]           = useState<WorkTrip | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [exporting, setExporting]             = useState(false);
  const [togglingReceiptId, setTogglingReceiptId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      getTripById(id)
        .then((found) => {
          if (found) {
            setTrip(found);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
          setLoading(false);
        })
        .catch(() => {
          setNotFound(true);
          setLoading(false);
        });
    }, [id, getTripById]),
  );

  const tripExpenses = useMemo(
    () => (trip ? expenses.filter((e) => e.workTripId === trip.id) : []),
    [expenses, trip],
  );

  const currencyTotals = useMemo(() => totalsByCurrency(tripExpenses), [tripExpenses]);

  const statusTotals = useMemo(() => {
    const map: Partial<Record<ExpenseStatus, { count: number; byCurrency: CurrencyMap }>> = {};
    tripExpenses.forEach((e) => {
      const prev = map[e.status] ?? { count: 0, byCurrency: {} };
      map[e.status] = {
        count: prev.count + 1,
        byCurrency: { ...prev.byCurrency, [e.currency]: (prev.byCurrency[e.currency] ?? 0) + e.amount },
      };
    });
    return map;
  }, [tripExpenses]);

  const readiness = useMemo(
    () => (trip ? tripReadiness(expenses, trip.id) : null),
    [expenses, trip],
  );

  const missingReceiptExpenses = useMemo(
    () => tripExpenses.filter((e) => !e.hasReceipt),
    [tripExpenses],
  );

  const handleToggleReceipt = async (expense: (typeof tripExpenses)[number]) => {
    if (togglingReceiptId === expense.id) return;
    setTogglingReceiptId(expense.id);
    try {
      await updateExpense({ ...expense, hasReceipt: !expense.hasReceipt });
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingReceiptId(null);
    }
  };

  const handleExport = async () => {
    if (!trip) return;
    setExporting(true);
    try {
      await exportTripCsv(trip, tripExpenses);
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', 'Could not generate the CSV file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleEdit = () => {
    if (!trip) return;
    router.push({ pathname: '/edit-trip', params: { id: trip.id } });
  };

  const handleDelete = () => {
    if (!trip) return;
    Alert.alert(
      'Delete Trip',
      `Remove "${trip.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteTrip(trip.id);
              router.back();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete trip. Please try again.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (notFound || !trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Trip not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const infoPanel = (
    <>
      <Text style={styles.title}>{trip.name}</Text>
      <View style={styles.badgeRow}>
        <TripStatusBadge status={trip.status} />
      </View>

      <View style={styles.divider} />

      <Field label="Destination" value={trip.destination} />
      <Field label="Start Date"  value={trip.startDate} />
      <Field label="End Date"    value={trip.endDate} />
      {trip.client ? <Field label="Client" value={trip.client} /> : null}
      {trip.notes  ? <Field label="Notes"  value={trip.notes}  /> : null}

      {readiness && readiness.total > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Submission Readiness</Text>
          <View style={[
            styles.readinessBanner,
            readiness.missingReceipt === 0 ? styles.readinessBannerOk : styles.readinessBannerWarn,
          ]}>
            <Text style={[
              styles.readinessBannerText,
              readiness.missingReceipt === 0 ? styles.readinessBannerTextOk : styles.readinessBannerTextWarn,
            ]}>
              {readiness.missingReceipt === 0
                ? '✓ Ready to Submit'
                : `⚠ ${readiness.missingReceipt} receipt${readiness.missingReceipt !== 1 ? 's' : ''} missing`}
            </Text>
          </View>
          <View style={styles.readinessBlock}>
            <ReadinessRow ok label={`${readiness.total} expense${readiness.total !== 1 ? 's' : ''} recorded`} />
            <ReadinessRow
              ok={readiness.missingReceipt === 0}
              label={
                readiness.missingReceipt === 0
                  ? `${readiness.withReceipt} receipt${readiness.withReceipt !== 1 ? 's' : ''} present`
                  : `${readiness.missingReceipt} receipt${readiness.missingReceipt !== 1 ? 's' : ''} missing`
              }
            />
            {readiness.missingReceipt > 0 && readiness.withReceipt > 0 && (
              <ReadinessRow ok label={`${readiness.withReceipt} receipt${readiness.withReceipt !== 1 ? 's' : ''} present`} />
            )}
            {readiness.submitted > 0 && (
              <ReadinessRow ok label={`${readiness.submitted} submitted`} />
            )}
            {readiness.approved > 0 && (
              <ReadinessRow ok label={`${readiness.approved} approved`} />
            )}
            {readiness.paid > 0 && (
              <ReadinessRow ok label={`${readiness.paid} paid`} />
            )}
          </View>
        </>
      )}

      <View style={styles.divider} />

      <View style={styles.actionsStack}>
        {trip.status === 'open' && (
          <Pressable
            style={[styles.button, styles.addExpenseButton]}
            onPress={() => router.push({ pathname: '/add-expense', params: { tripId: trip.id } })}
          >
            <Text style={[styles.buttonText, styles.addExpenseButtonText]}>+ Add Expense</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.button, styles.exportButton, exporting && styles.exportButtonBusy]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Text style={[styles.buttonText, styles.exportButtonText]}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.outlineButton]}
          onPress={() => router.push({ pathname: '/trip-report/[id]', params: { id: trip.id } })}
        >
          <Text style={[styles.buttonText, styles.outlineButtonText]}>View Report</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.outlineButton]} onPress={handleEdit}>
            <Text style={[styles.buttonText, styles.outlineButtonText]}>Edit</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.dangerButton, deleting && styles.dangerButtonDisabled]}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Text style={[styles.buttonText, styles.dangerButtonText]}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );

  const expensesPanel = (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Assigned Expenses{tripExpenses.length > 0 ? ` (${tripExpenses.length})` : ''}
        </Text>
        {tripExpenses.length > 0 && (
          <View style={styles.sectionTotals}>
            {Object.entries(currencyTotals)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([currency, amount]) => (
                <Text key={currency} style={styles.sectionTotal}>
                  {currency} {amount.toFixed(2)}
                </Text>
              ))}
          </View>
        )}
      </View>

      {tripExpenses.length > 0 && (
        <View style={styles.statusSummary}>
          {(['unsubmitted', 'submitted', 'approved', 'paid', 'rejected'] as const).map((s) => {
            const data = statusTotals[s];
            if (!data) return null;
            return (
              <View key={s} style={styles.statusSummaryRow}>
                <StatusBadge status={s} />
                <Text style={styles.statusSummaryText}>
                  {data.count} ·{' '}
                  {Object.entries(data.byCurrency)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([c, a]) => `${c} ${a.toFixed(2)}`)
                    .join(' · ')}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {missingReceiptExpenses.length > 0 && (
        <View style={styles.missingReceiptAlert}>
          <Text style={styles.missingReceiptAlertTitle}>
            ⚠ {missingReceiptExpenses.length} expense{missingReceiptExpenses.length !== 1 ? 's' : ''} missing receipts
          </Text>
          {missingReceiptExpenses.map((e) => (
            <Pressable key={e.id} onPress={() => router.push(`/expense/${e.id}`)}>
              <Text style={styles.missingReceiptItem}>· {e.title}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {tripExpenses.length === 0 ? (
        <Text style={styles.noExpenses}>No expenses assigned to this trip.</Text>
      ) : (
        tripExpenses.map((expense) => (
          <Pressable
            key={expense.id}
            style={({ pressed }) => [styles.expenseRow, pressed && styles.expenseRowPressed]}
            onPress={() => router.push(`/expense/${expense.id}`)}
          >
            <View style={styles.expenseRowLeft}>
              <Text style={styles.expenseRowTitle} numberOfLines={1}>{expense.title}</Text>
              <View style={styles.expenseRowBadge}>
                <StatusBadge status={expense.status} />
              </View>
            </View>
            <View style={styles.expenseRowRight}>
              <Text style={styles.expenseRowAmount}>
                {expense.currency} {expense.amount.toFixed(2)}
              </Text>
              <Pressable
                onPress={() => handleToggleReceipt(expense)}
                style={[
                  styles.receiptToggle,
                  expense.hasReceipt ? styles.receiptToggleOk : styles.receiptToggleWarn,
                  togglingReceiptId === expense.id && styles.receiptToggleBusy,
                ]}
              >
                <Text style={[
                  styles.receiptToggleText,
                  expense.hasReceipt ? styles.receiptToggleTextOk : styles.receiptToggleTextWarn,
                ]}>
                  {expense.hasReceipt ? '✓' : '⚠'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        ))
      )}
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isWide && styles.contentWide]}
    >
      <View style={isWide ? styles.innerWide : undefined}>
        {isWide ? (
          <View style={styles.columnsWide}>
            <View style={styles.leftColWide}>{infoPanel}</View>
            <View style={styles.rightColWide}>{expensesPanel}</View>
          </View>
        ) : (
          <>
            {infoPanel}
            <View style={styles.divider} />
            {expensesPanel}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  notFoundText: {
    fontSize: 16,
    color: '#888',
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  contentWide: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  innerWide: {
    maxWidth: 1100,
    width: '100%',
  },
  columnsWide: {
    flexDirection: 'row',
    gap: 48,
    alignItems: 'flex-start',
  },
  leftColWide: {
    flex: 2,
  },
  rightColWide: {
    flex: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  badgeRow: {
    marginTop: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5e5',
    marginVertical: 20,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111',
  },
  readinessBlock: {
    gap: 6,
    marginTop: 10,
  },
  readinessOk: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  readinessWarn: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionTotals: {
    alignItems: 'flex-end',
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  noExpenses: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  statusSummary: {
    gap: 6,
    marginBottom: 16,
  },
  statusSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusSummaryText: {
    fontSize: 13,
    color: '#555',
  },
  missingReceiptAlert: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 16,
  },
  missingReceiptAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 6,
  },
  missingReceiptItem: {
    fontSize: 13,
    color: '#92400E',
    marginTop: 2,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  expenseRowPressed: {
    backgroundColor: '#eff6ff',
  },
  expenseRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  expenseRowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expenseRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  expenseRowNoReceipt: {
    fontSize: 13,
    color: '#D97706',
  },
  expenseRowBadge: {
    marginTop: 4,
  },
  expenseRowAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  actionsStack: {
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  outlineButtonText: {
    color: '#2563EB',
  },
  dangerButton: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  dangerButtonDisabled: {
    borderColor: '#fca5a5',
  },
  dangerButtonText: {
    color: '#DC2626',
  },
  exportButton: {
    backgroundColor: '#059669',
    borderWidth: 0,
  },
  exportButtonBusy: {
    backgroundColor: '#6EE7B7',
  },
  exportButtonText: {
    color: '#fff',
  },
  addExpenseButton: {
    backgroundColor: '#2563EB',
    borderWidth: 0,
  },
  addExpenseButtonText: {
    color: '#fff',
  },
  readinessBanner: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  readinessBannerOk: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  readinessBannerWarn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  readinessBannerText: {
    fontSize: 15,
    fontWeight: '700',
  },
  readinessBannerTextOk: {
    color: '#059669',
  },
  readinessBannerTextWarn: {
    color: '#D97706',
  },
  expenseRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  receiptToggleOk: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  receiptToggleWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  receiptToggleBusy: {
    opacity: 0.5,
  },
  receiptToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  receiptToggleTextOk: {
    color: '#059669',
  },
  receiptToggleTextWarn: {
    color: '#D97706',
  },
});
