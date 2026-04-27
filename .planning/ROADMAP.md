# Snacks 911 — Roadmap

## Phase 1 — Revenue Engine (Web + WhatsApp)
**Objetivo:** subir conversión y ticket promedio sin aumentar costos operativos.

### Phase 1.1: Menu + Cart + Upsell (Web)
**Goal:** Upsell Engine por proteína, recomendaciones, cross-sell de extras y validación de precios.
**Dependencies:** None
**UI hint:** yes
**Status:** ✅ Completed

### Phase 1.2: Admin Promos & Banners Editor
**Goal:** CRUD de promos (porcentaje, monto fijo, 2x1), editor de hero banner + textos, y programación/preview.
**Dependencies:** 1.1
**UI hint:** yes
**Status:** 🚧 In Progress / Completed partially (Basic UI implemented)

### Phase 1.3: Store Announcements (Real-time)
**Goal:** Mensajes de estado (e.g. "Cerramos 9pm", "No hay X hoy") visibles en web y bot.
**Dependencies:** 1.2
**UI hint:** yes
**Status:** 🚧 In Progress / Completed partially

### Phase 1.4: WhatsApp AI Sales Expert Bot (80/20)
**Goal:** Bot en WA API. 80% determinístico (menú, precios, carrito, recovery), 20% AI (recomendaciones, manejo de objeciones).
**Dependencies:** 1.1
**UI hint:** no
**Status:** ⏳ Not Started

---

## Phase 2 — Ops Engine (POS + Control Total)
**Objetivo:** control diario de ventas, caja, órdenes físicas/delivery y conciliación.

### Phase 2.1: POS Core
**Goal:** Captura rápida de órdenes, métodos de pago, comprobantes y estados (abierto/preparado/entregado).
**Dependencies:** 1.4
**UI hint:** yes
**Status:** ✅ Completed

### Phase 2.2: Cash Management + Daily Close
**Goal:** Apertura de caja, entradas/salidas, corte diario (expected vs actual) y reporte de ventas.
**Dependencies:** 2.1
**UI hint:** yes
**Status:** ✅ Completed

### Phase 2.3: Roles & Audit
**Goal:** Permisos estrictos por rol (admin/gerente/staff), logs de cambios y export (CSV).
**Dependencies:** 2.2
**UI hint:** yes
**Status:** ⏳ Not Started

### Phase 2.4: Review Control
**Goal:** UI para aprobar/ocultar reseñas de clientes y responder.
**Dependencies:** 2.3
**UI hint:** yes
**Status:** ⏳ Not Started

---

## Phase 3 — Multi-Tenant SaaS
**Objetivo:** convertir el sistema en plataforma para otros restaurantes sin reescribir todo.

### Phase 3.1: Multi-tenant Refactor
**Goal:** Migración DB con `tenant_id`, tests de aislamiento, SuperAdmin.
**Dependencies:** Phase 2
**UI hint:** no
**Status:** ⏳ Not Started

### Phase 3.2: Plans & Billing
**Goal:** Subscripciones (Starter/Pro), features toggles y facturación.
**Dependencies:** 3.1
**UI hint:** yes
**Status:** ⏳ Not Started

### Phase 3.3: Templates / Cloning
**Goal:** Clonar configuración base Snacks 911 a nuevos tenants y librería de bots reutilizables.
**Dependencies:** 3.2
**UI hint:** yes
**Status:** ⏳ Not Started
