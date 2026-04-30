# 🚨 Snacks 911 — ROADMAP ESTRATÉGICO v2.0 (Implementable)

> **"No vendemos comida. Vendemos certeza, velocidad y conexión."**

**Estado:** 🟢 Validado en campo
**Última actualización:** 2024
**Objetivo:** Motor de ingresos con memoria, personalización y escala controlada

---

# 0) 🧠 CEO Lens: Principios de Prioridad

- **Revenue primero** → Features que impactan conversión, ticket o retención medible
- **Estabilidad antes de escala** → APIs oficiales + circuit breakers antes de multi-tenant
- **Datos antes de optimización** → Analytics accionables antes de AI avanzado
- **Control antes de magia** → Flujos determinísticos con LLM estratégico
- **Innovación con propósito** → Solo features con ventaja competitiva defendible

---

# 1) 📊 North Star & Metrics

## 1.1 North Star Metric

**LTV = avgTicket × ordersPerYear × retentionYears**

🎯 Target: **$2,400 MXN/año por cliente**

---

## 1.2 Leading Indicators

- Bot conversion rate → **>35%**
- Upsell acceptance (flavor-based) → **>30%**
- Flavor gap CTR → **>25%**
- Group order adoption → **>15%**
- Kitchen-customer resolution rate → **>80%**
- Retención 30d → **>45%**
- Avg response time → **<2s**

---

## 1.3 Lagging Indicators

- MRR / ingresos mensuales
- LTV/CAC → **>3**
- Margen bruto → **>40%**
- NPS → **>50**

---

# 2) ⚙️ Arquitectura de Control

## 2.1 Event Log (OBLIGATORIO)

### Contrato mínimo

```ts
{
  tenant_id,
  event_type,
  occurred_at,
  actor,
  channel,
  order_id?,
  cart_id?,
  customer_phone,
  session_id?,
  idempotency_key,
  payload_json
}
```

### Eventos base

**Bot / WhatsApp**
- `bot_message_received`
- `bot_reply_sent`
- `fallback_triggered`
- `circuit_opened`
- `llm_call_started` / `completed` / `failed`

**Carrito / Orden**
- `cart_created`
- `cart_abandoned`
- `cart_recovered`
- `promo_applied`
- `upsell_suggested`
- `upsell_accepted`
- `order_created`
- `order_paid`
- `order_completed`
- `order_delayed_detected`
- `substitution_requested` / `confirmed`

**Experiencia / CRM**
- `customer_profile_updated`
- `customer_responded_to_promo`
- `objection_detected` / `resolved`

**VoC**
- `review_submitted`
- `review_approved` / `hidden`
- `voc_batch_processed`

📌 **Regla:** Todo evento que impacta KPI → `idempotency_key` + payload suficiente

---

## 2.2 Feature Flags + Kill Switch

```ts
{
  flag_name,
  enabled_default,
  default_experiment_mode,
  evaluation_window,
  stop_conditions,
  fallback_behavior
}
```

## 2.3 Gates

Cada feature debe declarar:
- Inputs
- Outputs
- Event contracts

🚫 **No avanzar sin dependencias completas**

---

# 3) 🧬 Data Contracts

## 3.1 CustomerProfile

```ts
interface CustomerProfile {
  phone: string
  name?: string
  createdAt: Date
  lastSeen: Date

  totalOrders: number
  totalSpent: number
  avgTicket: number

  favoriteItems: Array<{
    itemId: string
    orderCount: number
    lastOrdered: Date
  }>

  flavorProfile: {
    spicy: number
    savory: number
    sweet: number
    crispy: number
    creamy: number
  }

  occasionPatterns: {
    fridayNight: boolean
    lunchRush: boolean
    rainyDay: boolean
  }

  priceSegment: 'budget' | 'mid' | 'premium'

  predictedNextOrder: Date | null

  wonByDiscount: boolean
  upsellSuccess: number

  preferredUpsellType: 'value' | 'premium' | 'bundle' | null

  completionRate: number
  respondsToPromos: boolean
  needsHandholding: boolean
}
```

