---
phase: 2.2
name: Cash Management + Daily Close
wave: 1
depends_on: ["2.1"]
files_modified:
  - "supabase/migrations/20260427_cash_mgmt.sql"
  - "src/app/api/cash/route.ts"
  - "src/lib/cashStore.ts"
  - "src/app/admin/cash/page.tsx"
autonomous: true
---

# Phase 2.2 — Cash Management + Daily Close

## Goal
Apertura/cierre de caja, entradas y salidas de efectivo, corte diario con expected vs actual, y reporte de ventas del día.

## Tasks

<task>
  <objective>DB Migration — cash tables</objective>
  <action>
    Create `supabase/migrations/20260427_cash_mgmt.sql`.
    Table `cash_sessions`: id, opened_at, closed_at, opening_amount, closing_amount, expected_amount, status (open|closed).
    Table `cash_movements`: id, session_id (FK), type (IN|OUT), amount, concept, created_at.
  </action>
</task>

<task>
  <objective>Cash API</objective>
  <action>
    Create `src/app/api/cash/route.ts`.
    POST /open: open session with opening_amount.
    POST /close: close session, record closing_amount.
    POST /movement: add IN/OUT movement.
    GET: return today's open session + movements + daily sales total from orders.
  </action>
</task>

<task>
  <objective>Cash Zustand Store</objective>
  <action>
    Create `src/lib/cashStore.ts`.
    State: session, movements, dailySalesTotal, isLoading.
    Actions: openSession, closeSession, addMovement, fetchSession.
  </action>
</task>

<task>
  <objective>Cash UI Page</objective>
  <action>
    Create `src/app/admin/cash/page.tsx`.
    If no session: button "Abrir Caja" with opening amount input.
    If open: show movements list, add IN/OUT form, daily totals summary.
    Close button shows expected vs actual diff before confirming.
  </action>
</task>
