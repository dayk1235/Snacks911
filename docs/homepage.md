# Homepage — Snacks 911 Brand

## Hero simplification

| Before | After |
|--------|-------|
| 100vh full-screen | 28vh compact |
| FireCanvas + hero.webp + 3 gradient layers + orbs | 1 radial gradient |
| Headline: 8rem giant | 4.5rem max with `data-hero-headline` attribute |
| Featured product card | Removed |
| Stats (500+, 4.9★, 30min) | Removed |
| CTA buttons (Ver Menu, WhatsApp) | Removed |
| Scroll arrow ↓ | Removed |
| Store open/closed pill | Preserved |
| Settings fetch + Zustand | Preserved |
| `HeroProps` interface | Preserved (accepts featuredProduct, onOrderFeatured) |
| `TickerBar` export | Identical, unchanged |

## BestsellersSection de-emphasis

| Element | Before | After |
|---------|--------|-------|
| Image height | 140px | 90px (-36%) |
| Card width | minmax(240px) | minmax(190px) |
| Heading | 3rem max | 2.4rem max |
| Description | Visible (2 lines) | Removed |
| Badge "Más vendido" | Yes (gradient + glow) | Removed |
| Button | "🔥 Pedir ahora" (gradient + glow) | "+ Agregar" (subtle pill) |
| Hover | box-shadow + translateY(-3px) | border + translateY(-2px) |
| Card click | Only button | Entire card → add to cart |
| "Ver menú completo" link | Yes | Removed |

## CombosSection de-emphasis

| Element | Before | After |
|---------|--------|-------|
| Image height | 160px | 100px (-38%) |
| Card width | minmax(280px) | minmax(210px) |
| Badge "⭐ Más vendido" | Yes (gradient + glow) | Removed |
| Description | Visible | Removed |
| Original price (strikethrough) | Visible | Removed |
| Button | "🔥 Pedir ahora" (full-width gradient) | "+ Agregar" (compact) |
| `className="card-premium"` | Yes | Removed |
| Featured card gradient | Yes | Removed |

## Navbar brand separation

- **Removed**: "Para Negocios" link → `/saas` (both desktop + mobile dropdown)
- Homepage `/` now 100% Snacks 911 brand
- `/saas` still accessible by direct URL