## 3.2 Taste Graph & Moat Metrics
- Flavor drift stability
- Incremental conversion by recommendation
- Flavor gap uplift
- Data freshness score

---

# 4) 🛡️ Resilience Standard

## 4.1 Degradación elegante
- Redis falla → PostgreSQL + LRU cache
- LLM >2s → fallback determinístico
- WhatsApp 429 → queue + exponential backoff

**Evento obligatorio:** `fallback_triggered`

## 4.2 SLOs
- `fallback_usage_rate` < 5%
- `avg_response_time` < 2s

---

# 5) 🚀 ROADMAP

## ✅ Phase 0 — Completo
- Menu + Cart + Upsell Engine
- Admin Promos & Banners
- Store Announcements
- WhatsApp AI Sales Bot
- Conversational Flow Engine
- POS Core
- Cash Management
- Roles & Audit

---

## 🔥 PHASE 1 — Revenue Intelligence & Resilience

### 1.6 Customer Memory & Context
- Perfil persistente
- Taste Graph
- Predicción básica
- **Modo:** Shadow
- **Evento:** `customer_profile_updated`

### 1.7 Intelligent Sales Layer
- LLM solo en: objeciones, upsell por flavor gap, intención vaga
- **Modo:** Shadow → Holdout → ON
- **KPIs:** conversion uplift, upsell acceptance

### 1.8 Dynamic Menu Personalization
- Personalización por: hora/día, price segment, flavor profile
- **Experimento:** 80/20 holdout

### 1.9 Resilience Layer (CRITICAL)
- Circuit breakers
- LLM timeout 2s
- Cache fallback
- **KPIs:** fallback <5%, response <2s

---

## 🧠 1.10 Sales System Engine (Omnicanal) **[NUEVO]**

**Scope:** Sistema unificado de ventas para Web, WhatsApp manual, Bot automático y Atención en persona.

### 🎯 Objetivo
Convertir ventas en un sistema determinístico:
`INPUT → DETECCIÓN → RECOMENDACIÓN → UPSELL → CIERRE → RETENCIÓN`

### ⚙️ Motor de decisiones (reglas obligatorias)
- Siempre preguntar antes de vender
- Nunca listar → siempre recomendar
- Siempre empujar combos
- Siempre intentar 1 upsell
- Siempre cerrar con acción

### 🧩 Componentes técnicos

```ts
/lib/sales/
  ├── intentDetector.ts
  ├── recommendationEngine.ts
  ├── upsellEngine.ts
  ├── closingEngine.ts
  ├── inventoryMiddleware.ts      // [NUEVO]
  ├── consultativeMatrix.ts       // [NUEVO]
  ├── abandonmentRecovery.ts      // [NUEVO]
  ├── humanHandoff.ts             // [NUEVO]
  └── salesThermostat.ts          // [NUEVO]
```

### 🧠 Responsabilidades Expandidas

| Componente | Función |
| :--- | :--- |
| `intentDetector` | Clasifica intención (hambre fuerte / leve / indeciso) |
| `recommendationEngine` | Sugiere producto óptimo |
| `upsellEngine` | Incrementa ticket |
| `closingEngine` | Convierte a orden |
| **`inventoryMiddleware`** | **Valida stock en tiempo real antes de recomendar** |
| **`consultativeMatrix`** | **Aplica reglas de negocio (márgenes, prioridades)** |
| **`abandonmentRecovery`** | **Recupera carritos abandonados (>5 min)** |
| **`humanHandoff`** | **Transfiere a humano con contexto completo** |
| **`salesThermostat`** | **Ajusta agresividad de venta según horario/condición** |

---

### 🆕 1.10.1 Inventory Middleware (Stock Real-Time)

**Propósito:** Evitar vender lo que no hay. Bloquear recomendaciones si `stock < threshold`.

**Contrato:**
```ts
interface StockCheck {
  itemId: string;
  available: boolean;
  quantity: number;
  lowStockThreshold: number;
}

// Middleware flow
async function checkStock(items: string[]): Promise<boolean> {
  // Return false if any critical item is out of stock
}
```

