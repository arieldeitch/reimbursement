# Sprint Progress Dashboard

**Project:** Reimbursement Tracker (Mobile)
**Date:** 2026-06-03
**Repo:** `C:\Users\user\Documents\GitHub\reimbursement`

---

## Current Architecture

```
app/                        ← Expo Router screens (UI layer)
  _layout.tsx               ← Root Stack, boots DB + loads expenses
  index.tsx                 ← Expense list screen
  add-expense.tsx           ← Add expense modal
  expense/[id].tsx          ← Expense detail screen (skeleton)

src/
  db/
    client.ts               ← SQLite singleton, schema init
  repositories/
    index.ts                ← Repository<T> base interface
    expenseRepository.ts    ← Full CRUD + soft delete
    tripRepository.ts       ← Skeleton only, throws on all calls
  store/
    index.ts                ← useAppStore (boot / DB-ready flag)
    expenseSlice.ts         ← useExpenseStore (list, add, get, update, delete)
  types/
    entity.ts               ← Entity base interface (id, createdAt, updatedAt)
    expense.ts              ← Expense, ExpenseStatus, ExpenseCategory, PaymentMethod
    trip.ts                 ← WorkTrip, TripStatus
    index.ts                ← Barrel re-export
```

### Layer rules (enforced throughout)

```
Screen → useExpenseStore → ExpenseRepository → SQLite
           (Zustand)         (class singleton)   (expo-sqlite)
```

No screen touches SQLite directly. No store holds raw SQL.

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
- Tables: `expenses` only
- Soft delete: `deleted_at` column on all entities (convention)

---

## Completed Milestones

### Phase 1 — Foundation `31137b9`

- Expo Router app with TypeScript, path alias `@/ → src/`
- SQLite client singleton with `PRAGMA journal_mode = WAL`
- `Repository<T>` base interface
- `useAppStore` with `isDbReady` flag
- Boot sequence in `_layout.tsx`: open DB → init repo → load data → set ready
- `babel-preset-expo` dependency fix `152c571`

### Phase 2A — Expense Creation `0524727`

- `expenses` table with all fields including `deleted_at`
- `ExpenseRepository`: `findAll`, `findById`, `save`, `delete` (soft)
- `useExpenseStore`: `loadExpenses`, `addExpense`
- Add Expense modal form: title, amount, currency, date, category chips, payment method chips, notes
- Expense list on home screen with empty state
- Expenses persist across app restarts

### Phase 2B — Expense Detail Architecture `0316577`

- `ExpenseRepository` extended: `getById`, `update`, `softDelete`
- `useExpenseStore` extended: `getExpenseById` (cache-first), `updateExpense`, `deleteExpense`
- Dynamic route `app/expense/[id].tsx` registered in root Stack
- Detail screen: loads by id, displays all fields read-only
- Placeholder buttons: Edit, Change Status, Delete (each shows an Alert)
- List items tappable → navigate to detail

### Phase 2C — Trip Domain Model `f8dde3c`

- `WorkTrip` entity type: all fields including optional `client`, `notes`, `deletedAt`
- `TripStatus`: `open | closed`
- `TripRepository` skeleton: correct method signatures (`list`, `getById`, `create`, `update`, `softDelete`), all throw until DB table exists
- `initTripRepository` / `getTripRepository` singleton helpers ready to wire
- `Expense.workTripId?: string` added with architecture comment documenting the future FK relationship
- Zero UI changes, zero schema changes

---

## Open Milestones

### Phase 3A — Complete Expense CRUD

- Edit form for an existing expense (pre-fill, validate, save via `updateExpense`)
- Delete confirmation dialog → calls `deleteExpense`, pops back to list
- Status change picker → calls `updateExpense` with new status
- Unblock the three placeholder buttons on the detail screen

### Phase 3B — Trip UI

Depends on activating `TripRepository` (four-step checklist in `tripRepository.ts`):

1. `CREATE TABLE trips` in `src/db/client.ts _initSchema`
2. `ALTER TABLE expenses ADD COLUMN work_trip_id TEXT` migration
3. `initTripRepository(db)` call in `_layout.tsx`
4. `useTripStore` Zustand slice

Then: Trip list screen, Add Trip form, Trip detail screen, link expenses to a trip.

### Phase 4 — Supabase Sync

