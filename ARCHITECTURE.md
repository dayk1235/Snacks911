# Snacks 911 — Architecture Guide

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI LAYER (Next.js)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pages (App Router)                                   │   │
│  │  - All dynamic/interactive → dynamic(ssr: false)     │   │
│  │  - Static sections → SSR OK                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Components (React)                                   │   │
│  │  - UI only, no business logic                        │   │
│  │  - Import from @/core/ for logic                     │   │
│  │  - Use 'use client' for interactivity                │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                    Adapter Layer                             │
│                    (@/core/index.ts)                         │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  CORE LAYER (Pure TypeScript)                         │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌───────────────┐  │   │
│  │  │intents.ts  │ │responseEngine│ │ cartEngine.ts │  │   │
│  │  │(detection) │ │(GOD MODE)    │ │ (cart ops)    │  │   │
│  │  └────────────┘ └──────────────┘ └───────────────┘  │   │
│  │  ┌────────────┐ ┌──────────────┐                    │   │
│  │  │antojo.ts   │ │recommendation│                    │   │
│  │  │(phrases)   │ │Engine.ts     │                    │   │
│  │  └────────────┘ └──────────────┘                    │   │
│  │  NO React, NO DOM, NO side effects                  │   │
│  │  Input → Output only                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## CORE Layer Rules

Files in `src/core/` MUST:
- ✅ Have NO React imports
- ✅ Have NO useState / useEffect
- ✅ Have NO window / document access
- ✅ Have NO JSX
- ✅ Be pure functions only (input → output)
- ✅ Be testable in isolation

Files in `src/components/` or `src/app/` MUST:
- ✅ Use `'use client'` for interactive components
- ✅ Use `dynamic(..., { ssr: false })` for components with:
  - Animations
  - localStorage access
  - Window/document access
  - Live data
  - Time-based UI
- ✅ Import business logic from `@/core/` only
- ✅ NOT contain intent detection, decision making, or state machines

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