**Eventos:**
- `stock_conflict_detected`
- `alternative_suggested_due_to_stock`

**KPI:** `Stock conflict rate` (<2%)

---

### 🆕 1.10.2 Consultative Matrix (Reglas de Negocio)

**Propósito:** Configurar estrategia de ventas sin tocar código. Archivo JSON centralizado.

**Config (`sales-rules.json`):**
```json
{
  "priorityItems": ["combo-familiar", "bebida-grande"],
  "maxDiscountPercent": 15,
  "marginProtection": true,
  "blockedUpsells": ["postre"],
  "happyHour": {
    "start": "15:00",
    "end": "18:00",
    "multiplier": 1.2
  }
}
```

**Responsabilidad:** El motor consulta este JSON antes de generar cualquier upsell.

---

### 🆕 1.10.3 Abandonment Recovery Module

**Propósito:** Recuperar ventas perdidas automáticamente.

**Lógica:**
1. Detectar `cart_abandoned` > 5 minutos.
2. Verificar si el cliente tiene historial de recuperación (`respondsToPromos`).
3. Enviar mensaje personalizado (no genérico): *"¿Te quedaste con hambre? Tu orden te espera."*
4. Si no responde en 1h → Enviar cupón pequeño (reglado en Matrix).

**Eventos:**
- `recovery_attempted`
- `cart_recovered`

**KPI:** `Recovery conversion rate` (>15%)

---

### 🆕 1.10.4 Human Handoff Intelligence

**Propósito:** Detectar frustración o complejidad y pasar a humano sin perder contexto.

**Triggers:**
- Cliente dice "humano", "dueño", "queja".
- 3 intentos fallidos de entender intención.
- Valor del carrito > $X (venta de alto valor).

**Payload al agente:**
```ts
{
  conversationSummary: "...",
  currentCart: [...],
  customerSentiment: "frustrated",
  suggestedSolution: "..."
}
```

**Evento:** `handoff_executed`
**KPI:** `Handoff success rate` (Resolución en primer contacto)

---

### 🆕 1.10.5 Sales Thermostat (Agresividad Dinámica)

**Propósito:** Ajustar el "tono" de venta según contexto externo.

**Inputs:**
- Hora del día (Pico vs Valle)
- Clima (Lluvia = más antojos/comida comfort)
- Carga de cocina (Si cocina está saturada → reducir upsells complejos)

**Niveles:**
- `ECO`: Solo tomar pedido (Horarios pico extremos)
- `STANDARD`: Upsell básico (Normal)
- `AGGRESSIVE`: Push de combos y márgenes altos (Horarios valle)

**Evento:** `thermostat_level_changed`

---

### 💬 Flujos base (determinísticos)
Casos cubiertos: Cliente nuevo, indeciso, pregunta precio, listo para comprar, recurrente.

### 🎛️ Event Log (Actualizado)
Agregar eventos:
- `intent_detected`
- `recommendation_shown`
- `upsell_suggested` / `accepted`
- `sale_closed`
- `stock_conflict_detected`
- `recovery_attempted` / `cart_recovered`
- `handoff_executed`
- `thermostat_level_changed`

📌 **Todos con `idempotency_key`**

### 📊 KPIs Fase 1.10

| KPI | Target |
| :--- | :--- |
| Conversión Global | +20% |
| Ticket promedio | +13% |
| Upsell rate | >30% |
| Tiempo decisión | <30s |
| **Recuperación carritos** | **>15%** |
| **Éxito Handoff** | **>90%** |

### 🧠 UI/UX Integration
- Botones de decisión rápida ("🔥 Tengo mucha hambre", "😌 Algo leve").
- Indicador visual de "Pocas unidades" si `lowStock`.
- Botón flotante "Hablar con alguien" visible solo si `thermostat` lo permite o hay trigger.

### 🤖 Bot Integration
- 80% lógica determinística (Motor de reglas).
- 20% LLM (Objeciones, casos raros, handoff).
- Fallback obligatorio a flujo determinístico.

### 🔁 Feedback Loop
Frecuencia: semanal. Optimizar scripts, combos y conversión por flujo.

