# Chat UI Premium

## Chat container

| Property | Value |
|----------|-------|
| Base width | 540px (was 380px, then 440px) |
| Expanded width | 640px (was 560px) |
| Height | 540px |
| Background | `#0A0A0E` solid + texture SVG + radial gradient |
| Border | 1px glass gradient (orange 0.25 → transparent → gold 0.12) |
| Shadow | `0 25px 80px rgba(0,0,0,0.6)` + `0 0 60px rgba(255,69,0,0.06)` glow |
| Expansion | Auto-detect when last message has `ui.cards` or `type: 'products'` |
| Transition | `width 0.5s cubic-bezier(0.16,1,0.3,1)` |

## Message bubbles

| Element | Style |
|---------|-------|
| Bot bubble | `rgba(255,255,255,0.04)` bg, 1px border, orange left accent 2px |
| User bubble | Orange gradient, `box-shadow: 0 4px 15px var(--accent-glow)` |
| Bot avatar | 🔥 in orange gradient circle, `box-shadow: 0 2px 8px var(--accent-glow)` |
| User avatar | "Tú" in gray circle |
| Timestamps | `0.58rem`, 60% opacity below each bubble |

## Product cards

| Feature | Implementation |
|---------|---------------|
| Size | 185px wide, 110px image |
| Hover | `scale(1.04)`, border orange, `box-shadow: 0 0 30px rgba(255,69,0,0.12)` |
| Tap | `scale(0.97)`, quick transition 100ms |
| Image parallax | `scale(1.08)` on card hover (300ms ease) |
| Entrance | framer-motion stagger (70ms delay between cards, `y: 24 → 0`, `scale: 0.94 → 1`) |
| Scroll | `.chat-cards-scroll` with `scroll-snap-type: x mandatory` |
| Badge | "+ Agregar" pill, hover `scale(1.05)` |
| Image fallback | `getProductImage()` from `@/data/products` |

## Cart summary

- Inline card with green-tinted background + border
- Items: name + price with ✕ remove button (circle, red hover)
- Total row with green price
- Animation: `cartPulse` on update
- Also shown in header as floating total badge

## AI Content Zone

- Positioned between messages and input
- Empty state: 60px, italic placeholder "Sugerencias inteligentes aquí"
- With data: expands to 220px max-height, horizontal scrollable cards
- Glass background `rgba(10,10,14,0.5)` + blur 8px
- Cards: same as product cards with motion entrance

## ImpulseShelf (floating)

- Appears above chat when products shown
- 150px cards with image + name + price + "+" add button
- Stagger entrance (80ms delay per card)
- "Ver todos" button with search icon + orange gradient
- Expands from 540px to `min(85vw, 640px)`
- Exit: fade out upward

## VitrinaModal (full-screen grid)

- Overlay with `rgba(0,0,0,0.85)` + blur 16px
- Header: "🍟 Menú Completo" + close ✕
- 8 category filter pills (Todos, Combos, Proteína, Papas, Banderillas, Bebidas, Postres, Extras)
- Responsive grid: `auto-fill, minmax(155px, 1fr)`
- Cards: image (110px), name, price, description
- Stagger entrance per card (50ms delay)
- Click adds to cart + closes vitrina

## Suggestion chips

- Above input, contextual max 2 chips
- Empty state: "🔥 Ver combos", "📋 Ver menú"
- With cart: "🛒 Ver carrito", "📦 Pedir"
- Without cart: "🔥 Combos", "🍗 Boneless"

## FAB button

- Chat bubble SVG with 3 orange dots
- Red badge with item count when cart has items
- Entrance: `badgeBounce` animation
- Closed: 56px, orange gradient
- Open: 48px, gray

## Scrollbar

- Messages area: 4px custom scrollbar
- Thumb: `rgba(255,69,0,0.15)`, hover: `rgba(255,69,0,0.3)`
- Track: transparent
