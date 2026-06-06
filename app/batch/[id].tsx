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

import { BatchStatusBadge } from '@/components/BatchStatusBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { useBatchStore } from '@/store/batchSlice';
import { useExpenseStore } from '@/store/expenseSlice';
import { batchReadiness, totalsByCurrency } from '@/store/selectors';
import { useTripStore } from '@/store/tripSlice';
import type { BatchStatus, ReimbursementBatch } from '@/types/batch';
import { exportBatchCsv } from '@/utils/batchExport';

const BATCH_STATUS_OPTIONS: { value: BatchStatus; label: string }[] = [
  { value: 'draft',     label: 'Draft'     },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved',  label: 'Approved'  },
  { value: 'paid',      label: 'Paid'      },
];

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

export default function BatchDetailScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { id } = useLocalSearchParams<{ id: string }>();
  const getBatchById         = useBatchStore((s) => s.getBatchById);
  const updateBatch          = useBatchStore((s) => s.updateBatch);
  const deleteBatch          = useBatchStore((s) => s.deleteBatch);
  const expenses             = useExpenseStore((s) => s.expenses);
  const assignExpenseToBatch = useExpenseStore((s) => s.assignExpenseToBatch);
  const trips                = useTripStore((s) => s.trips);

  const [batch, setBatch]       = useState<ReimbursementBatch | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [changingStatus, setChangingStatus]     = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      getBatchById(id)
        .then((found) => {
          if (found) { setBatch(found); setNotFound(false); }
          else { setNotFound(true); }
          setLoading(false);
        })
        .catch(() => { setNotFound(true); setLoading(false); });
    }, [id, getBatchById]),
  );

  const batchExpenses = useMemo(
    () => (batch ? expenses.filter((e) => e.reimbursementBatchId === batch.id) : []),
    [expenses, batch],
  );
  const unbatchedExpenses = useMemo(
    () => expenses.filter((e) => !e.reimbursementBatchId),
    [expenses],
  );
  const currencyTotals = useMemo(() => totalsByCurrency(batchExpenses), [batchExpenses]);

  const readiness = useMemo(
    () => (batch ? batchReadiness(expenses, batch.id) : null),
    [expenses, batch],
  );

  const handleStatusChange = async (newStatus: BatchStatus) => {
    if (!batch || changingStatus) return;
    setChangingStatus(true);
    const now = new Date().toISOString();
    const updated: ReimbursementBatch = {
      ...batch,
      status: newStatus,
      submittedAt: newStatus === 'submitted' && !batch.submittedAt ? now : batch.submittedAt,
      approvedAt:  newStatus === 'approved'  && !batch.approvedAt  ? now : batch.approvedAt,
      paidAt:      newStatus === 'paid'      && !batch.paidAt      ? now : batch.paidAt,
    };
    try {
      await updateBatch(updated);
      setBatch(updated);
      setShowStatusPicker(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAssign = async (expenseId: string) => {
    if (!batch) return;
    try {
      await assignExpenseToBatch(expenseId, batch.id);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to assign expense. Please try again.');
    }
  };

  const handleRemove = async (expenseId: string) => {
    try {
      await assignExpenseToBatch(expenseId, null);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to remove expense. Please try again.');
    }
  };

  const handleExport = async () => {
    if (!batch) return;
    setExporting(true);
    try {
      await exportBatchCsv(batch, batchExpenses, trips);
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', 'Could not generate the CSV file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleEdit = () => {
    if (!batch) return;
    router.push({ pathname: '/edit-batch', params: { id: batch.id } });
  };

  const handleDelete = () => {
    if (!batch) return;
    Alert.alert(
      'Delete Batch',
      `Remove "${batch.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteBatch(batch.id);
              router.back();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete batch. Please try again.');
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

  if (notFound || !batch) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Batch not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const infoPanel = (
    <>
      <Text style={styles.title}>{batch.name}</Text>
      <View style={styles.badgeRow}>
        <BatchStatusBadge status={batch.status} />
      </View>

      {(batch.submittedAt || batch.approvedAt || batch.paidAt) && (
        <View style={styles.timestamps}>
          {batch.submittedAt && (
            <Text style={styles.timestamp}>Submitted: {batch.submittedAt.slice(0, 10)}</Text>
          )}
          {batch.approvedAt && (
            <Text style={styles.timestamp}>Approved: {batch.approvedAt.slice(0, 10)}</Text>
          )}
          {batch.paidAt && (
            <Text style={styles.timestamp}>Paid: {batch.paidAt.slice(0, 10)}</Text>
          )}
        </View>
      )}

      <View style={styles.divider} />

      {batch.notes ? <Field label="Notes" value={batch.notes} /> : null}

      {readiness && readiness.total > 0 && (
        <>
          <Text style={styles.sectionLabel}>Batch Readiness</Text>
          <View style={styles.readinessBlock}>
            <ReadinessRow ok label={`${readiness.total} expense${readiness.total !== 1 ? 's' : ''} assigned`} />
            <ReadinessRow
              ok={readiness.missingReceipt === 0}
              label={
                readiness.missingReceipt === 0
                  ? 'All receipts present'
                  : `${readiness.missingReceipt} expense${readiness.missingReceipt !== 1 ? 's' : ''} missing receipts`
              }
            />
            <ReadinessRow
              ok={readiness.unsubmitted === 0}
              label={
                readiness.unsubmitted === 0
                  ? 'All expenses submitted'
                  : `${readiness.unsubmitted} expense${readiness.unsubmitted !== 1 ? 's' : ''} still unsubmitted`
              }
            />
          </View>
          <View style={styles.divider} />
        </>
      )}

      <View style={styles.exportRow}>
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
          onPress={() => router.push({ pathname: '/batch-report/[id]', params: { id: batch.id } })}
        >
          <Text style={[styles.buttonText, styles.outlineButtonText]}>View Report</Text>
        </Pressable>
      </View>

      <View style={styles.primaryActions}>
        <Pressable
          style={[
            styles.button,
            styles.outlineButton,
            showStatusPicker && styles.outlineButtonActive,
          ]}
          onPress={() => setShowStatusPicker((v) => !v)}
        >
          <Text style={[
            styles.buttonText,
            styles.outlineButtonText,
            showStatusPicker && styles.outlineButtonTextActive,
          ]}>
            Change Status
          </Text>
        </Pressable>

        <Pressable style={[styles.button, styles.outlineButton]} onPress={handleEdit}>
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Edit</Text>
        </Pressable>
      </View>

      {showStatusPicker && (
        <View style={styles.statusPicker}>
          {BATCH_STATUS_OPTIONS.map((opt) => {
            const isCurrent = batch.status === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.statusOption, isCurrent && styles.statusOptionCurrent]}
                onPress={() => handleStatusChange(opt.value)}
                disabled={changingStatus || isCurrent}
              >
                <BatchStatusBadge status={opt.value} />
                {isCurrent && <Text style={styles.statusOptionTick}> ✓</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.button, styles.dangerButton, deleting && styles.dangerButtonDisabled]}
        onPress={handleDelete}
        disabled={deleting}
      >
        <Text style={[styles.buttonText, styles.dangerButtonText]}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Text>
      </Pressable>
    </>
  );

  const expensesPanel = (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Assigned Expenses{batchExpenses.length > 0 ? ` (${batchExpenses.length})` : ''}
        </Text>
        {batchExpenses.length > 0 && (
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

      {batchExpenses.length === 0 ? (
        <Text style={styles.emptyText}>No expenses assigned yet.</Text>
      ) : (
        batchExpenses.map((expense) => (
          <View key={expense.id} style={styles.expenseRow}>
            <Pressable
              style={styles.expenseRowLeft}
              onPress={() => router.push(`/expense/${expense.id}`)}
            >
              <View style={styles.expenseRowTitleRow}>
                <Text style={styles.expenseRowTitle} numberOfLines={1}>{expense.title}</Text>
                {!expense.hasReceipt && (
                  <Text style={styles.expenseRowNoReceipt}>⚠</Text>
                )}
              </View>
              <View style={styles.expenseRowMeta}>
                <StatusBadge status={expense.status} />
                <Text style={styles.expenseRowAmount}>
                  {expense.currency} {expense.amount.toFixed(2)}
                </Text>
              </View>
              {expense.workTripId && (
                <Text style={styles.expenseRowTrip}>
                  {trips.find((t) => t.id === expense.workTripId)?.name}
                </Text>
              )}
            </Pressable>
            <Pressable style={styles.removeButton} onPress={() => handleRemove(expense.id)}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <View style={styles.divider} />

      <Pressable style={styles.addToggle} onPress={() => setShowAdd((v) => !v)}>
        <Text style={styles.addToggleText}>
          {showAdd ? '▲ Hide unbatched expenses' : '▼ Add expenses to this batch'}
        </Text>
      </Pressable>

      {showAdd && (
        unbatchedExpenses.length === 0 ? (
          <Text style={styles.emptyText}>All active expenses are already assigned.</Text>
        ) : (
          unbatchedExpenses.map((expense) => (
            <View key={expense.id} style={styles.expenseRow}>
              <View style={styles.expenseRowLeft}>
                <View style={styles.expenseRowTitleRow}>
                  <Text style={styles.expenseRowTitle} numberOfLines={1}>{expense.title}</Text>
                  {!expense.hasReceipt && (
                    <Text style={styles.expenseRowNoReceipt}>⚠</Text>
                  )}
                </View>
                <View style={styles.expenseRowMeta}>
                  <StatusBadge status={expense.status} />
                  <Text style={styles.expenseRowAmount}>
                    {expense.currency} {expense.amount.toFixed(2)}
                  </Text>
                </View>
                {expense.workTripId && (
                  <Text style={styles.expenseRowTrip}>
                    {trips.find((t) => t.id === expense.workTripId)?.name}
                  </Text>
                )}
              </View>
              <Pressable style={styles.addButton} onPress={() => handleAssign(expense.id)}>
                <Text style={styles.addButtonText}>+ Add</Text>
              </Pressable>
            </View>
          ))
        )
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
  timestamps: {
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  readinessBlock: {
    gap: 6,
    marginBottom: 12,
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
  emptyText: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
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
  expenseRowLeft: {
    flex: 1,
    marginRight: 8,
  },
  expenseRowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  expenseRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  expenseRowAmount: {
    fontSize: 13,
    color: '#555',
  },
  expenseRowTrip: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  removeButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  addToggle: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  addToggleText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  addButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  exportRow: {
    gap: 10,
    marginBottom: 10,
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
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  outlineButtonActive: {
    backgroundColor: '#2563EB',
  },
  outlineButtonText: {
    color: '#2563EB',
  },
  outlineButtonTextActive: {
    color: '#fff',
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
  statusPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  statusOptionCurrent: {
    opacity: 0.6,
  },
  statusOptionTick: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
  },
});