### 🚀 Gates (No avanzar sin)
- Intent detection funcionando.
- Recommendation engine activo.
- **Inventory middleware conectado.**
- **Matriz de reglas cargada.**
- Event tracking completo.

### 📌 Dependencias
- 1.6 Customer Memory
- 1.7 Intelligent Sales Layer
- POS Inventory API (Real-time)

### ⚠️ Riesgos & Mitigación

| Riesgo | Mitigación |
| :--- | :--- |
| Scripts rígidos | Feedback loop semanal |
| Mala detección | Fallback + LLM |
| UX con fusa | Botones guiados |
| **Stock desactualizado** | **Polling cada 30s + Webhooks POS** |
| **Handoff sin contexto** | **Payload obligatorio pre-transferencia** |

### 🟢 Status: ✅ Completed

---

## 🧪 PHASE 2 — Analytics & Stability
- 2.4 Analytics & Revenue Intelligence (Dashboards, Alertas)

## 🏗️ PHASE 3 — Scale Foundation
- 3.1 WhatsApp Cloud API (BLOCKER)
- 3.2 Multi-tenant Refactor
- 3.3 Billing & Templates

## 🚀 PHASE 4 — Innovación
- 4.1 Group Ordering
- 4.2 Kitchen-Customer Sync
- 4.3 Voice of Customer (VoC)
- 4.4 Predictive Prep
- 4.5 Order DNA

---

# 6) 📅 Sprints (actualizado)

| Sprint | Features |
| :--- | :--- |
| **Sprint 1-2** | 1.9 Resilience + 1.6 Memory (shadow) |
| **Sprint 3-4** | **✅ 1.10 Sales System Engine (Completo con 5 módulos)** |
| **Sprint 5-6** | 2.4 Analytics + WA Cloud API |
| **Sprint 7+** | Innovación + Multi-tenant |

---

---

# ✅ AJUSTES & OBSERVACIONES EJECUTIVAS

> Agregado 29/04/2026 - Revision tecnica

## 🎯 Orden de Sprints Optimizado (Ahorra 2 semanas)
❌ Orden original: `Resilience -> Memory -> Sales Engine`
✅ **Orden recomendado:**
1.  Event Log COMPLETO (primero, sin excepcion)
2.  Inventory Middleware
3.  Sales System Engine 1.10
4.  Resilience Layer
5.  Customer Memory (puede correr en shadow indefinidamente)

## ⚠️ Riesgos No Documentados + Mitigacion
| Riesgo Oculto | Accion Inmediata |
|---|---|
| Stock desincronizado rompe todo el sistema | Agregar invalidacion inmediata de cache + webhook POS, no solo polling 30s |
| Cobros dobles por falta de idempotencia | Agregar `idempotency_key` en TODO flujo de pago |
| Enviar mensajes de recovery hasta bloquear cliente | Limite maximo 2 intentos de recuperacion por carrito |
| Cocina saturada con upsells activos | Si backlog > 20min → forzar automaticamente modo `ECO` |
| Cliente con historial de cancelaciones | Desactivar upsells completamente si 2+ cancelaciones ultimos 30 dias |

## 💡 Optimizaciones de Alcance (Ahorra meses)
1.  **Taste Graph**: No empieces con 5 dimensiones. Solo `picante: si/no` explica el 80% de las preferencias
2.  **Alerta critica**: Slack/alerta cuando `fallback_triggered` supere 3%. Es el sensor de que todo se rompe
3.  **Kill Switch Global**: Boton unico para apagar todo el bot y mandar todo a humano en 1 click
4.  **Backfill**: Script para generar perfiles de clientes historicos antes de lanzar memory

## 🎯 Verificacion Final Antes de Lanzar 1.10
✅ Event Log capturando TODOS los eventos definidos
✅ Inventory middleware conectado en tiempo real
✅ Fallback deterministico funciona sin LLM
✅ Limites y protecciones activas
✅ Alerta de fallback rate configurada

# 🔥 Regla Final

Cada feature nueva debe incluir:
1. MVP Scope
2. Data Contract
3. Events
4. KPIs
5. Gates
6. Feature Flags
