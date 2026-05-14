# Snacks 911 — Session Documentation

> **Date**: May 12, 2026
> **Branch**: main
> **Summary**: Chat AI fix, premium UI overhaul, hybrid commerce flow, SaaS Apple Dark Pro redesign, brand separation

---

## Architecture Overview

```
src/
├── app/
│   ├── page.tsx              ← Homepage (Snacks 911 brand)
│   ├── menu/page.tsx         ← Full menu page
│   ├── saas/page.tsx         ← SaaS landing (AI Commerce platform)
│   └── api/ai/chat/route.ts  ← Chat bot API endpoint
├── components/
│   ├── chat/
│   │   ├── OrderBot.tsx       ← Main chat interface with cart, shelf, vitrina
│   │   ├── ImpulseShelf.tsx   ← Horizontal product strip (reusable)
│   │   └── VitrinaModal.tsx   ← Full-screen product grid
│   ├── sections/
│   │   ├── Hero.tsx           ← Simplified hero (was 100vh, now 28vh)
│   │   └── CombosSection.tsx  ← De-emphasized combo cards
│   ├── layout/Navbar.tsx      ← No SaaS link (brand separation)
│   └── ui/
│       ├── Button.tsx         ← Uses global CSS classes
│       └── DesignSystem.tsx   ← PremiumButton, GlassCard, AnimatedBackground
├── core/
│   ├── ai/aiAgent.ts          ← Gemini 2.5 Flash Lite, systemInstruction, JSON parsing
│   ├── botEngine.ts           ← Chat orchestration, UI builder, fallback products
│   └── types.ts               ← ChatMessage now has ui?: BotUI
├── lib/
│   └── utils/core.ts          ← cn() utility added
└── data/
    └── products.ts            ← Static product catalog with images (used as fallback)
```

---

## Index

| Doc | Area |
|-----|------|
| [chat-ai.md](docs/chat-ai.md) | Chat AI pipeline, Gemini fix, greeting shortcut |
| [chat-ui.md](docs/chat-ui.md) | Premium chat UI, expansion, cards, cart, shelf, vitrina |
| [saas-page.md](docs/saas-page.md) | SaaS landing Apple Dark Pro redesign |
| [homepage.md](docs/homepage.md) | Homepage simplifications, hero, cards de-emphasis |
| [css-system.md](docs/css-system.md) | Unified CSS design tokens and classes |
| [bugs-fixed.md](docs/bugs-fixed.md) | Build errors and runtime bugs resolved |