Blocked by: stable local SQLite flow (Phases 1–3 fully QA'd).

- Add Supabase project and env vars
- Auth (email / OAuth)
- Sync layer: local-first write, background push to Supabase
- Conflict resolution strategy (last-write-wins vs server-authoritative)
- RLS policies per user

### Phase 5 — Reports & Export

- Expense summary by category, trip, date range
- PDF or CSV export
- Submission workflow (status transitions: unsubmitted → submitted → approved/rejected → paid)

---

## Known Technical Debt

### TD-01 — `workTripId` typed but not in schema

`Expense.workTripId` exists in TypeScript but the `expenses` SQLite table has no `work_trip_id` column. Saving an expense with this field set silently discards it. The column must be added via `ALTER TABLE` before this field is usable.

**Risk:** Low until Trip UI starts. Blocked by Phase 3B activation.

### TD-02 — ExpenseRepository.update() does not write workTripId

`update()` in `expenseRepository.ts` lists every column explicitly and does not include `work_trip_id`. When TD-01 is resolved, this method must also be updated.

**Risk:** Same as TD-01.

### TD-03 — Repository interface inconsistency

`ExpenseRepository` implements `Repository<T>` (`findAll`, `findById`, `save`, `delete`).
`TripRepository` uses different names (`list`, `getById`, `create`, `softDelete`).
The base interface is partially decorative — it does not enforce `update` or `softDelete`.

**Fix when:** Trip UI is activated. Options: align method names, or replace the base interface with a more complete one.

### TD-04 — No input validation on date and currency fields

The Add Expense form accepts any string for `date` and `currency`. An invalid date (e.g. `"abc"`) is stored and displayed without error. A blank currency field falls back to `'USD'` in the store action but accepts any value otherwise.

**Fix when:** Phase 3A. Add format validation before the Save button activates.

### TD-05 — ID generation is not UUID v4

`generateId()` in `expenseRepository.ts` uses `Date.now().toString(36) + Math.random()`. This is sufficient for a single-device local app but not suitable for cross-device sync (Supabase phase).

**Fix when:** Phase 4. Switch to `crypto.randomUUID()` (available in Hermes / RN 0.73+) or `expo-crypto`.

### TD-06 — No automated tests

Zero test files exist. All validation is manual.

**Fix when:** After Phase 3 is stable. Suggested starting point: repository unit tests with an in-memory SQLite DB.

### TD-07 — useLocalSearchParams id can theoretically be string[]

`useLocalSearchParams<{ id: string }>()` in `expense/[id].tsx` — Expo Router types `id` as `string | string[]` in some configurations. The screen assumes `string` and passes it directly to `getExpenseById`. In practice this does not occur with a single dynamic segment, but the guard is absent.

**Risk:** Very low. Harmless to add a `typeof id !== 'string'` guard during Phase 3A.

---

## Known Non-Issues

| Symptom | Explanation |
|---|---|
| CRLF warnings on `git add` | Windows line-ending conversion — harmless, no action needed |
| `npm audit` moderate severity | Third-party transitive deps (uuid, etc.), unrelated to app logic |
| `react-native-worklets` peer warning during install | Optional peer of `expo-modules-core`, not used by this app |
| `react-dom` peer conflict when running `npx expo install` | Use `npm install --legacy-peer-deps` directly for packages that trigger it |
| `expo-env.d.ts` not in git | Correctly gitignored; auto-generated by `expo start` on first run |
| `.claude/` not in git | Correctly gitignored; Claude Code memory directory |

---

## Next Sprint Recommendation

**Recommended: Phase 3A — Complete Expense CRUD**

The detail screen already exists with the right structure and placeholder buttons. Completing CRUD closes the loop on the core user flow before any new domain (trips) is introduced.

Suggested order within the sprint:

1. **Delete** — simplest: confirmation `Alert` → `deleteExpense(id)` → `router.back()`
2. **Edit form** — reuse Add Expense form layout, pre-fill from the loaded expense, submit via `updateExpense`
3. **Status change** — `ActionSheet` or modal picker over the five statuses, submit via `updateExpense`

After Phase 3A is QA'd and the full expense lifecycle works end-to-end, Phase 3B (Trip UI) can begin with low risk because the foundation is stable.

**Do not start Phase 4 (Supabase) until Phase 3 is complete.** The local-first architecture rule exists precisely to ensure the offline flow is solid before sync is layered on top.
