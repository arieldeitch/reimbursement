# QA Checklist — Reimbursement v0.7

Run before every public release. Test on **desktop browser** (primary) and **Android emulator** (secondary).

---

## Setup

- [ ] `npm run typecheck` — zero TypeScript errors
- [ ] `npx expo export --platform web` — build completes
- [ ] App loads in browser — no white screen, no console errors
- [ ] Database initializes — Settings screen shows "Connected"

---

## Navigation

- [ ] Sidebar appears on desktop (width ≥ 768px)
- [ ] Sidebar is hidden on mobile / narrow viewport
- [ ] Dashboard link navigates to `/`
- [ ] Expenses link navigates to `/expenses`
- [ ] Trips link navigates to `/trips`
- [ ] Batches link navigates to `/batches`
- [ ] Settings link navigates to `/settings`
- [ ] About link navigates to `/about`
- [ ] Active sidebar item is highlighted

---

## Expense Flow

- [ ] `/expenses` loads with table header (desktop) or card list (mobile)
- [ ] Empty state is shown when no expenses exist
- [ ] "+ Add Expense" button opens the add expense form
- [ ] Add Expense: fill all required fields and save → expense appears in list
- [ ] Add Expense: missing required field → app does not crash
- [ ] Click expense row → `/expense/[id]` detail opens
- [ ] Edit Expense: changes save and appear immediately in list and detail
- [ ] Change Status: status updates and badge refreshes
- [ ] Delete Expense: confirmation appears; expense disappears from list
- [ ] Receipt tracking: marking "has receipt" persists
- [ ] Status filter chips filter the list correctly
- [ ] Trip filter shows only expenses for that trip
- [ ] Batch filter shows only expenses for that batch
- [ ] Search by title — results filter correctly
- [ ] Search by notes — results filter correctly
- [ ] Dashboard status cards navigate to filtered expenses

---

## Trip Flow

- [ ] `/trips` loads — empty state when no trips exist
- [ ] "+ New Trip" creates a trip; it appears in the list
- [ ] Click trip → `/trip/[id]` opens
- [ ] Edit Trip: changes persist
- [ ] Trip Detail shows assigned expenses count
- [ ] Trip Report `/trip-report/[id]` loads correctly
- [ ] Trip Report shows receipt readiness, currency totals, status breakdown
- [ ] Trip Report expense table renders on desktop
- [ ] CSV Export from Trip Report — file downloads without error

---

## Batch Flow

- [ ] `/batches` loads — empty state when no batches exist
- [ ] "+ New Batch" creates a batch; it appears in the list
- [ ] Click batch → `/batch/[id]` opens
- [ ] Edit Batch: changes persist
- [ ] Batch Detail shows assigned expenses and totals
- [ ] Expenses can be assigned to a batch from the Batch Detail screen
- [ ] Batch Report `/batch-report/[id]` loads correctly
- [ ] Batch Report shows receipt readiness, currency totals, unsubmitted count
- [ ] Batch Report expense table renders on desktop (includes Trip column)
- [ ] CSV Export from Batch Report — file downloads without error

---

## Reports

- [ ] `/trip-report/[id]` — not-found state shows "Trip not found" with Back button
- [ ] `/batch-report/[id]` — not-found state shows "Batch not found" with Back button
- [ ] Report header shows Back link that navigates to previous screen
- [ ] Desktop reports use two-column layout (meta panel left, expense table right)

---

## Settings Screen

- [ ] `/settings` loads
- [ ] Database status shows "Connected" (green)
- [ ] Expense count matches actual expense count
- [ ] Trip count matches actual trip count
- [ ] Batch count matches actual batch count
- [ ] Version number matches `src/constants/version.ts`

---

## About Screen

- [ ] `/about` loads
- [ ] App name, version, release date, and release name are displayed
- [ ] Capabilities list is visible

---

## Desktop-Specific

- [ ] Sidebar is visible and sticky at all times
- [ ] Expense table has correct columns: Date, Title, Category, Amount, Currency, Status, Trip, Batch, Receipt
- [ ] Long titles in table truncate with ellipsis
- [ ] Pressing a table row opens the expense detail
- [ ] Trip report two-column layout (meta left, table right)
- [ ] Batch report two-column layout (meta left, table right)
- [ ] About and Settings pages center content with max-width

---

## Mobile-Specific

- [ ] Expense list shows cards instead of a table
- [ ] "+ Add Expense" FAB is visible and tappable
- [ ] Trip list shows cards with status badge
- [ ] Batch list shows cards with expense summary
- [ ] Stack Navigator header titles are correct
- [ ] Back navigation works on all detail screens

---

## Edge Cases

- [ ] App with zero expenses — no crash, Dashboard shows dashes
- [ ] Expense with no trip / no batch — "—" displayed in table
- [ ] Expense with missing receipt — warning indicator shown in reports
- [ ] Mixed currencies — Dashboard shows separate lines per currency, no summing
- [ ] Large number of expenses (20+) — list scrolls correctly

---

## Known Non-Issues (do not file as bugs)

- CRLF git warnings on Windows
- npm audit moderate warnings on dev dependencies
- react-native-worklets peer dependency warning
