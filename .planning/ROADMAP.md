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

| KPI | Target |
|-----|--------|
| Bot conversion rate | >35% |
| Upsell acceptance (flavor-based) | >30% |
| Flavor gap CTR | >25% |
| Group order adoption | >15% |
| Kitchen-customer resolution rate | >80% |
| Retención 30d | >45% |
| Avg response time | <2s |

---

## 1.3 Lagging Indicators

| KPI | Target |
|-----|--------|
| MRR / ingresos mensuales | — |
| LTV/CAC | >3 |
| Margen bruto | >40% |
| NPS | >50 |

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

---

## 2.3 Gates

Cada feature debe declarar:
- **Inputs**
- **Outputs**
- **Event contracts**

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

---

## 3.2 Taste Graph & Moat Metrics

- Flavor drift stability
- Incremental conversion by recommendation
- Flavor gap uplift
- Data freshness score

---

# 4) 🛡️ Resilience Standard

## 4.1 Degradación elegante

| Fallo | Fallback |
|-------|----------|
| Redis falla | PostgreSQL + LRU cache |
| LLM >2s | fallback determinístico |
| WhatsApp 429 | queue + exponential backoff |

**Evento obligatorio:** `fallback_triggered`

---

## 4.2 SLOs

| SLO | Target |
|-----|--------|
| fallback_usage_rate | < 5% |
| avg_response_time | < 2s |

---

# 5) 🚀 ROADMAP

## ✅ Phase 0 — Completo

| Feature | Status |
|---------|--------|
| Menu + Cart + Upsell Engine | ✅ |
| Admin Promos & Banners | ✅ |
| Store Announcements | ✅ |
| WhatsApp AI Sales Bot | ✅ |
| Conversational Flow Engine | ✅ |
| POS Core | ✅ |
| Cash Management | ✅ |
| Roles & Audit | ✅ |

---

## 🔥 PHASE 1 — Revenue Intelligence & Resilience

### 1.9 Resilience Layer (CRITICAL)

**Scope:**
- Circuit breakers
- LLM timeout 2s
- Cache fallback

**KPIs:**
- fallback <5%
- response <2s

**Status:** ⏳ Not Started

---

### 1.6 Customer Memory & Context

**Scope:**
- Perfil persistente
- Taste Graph
- Predicción básica

**Modo:** Shadow

**Evento:** `customer_profile_updated`

**Status:** ⏳ Not Started

---

### 1.7 Intelligent Sales Layer

**Scope:**
LLM solo en:
- objeciones
- upsell por flavor gap
- intención vaga

**Modo:** Shadow → Holdout → ON

**KPIs:**
- conversion uplift
- upsell acceptance

**Status:** ⏳ Not Started

---

### 1.8 Dynamic Menu Personalization

**Scope:**
Personalización por:
- hora/día
- price segment
- flavor profile

**Experimento:** 80/20 holdout

**Status:** ⏳ Not Started

---

## 🧪 PHASE 2 — Analytics & Stability

### 2.4 Analytics & Revenue Intelligence

**Scope:**
Dashboard:
- conversion
- upsell rate
- LTV
- funnel

Alertas:
- caída >20%
- latencia LLM

**Status:** ⏳ Not Started

---

## 🏗️ PHASE 3 — Scale Foundation

### 3.1 WhatsApp Cloud API (BLOCKER)

**Scope:**
- Webhooks oficiales
- Botones interactivos
- Parallel run

**Status:** ⏳ Not Started

---

### 3.2 Multi-tenant Refactor

**Scope:**
- tenant_id
- RLS (Row Level Security)

**Status:** ⏳ Not Started

---

### 3.3 Billing & Templates

**Scope:**
- Planes (Starter / Pro / Enterprise)
- Feature flags por plan
- Templates clonables

**Status:** ⏳ Not Started

---

## 🚀 PHASE 4 — Innovación

### 4.1 Group Ordering

**Scope:**
- pedidos grupales en WhatsApp
- votaciones
- split de pago

**Status:** ⏳ Not Started

---

### 4.2 Kitchen-Customer Sync

**Scope:**
- retrasos → mensaje + cupón
- sustituciones en tiempo real

**Status:** ⏳ Not Started

---

### 4.3 Voice of Customer (VoC)

**Scope:**
- análisis de reviews
- detección de temas
- alertas

**Status:** ⏳ Not Started

---

### 4.4 Predictive Prep

**Scope:**
- sugerencias de producción
- basado en histórico

**Status:** ⏳ Not Started

---

### 4.5 Order DNA

**Scope:**
- fingerprint por orden
- recomendaciones avanzadas

**Status:** ⏳ Not Started

---

# 6) 📅 Sprints

| Sprint | Features |
|--------|----------|
| **Sprint 1-2** (Fundación) | 1.9 Resilience, 1.6 Memory (shadow), 1.7 Sales (shadow) |
| **Sprint 3-4** | 2.4 Analytics, 3.1 WA Cloud API |
| **Sprint 5-6** | Group Ordering, Kitchen Sync |
| **Sprint 7-8** | Predictive Prep, Order DNA |
| **Sprint 9+** | Multi-tenant, Billing |

---

# 7) 📈 Impacto (Estimado)

| Métrica | Uplift |
|---------|--------|
| Conversión | +20% |
| Ticket | +13% |
| Retención | +15% |

→ **Ingreso por cliente: +30%**

---

# 8) ⚠️ Riesgos & Mitigación

| Riesgo | Mitigación |
|--------|------------|
| Cambios WA API | Cloud API + fallback |
| Costos LLM | caps + fallback |
| Perfil sesgado | recalibración |
| Multi-tenant leak | RLS + tests |

---

# 9) ⚡ Siguientes Acciones

1. Implementar **1.9 Resilience** + eventos
2. Activar **Customer Memory** (shadow)
3. Activar **Sales Layer** (shadow)
4. Construir **Analytics** sobre Event Log

---

# 🔥 Regla Final

**Cada feature nueva debe incluir:**

- [ ] MVP Scope
- [ ] Data Contract
- [ ] Events
- [ ] KPIs
- [ ] Gates
- [ ] Feature Flags
