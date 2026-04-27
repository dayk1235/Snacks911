# Snacks 911 SaaS Ecosystem

## North Star
Construir el **motor operativo + motor de ventas** de Snacks 911 (Web + POS + WhatsApp) y evolucionarlo a **SaaS multi-tenant** sin perder performance ni control de datos.

## Core Value
**Control Total** (operación, números, roles, auditoría) + **máxima conversión** (UX premium + upsell + bot closer con costos mínimos).

## Current Menu (Source of Truth — Prices)
> Este bloque es el “contrato” para Bot/UX/POS. **Nunca inventar precios.**

### Combos (incluyen papas + bebida)
- ⭐ Combo Mixto 911 — **$249** (Boneless 150g + Alitas 6pz + Papas + Bebida)
- ⭐ Boneless Power 911 — **$155** (Boneless 250g + Papas + Bebida + Salsa)
- Alitas Fuego 911 — **$145** (Alitas 12pz + Papas + Bebida + Salsa)
- Combo Callejero 911 — **$175** (Banderilla + Salchipapas + Bebida)
- Combo Banderilla Suprema — **$149** (2 Banderillas + Papas con queso + Bebida)
- Combo Dedos de Queso + Papas — **$139** (Dedos + Papas clásicas + Bebida)
- ⭐ Papas 911 Loaded — **$149** (Papas grandes + Queso + Tocino + Jalapeños + Bebida)

### Proteína
- Boneless 250g — **$139** (con papas chicas + salsa)
- Alitas 6pz — **$125** (con papas chicas + salsa)

### Papas y antojos
- Papas clásicas — **$45**
- Papas con queso — **$65**
- Salchipapas — **$85**

### Banderillas y dedos
- Banderilla coreana — **$79**
- Dedos de queso (6) — **$85**

### Bebidas
- Refresco 400ml — **$30**

### Extras
- Salsas (BBQ / Mango Habanero) — **$12**
- Dips (Parmesano / Queso Cheddar) — **$15**

## Guiding Decisions (Locked)
1. **Bot 80/20 (determinístico/AI)** para minimizar costos y maximizar control.
2. **POS interno** para evitar problemas de sync y mantener una sola fuente de verdad.
3. **SaaS multi-tenant = Phase 3** (primero perfeccionar Snacks 911).

## Non-Functional Requirements (NFRs)
- **Data Integrity:** 1 sola fuente de verdad (Supabase). Todo (Web/Bot/POS) lee/escribe vía reglas consistentes.
- **Security:** RLS estricto por rol (admin/gerente/staff) y posteriormente por `tenant_id`.
- **Reliability:** WhatsApp con colas y reintentos; logs auditable.
- **Performance:** UI “premium” sin degradación en móvil (menú/carro/checkout/admin).
- **Observability:** eventos de conversión, ventas, upsells, fallos, tiempos de respuesta.

## Backlog (Nice-to-have)
- Inventario y costeo en tiempo real
- Motor de recomendaciones por historial (personalización)
- Integraciones delivery (si conviene) con reconciliación automática
- Programa de lealtad / puntos

## Change Management
**En cada transición de fase**:
1) Validated → mover features completadas con referencia de fase  
2) Active → re-priorizar por impacto en KPIs  
3) Out of Scope → revisar si alguna restricción cambió  
4) Decisions → registrar nuevas decisiones irreversibles  
5) “Source of Truth” → confirmar menú/precios vigentes (evitar drift)

---
*Last updated: 2026-04-27 (America/Mexico_City)*
