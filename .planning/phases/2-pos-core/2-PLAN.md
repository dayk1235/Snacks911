---
phase: 2.1
name: POS Core
wave: 1
depends_on: []
files_modified:
  - "src/app/admin/pos/page.tsx"
  - "src/app/api/pos/orders/route.ts"
  - "src/lib/posStore.ts"
autonomous: true
---

# Phase 2.1 — POS Core

## Goal
Pantalla de Punto de Venta para el staff de Snacks 911. Captura rápida de órdenes físicas desde el mismo dashboard. Usa las tablas `orders` y `order_items` que ya existen en Supabase.

## Tasks

<task>
  <objective>Create POS Orders API</objective>
  <action>
    Create `src/app/api/pos/orders/route.ts`.
    GET: list today's orders (channel=POS).
    POST: create a new order with items (validates products/prices from DB).
    PATCH: update order status (open→preparing→delivered|cancelled).
  </action>
</task>

<task>
  <objective>Create POS Zustand Store</objective>
  <action>
    Create `src/lib/posStore.ts`.
    State: activeCart (items), paymentMethod, deliveryType, orders[], isLoading.
    Actions: addItem, removeItem, setQty, setPayment, submitOrder, fetchTodayOrders, updateStatus.
  </action>
</task>

<task>
  <objective>Build POS UI Page</objective>
  <action>
    Create `src/app/admin/pos/page.tsx`.
    Split layout: Left = product grid (by category) | Right = live cart + checkout.
    Features: tap product to add, qty +/-, payment method selector, submit order button.
    Bottom: today's orders list with status toggle (badge: Abierto/Preparando/Entregado).
  </action>
</task>
