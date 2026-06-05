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
  index.tsx                   ← Dashboard (/) — status cards + quick actions
  expenses.tsx                ← Expense list (/expenses)
  add-expense.tsx             ← Add expense modal
  edit-expense.tsx            ← Edit expense screen
  expense/[id].tsx            ← Expense detail (LinkField to trip + batch)
  trips.tsx                   ← Trip list (/trips)
  add-trip.tsx                ← Add trip modal
  edit-trip.tsx               ← Edit trip screen
  trip/[id].tsx               ← Trip detail (status totals, expense list)
  batches.tsx                 ← Batch list (/batches)
  add-batch.tsx               ← Add batch modal
  edit-batch.tsx              ← Edit batch screen
  batch/[id].tsx              ← Batch detail (expense list with trip names)

src/
  db/
    client.ts                 ← SQLite singleton, WAL mode, schema init (3 tables)
  repositories/
    index.ts                  ← Repository<T> base interface
    expenseRepository.ts      ← Full CRUD + soft delete + assignToBatch
    tripRepository.ts         ← Full CRUD + soft delete
    batchRepository.ts        ← Full CRUD + soft delete
  store/
    index.ts                  ← useAppStore (isDbReady flag)
    expenseSlice.ts           ← useExpenseStore
    tripSlice.ts              ← useTripStore
    batchSlice.ts             ← useBatchStore
    selectors.ts              ← expenseSelectors (count + total by status)
  types/
    entity.ts                 ← Entity base (id, createdAt, updatedAt)
    expense.ts                ← Expense, ExpenseStatus, ExpenseCategory, PaymentMethod
    trip.ts                   ← WorkTrip, TripStatus
    batch.ts                  ← ReimbursementBatch, BatchStatus
    index.ts                  ← Barrel re-export
  components/
    StatusBadge.tsx           ← Expense status chip
    TripStatusBadge.tsx       ← Trip status chip
    BatchStatusBadge.tsx      ← Batch status chip
```

### Layer rules

```
Screen → useXxxStore → XxxRepository → SQLite
           (Zustand)    (class singleton)  (expo-sqlite)
```

No screen touches SQLite directly. No store holds raw SQL.

### Navigation model (workspace-centric)

```
/ (Dashboard)
  ├── /expenses      Expense list
  │     ├── /add-expense       modal
  │     ├── /expense/[id]      detail
  │     └── /edit-expense      edit
  ├── /trips         Trip list
  │     ├── /add-trip          modal
  │     ├── /trip/[id]         detail
  │     └── /edit-trip         edit
  └── /batches       Batch list
        ├── /add-batch         modal
        ├── /batch/[id]        detail
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
- Tables: `expenses`, `trips`, `batches`
- Soft delete: `deleted_at` column on all tables
- Cross-table FKs: `expenses.work_trip_id` → `trips.id`, `expenses.reimbursement_batch_id` → `batches.id`

---

## Completed Milestones

### Phase 1 — Foundation `31137b9`

- Expo Router app with TypeScript, path alias `@/ → src/`
- SQLite client singleton with `PRAGMA journal_mode = WAL`
- `Repository<T>` base interface
- `useAppStore` with `isDbReady` flag
- Boot sequence in `_layout.tsx`: open DB → init repos → load data → set ready
- `babel-preset-expo` dependency fix `152c571`

### Phase 2A — Expense Creation `0524727`

- `expenses` table with all fields including `deleted_at`
- `ExpenseRepository`: `findAll`, `findById`, `save`, `delete` (soft)
- `useExpenseStore`: `loadExpenses`, `addExpense`
- Add Expense form: title, amount, currency, date, category chips, payment method chips, notes
- Expense list on home screen with empty state
- Expenses persist across app restarts

### Phase 2B — Expense Detail Architecture `0316577`

- `ExpenseRepository` extended: `getById`, `update`, `softDelete`
- `useExpenseStore` extended: `getExpenseById` (cache-first), `updateExpense`, `deleteExpense`
- Dynamic route `expense/[id].tsx` — read-only detail screen

### Phase 2C — Trip Domain Model `f8dde3c`

- `WorkTrip` entity type, `TripStatus`, `TripRepository` skeleton
- `Expense.workTripId?: string` FK field added to type

### Phase 3A — Complete Expense CRUD `f11af10` `f6c0abf`

- Edit form for an existing expense (pre-fill, validate, save via `updateExpense`)
- Delete confirmation dialog → `deleteExpense` → `router.back()`
- Status change picker → `updateExpense` with new status
- All three placeholder buttons on the detail screen unblocked

### Phase 3B — Trip UI `03ef6e3` `0dec5c4`

- `trips` table created in SQLite schema
- `work_trip_id` column added to `expenses` table
- `TripRepository` fully implemented: `list`, `getById`, `create`, `update`, `softDelete`
- `useTripStore`: `loadTrips`, `addTrip`, `getTripById`, `updateTrip`, `deleteTrip`
- Trip list (`/trips`), Add Trip modal, Edit Trip screen, Trip detail with expense list
- Expense edit form: trip picker chip set; assignment persisted via `work_trip_id`
- Trip detail: status totals section (per-status count + amount via `useMemo`)

