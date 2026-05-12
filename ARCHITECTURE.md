# ARCHITECTURE — Snacks 911 System

## 🧠 Visión general

Snacks 911 es un sistema híbrido compuesto por:

- Aplicación web (Next.js)
- Motor de IA (multi-agente)
- Backend lógico basado en GitHub Issues
- Integraciones externas (WhatsApp, Supabase)

---

## 🧱 Capas del sistema

### 1. Frontend (UI)

Ubicación:
src/app/
src/components/

Responsabilidad:
- Mostrar menú
- Capturar pedidos
- Interacción del usuario

---

### 2. Backend API (Next.js)

Ubicación:
src/app/api/

Responsabilidad:
- Manejo de requests
- Conectar frontend con lógica
- Entrada al sistema IA

---

### 3. Core Engine

Ubicación:
src/core/

Componentes clave:
- agentOrchestrator.ts
- botEngine.ts
- responseEngine.ts
- intentDetector.ts

Responsabilidad:
- Procesar conversaciones
- Tomar decisiones
- Ejecutar lógica de negocio

---

### 4. AI Runtime

Ubicación:
src/ai/

Responsabilidad:
- Ejecución de agentes
- Enrutamiento de decisiones
- Integración multi-modelo

---

### 5. Services (lib)

Ubicación:
src/lib/

Ejemplos:
- github.ts
- multiAiRouter.ts
- supabase.ts

Responsabilidad:
- Conectar con servicios externos
- Persistencia
- APIs externas

---

### 6. Data Layer

Ubicación:
supabase/
src/data/

Responsabilidad:
- Almacenamiento
- Productos
- Usuarios
- Conversaciones

---

### 7. GitHub System

Repositorio:
dayk1235/Snacks911

Responsabilidad:
- Issues → tareas
- PRDs → especificaciones
- Labels → clasificación

---

## 🔁 Flujo principal

Cliente → ChatBot → IntentDetector → Orchestrator → Acción

Acciones posibles:
- Respuesta al usuario
- Generación de oferta
- Creación de issue en GitHub
- Registro en base de datos

---

## 🔁 Flujo de desarrollo

Idea → Issue → PRD → Tasks → Código → Deploy

---

## 🤖 Flujo de IA

Input usuario  
→ análisis (intent + contexto)  
→ decisión (agentOrchestrator)  
→ ejecución (acción)  
→ aprendizaje  

---

## ⚠️ Consideraciones

- El sistema es event-driven
- Las decisiones deben ser trazables
- GitHub actúa como sistema de control
- La IA nunca opera sin contexto

---

## 🚀 Evolución futura

- Automatización completa del ciclo de desarrollo
- Sistema auto-optimizable
- Integración con múltiples canales
- Expansión a SaaS multi-negocio

## SaaS-Ready Layered Model

```
┌─────────────────────────────────────────────────────────────┐
│                        UI LAYER (Next.js)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pages & Components (@/*)                            │   │
│  │  - Consume @core for logic                           │   │
│  │  - Consume @app for tenant config                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  APP CONFIG LAYER (@app/*)                            │   │
│  │  - snacks911.ts, default.ts, index.ts                │   │
│  │  - Feature flags, identity, personality              │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PLATFORM CORE (@core/*)                              │   │
│  │  - botEngine, cartEngine, flowController             │   │
│  │  - PURE platform logic (Business Agnostic)           │   │
│  │  - Reads from TenantConfig (No hardcoding)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Modularization Rules

### 1. Platform Core (@core/*)
- **Rule**: MUST NOT import from `@app/*` or `@/*`.
- **Rule**: MUST NOT contain business names like "Snacks 911".
- **Rule**: MUST be purely config-driven using `TenantConfig`.

### 2. App Config (@app/*)
- **Rule**: Contains the identity of the specific deployment (e.g., Snacks 911).
- **Rule**: Defines feature flags and overrides for core behavior.

### 3. Feature Flags
- All new functionality must be gated behind a flag in `@core/config/featureFlags.ts`.
- Default values in `defaultConfig.ts` must be `false` (fail-closed).

## Hydration Prevention Checklist

A component causes hydration mismatch if it:
1. Reads from localStorage in initial render
2. Uses animations that differ between server/client
3. Accesses window/document during render
4. Shows different structure based on client-only data

**Solution:** Wrap with `dynamic(() => import(...), { ssr: false })`

## Current Component Status

### Already Protected (ssr: false)
- `Navbar` — scroll state, cart badge animation
- `Hero` — FireCanvas, dynamic settings loading
- `Cart` — GSAP animations, localStorage
- `CustomCursor` — mouse tracking, RAF loop
- `OrderBot` — chat state, localStorage
- `WelcomeModal` — client-only modal
- `ReviewSection` — animated reviews
- `ContactSection` — contact form
- `CombosSection` — combo display
- `PromoBanner` — promo display
- `UpsellModal` — upsell modal
- `TickerBar` — ticker animation

### SSR-Safe (no dynamic behavior)
- `SiteFooter` — static footer
- `ProductCard` — static product display

## Migration Plan (Future)

### Phase 1: ChatBot Refactor
1. Move `handleMessage`, intent detection, state management from `ChatBot.tsx` to use `@/core/`
2. ChatBot becomes pure UI: receives messages from core, renders them
3. Core handles all logic: intent detection, response generation, state updates

### Phase 2: Cart Refactor
1. Move cart operations from `Cart.tsx` and `page.tsx` to use `@/core/cartEngine`
2. Components call `addToCart`, `updateQuantity`, etc. from core
3. Core returns new state, UI renders it

### Phase 3: OrderBot Refactor
1. Move recommendation engine, cross-sell, upsell logic to core
2. OrderBot becomes pure UI: receives recommendations from core, renders them

## File Structure

```
src/
├── core/                    # ← PURE BUSINESS LOGIC (no React)
│   ├── index.ts             # Public API
│   ├── types.ts             # Shared types
│   ├── intents.ts           # Intent detection
│   ├── responseEngine.ts    # GOD MODE sales pipeline
│   ├── antojo.ts            # Desire-trigger phrases
│   ├── cartEngine.ts        # Cart operations
│   └── recommendationEngine.ts  # Product recommendations
│
├── lib/                     # ← Legacy (being migrated to core/)
│   ├── adminStore.ts        # Admin data store
│   ├── supabase.ts          # Supabase client
│   └── ...
│
├── components/              # ← React UI components
│   ├── Cart.tsx             # Cart drawer
│   ├── ChatBot.tsx          # Chat assistant
│   ├── Hero.tsx             # Hero section
│   └── ...
│
└── app/                     # ← Next.js pages
    ├── page.tsx             # Home
    ├── layout.tsx           # Root layout
    └── admin/               # Admin panel
```

## Key Decisions

1. **CORE layer is additive** — existing `src/lib/` files still work during migration
2. **No breaking changes** — old imports still work, new code uses `@/core/`
3. **Gradual migration** — refactor one component at a time
4. **Build always passes** — never break production
