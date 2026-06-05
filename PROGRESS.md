# Sprint Progress Dashboard

**Project:** Reimbursement Tracker (Mobile + Desktop Web)
**Updated:** 2026-06-05
**Repo:** `C:\Users\user\Documents\GitHub\reimbursement`

---

## Primary Platform

Desktop Web (via Expo + Metro web bundler). Mobile remains a supported secondary target.

---

## Current Architecture

```
app/                          ← Expo Router screens (file-system routing)
  _layout.tsx                 ← Root Stack; boots DB, loads all stores
  index.tsx                   ← Dashboard (/) — status cards, open items, quick actions
  expenses.tsx                ← Expense list (/expenses)
  add-expense.tsx             ← Add expense modal
  edit-expense.tsx            ← Edit expense + receipt toggle + missing reason
  expense/[id].tsx            ← Expense detail; receipt toggle; 2-col desktop layout
  trips.tsx                   ← Trip list (/trips)
  add-trip.tsx                ← Add trip modal
  edit-trip.tsx               ← Edit trip screen
  trip/[id].tsx               ← Trip detail; submission readiness; 2-col desktop layout
  batches.tsx                 ← Batch list (/batches)
  add-batch.tsx               ← Add batch modal
  edit-batch.tsx              ← Edit batch screen
  batch/[id].tsx              ← Batch detail; batch readiness; 2-col desktop layout

src/
  db/
    client.ts                 ← SQLite singleton, WAL, schema init, incremental migrations
  repositories/
    index.ts                  ← Repository<T> base interface
    expenseRepository.ts      ← Full CRUD + soft delete + assignToBatch + receipt fields
    tripRepository.ts         ← Full CRUD + soft delete
    batchRepository.ts        ← Full CRUD + soft delete
  store/
    index.ts                  ← useAppStore (isDbReady flag)
    expenseSlice.ts           ← useExpenseStore
    tripSlice.ts              ← useTripStore
    batchSlice.ts             ← useBatchStore
    selectors.ts              ← expenseSelectors; tripReadiness; batchReadiness
  types/
    entity.ts                 ← Entity base (id, createdAt, updatedAt)
    expense.ts                ← Expense (+ hasReceipt, receiptMissingReason), ExpenseStatus, etc.
    trip.ts                   ← WorkTrip, TripStatus
    batch.ts                  ← ReimbursementBatch, BatchStatus
    index.ts                  ← Barrel re-export
  components/
    StatusBadge.tsx           ← Expense status chip
    TripStatusBadge.tsx       ← Trip status chip
    BatchStatusBadge.tsx      ← Batch status chip
  utils/
    tripExport.ts             ← buildTripCsv + exportTripCsv (web Blob / native Share)
    reportData.ts             ← tripSummaryReportData; batchSummaryReportData
```

### Layer rules

```
Screen → useXxxStore → XxxRepository → SQLite
           (Zustand)    (class singleton)   (expo-sqlite)
```

No screen touches SQLite directly. No store holds raw SQL.

### Navigation model (workspace-centric)

```
/ (Dashboard)
  ├── /expenses      Expense list
  │     ├── /add-expense       modal
  │     ├── /expense/[id]      detail + receipt toggle
  │     └── /edit-expense      edit + receipt fields
  ├── /trips         Trip list
  │     ├── /add-trip          modal
  │     ├── /trip/[id]         detail + readiness + CSV export
  │     └── /edit-trip         edit
  └── /batches       Batch list
        ├── /add-batch         modal
        ├── /batch/[id]        detail + readiness
        └── /edit-batch        edit
```

### Stack

| Concern | Library | Version |
|---|---|---|
| Runtime | Expo SDK | 56.0.8 |
| Framework | React Native | 0.85.3 |
| Language | TypeScript | 6.0.3 |
| Navigation | Expo Router | 56.2.8 |
| Local DB | expo-sqlite | 56.0.4 |
| State | Zustand | 5.0.14 |
| Bundler | Metro (via Expo) | — |

### SQLite database