### Phase 3C — Batch Management `041a325`

- `batches` table created in SQLite schema
- `reimbursement_batch_id` column added to `expenses` table
- `BatchRepository`: full CRUD + soft delete + `assignExpense`
- `useBatchStore`: full slice mirroring trip slice
- Batch list (`/batches`), Add Batch modal, Edit Batch screen, Batch detail
- Batch detail: expense list with trip name shown inline when `workTripId` is set

### Phase 3D — Cross-domain Workflow + Dashboard Selectors `e40ba17`

- Expense detail: Trip and Batch fields replaced with tappable `LinkField` (navigates to `/trip/[id]`, `/batch/[id]`)
- Expense edit: Batch chip picker added alongside Trip picker
- Batch detail: expense rows show trip name resolved from `useTripStore`
- Trip detail: status summary section with `StatusBadge + count + currency total` via `useMemo`
- `src/store/selectors.ts`: `expenseSelectors` — `totalUnsubmitted`, `totalSubmitted`, `totalApproved`, `totalPaid`, `countByStatus`, `totalByStatus`

### Phase 3E — Desktop Workspace Foundation `(current commit)`

- Primary platform shifted to Desktop Web; mobile remains secondary
- Navigation model changed from expense-centric to workspace-centric
  - `/` is now the Dashboard (was the expense list)
  - `/expenses` is now the dedicated expense list (`app/expenses.tsx` promoted)
- `app/index.tsx` rewritten as Dashboard:
  - 4 status cards (Unsubmitted / Submitted / Approved / Paid) with color-coded left borders
  - Each card shows amount total + expense count drawn from `expenseSelectors`
  - Open Trips + Draft Batches count cards
  - Quick Action buttons: Expenses, Trips, Batches
  - `useWindowDimensions` responsive layout: content centered, max-width 900px on screens ≥ 768px
- `app/_layout.tsx` simplified: header buttons removed, `expenses` screen registered, index title → "Dashboard"
- No new dependencies introduced

---

## Open Milestones

### Phase 4 — Supabase Sync

Blocked by: Phase 3 fully QA'd on web.

- Add Supabase project and env vars
- Auth (email / OAuth)
- Sync layer: local-first write, background push to Supabase
- Conflict resolution strategy (last-write-wins vs server-authoritative)
- RLS policies per user

### Phase 5 — Reports & Export

- Expense summary by category, trip, date range
- PDF or CSV export
- Submission workflow (status transitions: unsubmitted → submitted → approved/rejected → paid)

### Phase 6 — Dashboard Enhancements (future)

- Currency-aware totals (currently sums all amounts without normalizing currency)
- Date-range filter on dashboard cards
- Link from each status card to a filtered expense list

---

## Known Technical Debt

### TD-01 — Repository interface inconsistency

`ExpenseRepository` uses `findAll`/`findById`/`save`/`delete`.
`TripRepository` and `BatchRepository` use `list`/`getById`/`create`/`softDelete`.
The `Repository<T>` base interface is partially decorative.

**Risk:** Low — no runtime impact. Fix when starting Phase 4 sync layer.

### TD-02 — ID generation is not UUID v4

`generateId()` uses `Date.now().toString(36) + Math.random()`. Sufficient for single-device local use; not suitable for cross-device sync.

**Fix when:** Phase 4. Switch to `crypto.randomUUID()` (available in Hermes / RN 0.73+).

### TD-03 — No input validation on date and currency fields

The Add/Edit Expense form accepts any string for `date` and `currency`. An invalid date is stored without error.

**Fix when:** Phase 4 or a dedicated hardening sprint.

### TD-04 — Dashboard totals are currency-unaware

`expenseSelectors` sums all amounts regardless of currency. If a user mixes USD and EUR expenses, the total is meaningless.

**Risk:** Low for single-currency use. Fix during Phase 6.

### TD-05 — No automated tests

Zero test files exist. All validation is manual.

**Fix when:** After Phase 3 is QA'd on web.

### TD-06 — `useLocalSearchParams id` can be `string[]`

Detail screens assume `id` is `string`. Add `typeof id !== 'string'` guards during a hardening pass.

**Risk:** Very low in practice with a single dynamic segment.

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

**Recommended: Web QA + Polish**

The workspace-centric navigation model is in place. Before adding Supabase, verify the full user flow on web:

1. **Run `npx expo start --web`** — confirm Dashboard, Expenses, Trips, Batches all load and navigate correctly
2. **Desktop layout review** — verify 900px max-width centering, card grid, and quick actions render at 1280px+
3. **Mobile regression check** — verify Dashboard reads well at 375px (cards 2-up, actions in a row)
4. **Nav back-button audit** — pressing Back from Expenses/Trips/Batches returns to Dashboard
5. **Currency-aware totals (TD-04)** — decide whether to scope into this sprint or defer to Phase 6

After QA is clean, the codebase is ready for Phase 4 (Supabase auth + sync layer).
