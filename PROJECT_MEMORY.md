# PROJECT_MEMORY — Work Expense Reimbursement App

## Purpose

This document is the source of truth for future AI sessions.

Every new Claude Code session should read this file first before making decisions or writing code.

The goal is to reduce token usage, avoid relying on old conversation context, and keep development consistent.

## User Working Style

The user is an AI-Orchestrated Product Builder, not a traditional developer.

Working model:
- ChatGPT = Product Architect / Sprint Manager
- Claude Code = Implementation Engineer
- Lovable = UX reviewer / desktop UI advisor
- GitHub = source of truth for code history

The user prefers:
- Hebrew guidance from ChatGPT
- copy-ready prompts
- small milestones
- clear validation
- clean commits
- minimal unnecessary technical overload

## Platform Priority

Primary platform:
Desktop Web

Secondary platform:
Mobile

The user explicitly decided that desktop usage is the priority.
Mobile support should remain functional, but desktop UX decisions take precedence.

## Product Goal

A desktop-first reimbursement management system for work expenses.

The system should help ensure that no reimbursable work expense is forgotten.

The user should always know:
- what was paid
- what trip/event it belongs to
- whether there is a receipt
- whether it was submitted
- whether it was approved
- whether it was actually reimbursed
- which reimbursement batch it belongs to
- what is still open or missing

## Architecture

Mandatory architecture:

UI
→ Zustand Store
→ Repository
→ SQLite

Rules:
- Screens must not access SQLite directly.
- Stores must not contain raw SQL.
- Repositories own database access.
- SQLite is the local source of truth.
- Supabase/cloud sync is deferred.
- Do not add OCR, AI, auth, Supabase, or backend services unless explicitly requested.
- Keep the app local-first, offline-first, modular, and maintainable.

## Tech Stack

- Expo SDK 56
- React Native 0.85
- TypeScript 6
- Expo Router
- expo-sqlite 56
- Zustand 5
- GitHub
- Claude Code local development
- Expo Web / Android Emulator for runtime checks

GitHub repository:
https://github.com/arieldeitch/reimbursement

## Current Known Repository State

Branch:
master

Remote:
origin → https://github.com/arieldeitch/reimbursement.git

Recent known HEAD:
53dc61e — feat(reports): add batch export and report screens

Previous important commits:
- 708ee83 — feat(desktop): add workspace navigation and expense table
- 9b66853 — fix(currency): prevent mixed-currency totals
- 65f20fb — feat(submission): add reimbursement readiness workflow
- c4a3aea — feat(export): add trip expense csv export
- bf7048e — feat(workspace): introduce desktop-first workspace layout
- e40ba17 — feat(workflow): connect expense trip and batch experiences
- 041a325 — feat(batches): add local reimbursement batch management
- 0dec5c4 — feat(trips): connect expenses to trips

Known tags:
- milestone-v0.4-expenses-trips
- milestone-v0.5-workspace-export

## Completed Features

### Foundation
- Expo app
- TypeScript
- Expo Router
- SQLite setup
- WAL mode
- foreign keys
- Zustand stores
- Repository pattern
- path alias @/
- DB readiness state

### Expenses
- Expense CRUD
- Add Expense
- Edit Expense
- Expense Detail
- Soft Delete
- Status workflow:
  - unsubmitted
  - submitted
  - approved
  - paid
  - rejected
- StatusBadge
- Receipt tracking:
  - hasReceipt
  - receiptMissingReason
- Missing receipt warnings
- Expense assignment to Trip
- Expense assignment to Batch

### Trips
- Trip CRUD
- Trip Detail
- Trip Edit
- Trip persistence in SQLite
- Expense ↔ Trip assignment
- Trip expense list
- Trip status summary
- Trip readiness indicators
- Missing receipt count
- Trip CSV export
- Trip report screen

### Reimbursement Batches
- ReimbursementBatch type
- Batch CRUD
- Batch Detail
- Batch Edit
- Expense ↔ Batch assignment
- Batch readiness indicators
- Batch status
- Batch totals
- Assigned expenses section
- Unbatched expenses assignment UI
- Batch CSV export
- Batch report screen

### Workspace / Dashboard
- Desktop-first dashboard
- / = Dashboard
- /expenses = Expenses
- /trips = Trips
- /batches = Batches
- Persistent desktop sidebar
- Dashboard status cards:
  - Unsubmitted
  - Submitted
  - Approved
  - Paid
- Open trips count
- Draft batches count
- Per-currency totals
- Dashboard cards navigate to filtered Expenses

### Desktop Workspace
- Sidebar navigation
- Expenses desktop table
- Mobile cards preserved
- Search by title and notes
- Filters:
  - Status
  - Trip
  - Batch
- Desktop-first responsive layouts

### Reporting / Export
- tripSummaryReportData()
- batchSummaryReportData()
- Trip CSV export
- Batch CSV export
- Trip report screen
- Batch report screen
- Currency safety fix:
  do not sum across currencies

## Current Product Capabilities

The app can currently:
- record expenses
- edit expenses
- change expense status
- mark receipts present or missing
- organize expenses by trip
- organize expenses by reimbursement batch
- track submission readiness
- detect missing receipts
- view dashboard metrics
- search and filter expenses
- export trip CSV
- export batch CSV
- view trip reports
- view batch reports
- run as desktop web app through Expo Web

## Known Technical Debt

### P1
No current known P1 blocker after currency safety fix.

### P2
- No actual receipt file attachments yet
- No PDF export
- No automated tests
- Reporting exists but printable/PDF workflow is not complete
- No batch/trip bulk actions

### P3
- ID generation may still not be UUID v4
- No Supabase sync
- No auth
- Validation can be improved
- Repository naming/interface may not be fully consistent

## Lovable Decision

Lovable analyzed the repository and confirmed:
- this is an Expo / React Native project
- the Lovable TanStack Start template is a different stack
- porting to TanStack would effectively be a rebuild

Decision:
Do not port to TanStack unless explicitly requested.

Use Lovable only for:
- UX review
- desktop workspace recommendations
- visual hierarchy suggestions

Claude Code remains the implementation tool.

## Recommended Next Step

Before any new feature sprint:
Run a project audit.

Recommended next sprint:
Production Readiness Audit / v1.0 Definition

Goals:
- verify every route
- check navigation
- check exports
- identify dead code
- rank technical debt
- define v1.0 scope

Alternative next sprint:
Receipt Attachments

Only if the user wants to move closer to real submission with actual receipt files.

## Standard Session Start Protocol

Every new Claude Code session must start with:

1. Read PROJECT_MEMORY.md.
2. Run:
   - git status
   - git log --oneline -10
   - npm run typecheck
3. Compare repository reality against this document.
4. Report differences.
5. Do not write code until the user approves the proposed sprint.

## Standard Sprint Format

Every sprint must include:
- Goal
- Scope
- Do Not
- Files likely affected
- Validation checklist
- Commit message

Do not start implementation until scope is clear.

## Current Preferred Next Prompt Pattern

Use this at the start of a fresh Claude Code session:

PROJECT CONTINUATION MODE

Read PROJECT_MEMORY.md completely.

Treat it as the source of truth.

Then verify:

- git status
- git log --oneline -10
- npm run typecheck

Compare repository reality to PROJECT_MEMORY.md.

Report:
- current state
- differences
- risks
- recommended next sprint

Do not modify code.
Do not create commits.
Output only the sprint proposal.