- File: `reimbursement.db`
- Mode: WAL + foreign keys on
- Tables: `expenses`, `trips`, `reimbursement_batches`
- Soft delete: `deleted_at` on all tables
- Cross-table FKs on expenses: `work_trip_id`, `reimbursement_batch_id`
- Receipt fields on expenses: `has_receipt INTEGER NOT NULL DEFAULT 0`, `receipt_missing_reason TEXT`
- Migrations are additive and idempotent — safe to run on existing databases

---

## Completed Milestones

### Phase 1 — Foundation `31137b9`
Expo Router, TS, SQLite WAL, path alias `@/`, `useAppStore`, boot sequence.

### Phase 2A — Expense Creation `0524727`
Expenses table, `ExpenseRepository` full CRUD, `useExpenseStore`, Add Expense form.

### Phase 2B — Expense Detail Architecture `0316577`
Expense detail screen, `getById`, `update`, `softDelete`.

### Phase 2C — Trip Domain Model `f8dde3c`
`WorkTrip` type, `TripRepository` skeleton, `Expense.workTripId` FK typed.

### Phase 3A — Complete Expense CRUD `f11af10` `f6c0abf`
Edit form, delete confirmation, status change picker on detail screen.

### Phase 3B — Trip UI `03ef6e3` `0dec5c4`
Trips table + `work_trip_id` migration, `TripRepository` full impl, `useTripStore`,
trip list / add / edit / detail screens, trip picker in expense edit form.

### Phase 3C — Batch Management `041a325`
Batches table + `reimbursement_batch_id` migration, `BatchRepository`, `useBatchStore`,
batch list / add / edit / detail screens, batch picker in expense edit form.

### Phase 3D — Cross-domain Workflow + Dashboard Selectors `e40ba17`
Expense detail LinkFields for trip/batch, batch detail shows trip name,
trip detail shows status summary. `expenseSelectors` in `src/store/selectors.ts`.

### Phase 3E — Desktop Workspace Foundation `bf7048e`
`/` → Dashboard with status cards + quick actions. `/expenses` as dedicated route.
`useWindowDimensions` responsive layout, 900px max-width centering.

### Phase 3F — Trip CSV Export `c4a3aea`
`src/utils/tripExport.ts`: `buildTripCsv` (UTF-8 BOM, CRLF, summary block, currency breakdown).
Web: Blob download. Native: `Share.share`. Export CSV button on Trip Detail.

### Phase 5B — Submission Ready Experience `(current commit)`

**Receipt Tracking:**
- `Expense.hasReceipt: boolean` + `Expense.receiptMissingReason?: string` added to type
- SQLite migration: `has_receipt INTEGER NOT NULL DEFAULT 0`, `receipt_missing_reason TEXT`
- `ExpenseRepository` reads/writes both fields
- Expense Detail: `[✓ Present] [⚠ Missing]` chip toggle; inline warning badge in header
- Edit Expense: receipt chips + missing reason text input
- New expenses default to `hasReceipt: false`

**Submission Readiness Selectors:**
- `tripReadiness(expenses, tripId)` → `{ total, withReceipt, missingReceipt, submitted, approved, paid }`
- `batchReadiness(expenses, batchId)` → `{ total, withReceipt, missingReceipt, unsubmitted }`

**Readiness Indicators UI:**
- Trip Detail: "Submission Readiness" section with ✓/⚠ rows; amber alert panel listing expenses with missing receipts; ⚠ indicator on each expense row missing a receipt
- Batch Detail: "Batch Readiness" section with assigned count, receipt status, unsubmitted count

**Desktop Improvements:**
- Expense Detail: 2-column layout on ≥768px (fields left / receipt+actions right)
- Trip Detail: 2-column layout on ≥768px (info+readiness left / expenses right), max-width 1100px
- Batch Detail: 2-column layout on ≥768px (info+readiness left / expenses right)
- Dashboard: 4-column status card grid on ≥1100px

**Reporting Preparation:**
- `src/utils/reportData.ts`: `tripSummaryReportData()` and `batchSummaryReportData()` — pure functions returning structured objects with all aggregates ready for future PDF/Excel export

**CSV Export Enhancement:**
- Added "Has Receipt" and "Missing Reason" columns to trip CSV
- Added "Receipts Present" and "Receipts Missing" rows to CSV summary block

---

## Open Milestones

### Phase 4 — Supabase Sync

Blocked by: Phase 3/5 fully QA'd on web.

- Add Supabase project and env vars
- Auth (email / OAuth)
- Sync layer: local-first write, background push to Supabase
- Conflict resolution (last-write-wins vs server-authoritative)
- RLS policies per user

### Phase 5C — Batch CSV Export

Analogous to trip CSV export but for a batch. Blocked by: Phase 5B QA.

### Phase 6 — Dashboard Enhancements (future)

- Currency-aware totals (currently sums all amounts regardless of currency)
- Date-range filter on dashboard cards
- Link from each status card to a filtered expense list
- "Recent Expenses" panel on dashboard

---

## Known Technical Debt

### TD-01 — Repository interface inconsistency

`ExpenseRepository` uses `findAll`/`findById`/`save`/`delete`.
`TripRepository` and `BatchRepository` use `list`/`getById`/`create`/`softDelete`.
The `Repository<T>` base interface is partially decorative.

**Risk:** Low. Fix when starting Phase 4 sync layer.

### TD-02 — ID generation is not UUID v4

`generateId()` uses `Date.now().toString(36) + Math.random()`. Not suitable for cross-device sync.

**Fix when:** Phase 4. Switch to `crypto.randomUUID()`.

### TD-03 — No input validation on date and currency fields

The Add/Edit Expense form accepts any string for `date` and `currency`.

**Fix when:** Phase 4 or a hardening sprint.

### TD-04 — Dashboard totals are currency-unaware

`expenseSelectors` sums all amounts regardless of currency.

**Risk:** Low for single-currency use. Fix during Phase 6.

### TD-05 — No automated tests

Zero test files. All validation is manual.

**Fix when:** After Phase 3/5 is QA'd on web. Start with repository unit tests.

### TD-06 — `useLocalSearchParams id` can be `string[]`

Detail screens assume `id` is `string`. Add `typeof id !== 'string'` guards.

**Risk:** Very low in practice.

### TD-07 — hasReceipt defaults to false for all existing expenses

Existing expenses loaded from a pre-5B database will have `has_receipt = 0` (false) by default.
This means the readiness indicators will show all existing expenses as "missing receipts" until the user explicitly marks them as Present.

**Risk:** User-visible inaccuracy on first upgrade. Acceptable for local-only use — the user knows their own data. No auto-migration is warranted.

---

## Known Non-Issues

| Symptom | Explanation |
|---|---|
| CRLF warnings on `git add` | Windows line-ending conversion — harmless |
| `npm audit` moderate severity | Transitive deps, unrelated to app logic |
| `react-native-worklets` peer warning | Optional peer of `expo-modules-core`, not used |
| `react-dom` peer conflict | Use `npm install --legacy-peer-deps` for affected packages |
| `expo-env.d.ts` not in git | Correctly gitignored; auto-generated by `expo start` |
| `.claude/` not in git | Correctly gitignored |

---

## Next Sprint Recommendation

**Recommended: Web QA Sprint + Batch CSV Export**

1. **Run `npx expo start --web`** and manually validate:
   - Dashboard 4-column cards at 1280px+; 2-column at 768px; single at 375px
   - Expense detail 2-column layout on desktop; receipt toggle works
   - Trip detail 2-column layout; readiness section; CSV download fires in browser
   - Batch detail 2-column layout; readiness section; missing receipt warnings
   - Add expense → default hasReceipt false → detail shows "⚠ Receipt Missing"
   - Mark as Present → badge clears
   - Export CSV → "Has Receipt" column correct in downloaded file

2. **Batch CSV Export (Phase 5C)** — mirror of trip export; uses `batchSummaryReportData` already written in `reportData.ts`

3. **Resolve TD-07** — decide whether to show a one-time notice on first run ("Existing expenses may need receipt status updated") or add a bulk "Mark all as present" utility action

4. **After QA is clean:** Phase 4 (Supabase auth + sync layer) is the next major milestone
