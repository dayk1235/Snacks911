# CSS Design System

## Design tokens (`:root`)

```css
--bg-deep: #020203;
--bg-base: #050506;
--bg-elevated: #0A0A0C;
--accent: #FF4500;
--accent-gradient: #FF6B00;
--accent-gold: #FFB800;
--accent-glow: rgba(255,69,0,0.2);
--status-success: #22C55E;
--status-danger: #EF4444;
--border-subtle: rgba(255,255,255,0.08);
--easing-premium: cubic-bezier(0.16,1,0.3,1);
```

## Button classes

| Class | Style |
|-------|-------|
| `.btn-premium` | Orange gradient, glow shadow, scale hover |
| `.btn-primary` | Same as premium + disabled state |
| `.btn-secondary` | Glass translucent, subtle border, orange hover hint |
| `.btn-danger` | Red gradient, red glow shadow |
| `.btn-ghost` | Transparent, subtle hover background |

## Chat classes

| Class | Purpose |
|-------|---------|
| `.chat-container` | Chat box with texture, gradient border |
| `.msg-bubble-bot` | Bot message: glass bg, orange left accent |
| `.msg-bubble-user` | User message: orange gradient |
| `.msg-avatar` | 26px circle with gradient + glow |
| `.msg-time` | 0.58rem timestamp |
| `.msg-row` | Message row with avatar alignment |
| `.chat-input` | Input with orange glow on focus |
| `.chat-suggestion-chip` | Pill suggestion buttons |
| `.chat-send-btn` | Send button with 12px radius |
| `.chat-product-card` | Product card: 185px, hover scale 1.04, glow |
| `.chat-product-card-img-wrap` | 110px image container |
| `.chat-product-card-add` | "+ Agregar" badge |
| `.chat-cards-scroll` | Horizontal snap scroll container |
| `.chat-cart-summary` | Cart summary card (green tint) |
| `.chat-cart-item` | Cart item row |
| `.chat-cart-item-remove` | ✕ remove button (red circle) |
| `.chat-action-btn` | Action button variants (add, view, checkout, danger, ghost) |
| `.chat-empty-state` | Centered welcome state |
| `.chat-thinking` | Thinking dots indicator |
| `.chat-header-avatar` | Header avatar with glow |
| `.chat-header-title` | Gradient header title |
| `.chat-header-dot` | Online status dot |
| `.chat-messages` | Scrollable message area with custom scrollbar |
| `.ai-content-zone` | Dynamic AI panel (between messages and input) |
| `.fab-badge` | Red badge on FAB button |

## Shelf + Vitrina

| Class | Purpose |
|-------|---------|
| `.impulse-shelf` | Floating horizontal product strip |
| `.impulse-shelf-card` | Individual shelf card (150px) |
| `.impulse-shelf-card-img` | 80px card image |
| `.impulse-shelf-card-add-btn` | Floating "+" button (orange gradient circle) |
| `.impulse-shelf-ver-todos` | "Ver todos" button |
| `.vitrina-overlay` | Full-screen overlay |
| `.vitrina-header` | Header with title + close |
| `.vitrina-filters` | Category filter pills |
| `.vitrina-grid` | Product grid |
| `.vitrina-card` | Individual vitrina card |

## Apple Dark Pro

| Class | Purpose |
|-------|---------|
| `.pro-void` | `#0A0A0F` background |
| `.pro-glass` | 40px blur glass |
| `.pro-card` | Subtle card with hover accent border |
| `.pro-btn-primary` | Solid indigo button |
| `.pro-btn-secondary` | Glass white button |
| `.pro-phone` | Phone mockup with glass |
| `.text-accent` | `#A5B4FC` indigo light text |

## Global utilities

| Class | Purpose |
|-------|---------|
| `.glass` | Light glass morphism |
| `.glass-dark` | Dark glass morphism |
| `.glass-hover` | Hover transition for glass |
| `.fire-text` | Animated fire gradient text |
| `.hero-orb-1/.hero-orb-2` | Floating gradient orbs |
| `.no-scrollbar` | Hide scrollbar |

## Keyframe animations

| Name | Effect |
|------|--------|
| `msgSlideIn` | Message entrance (y +20, scale 0.98) |
| `actionsFadeIn` | Action buttons fade up |
| `btnBounceIn` | Button bounce entrance |
| `cardSlideIn` | Card slide-up entrance |
| `cartPulse` | Cart summary glow pulse |
| `glowPulse` | Checkout button glow pulse |
| `dotBounce` | Loading dot bounce |
| `dotPulse` | Online dot pulse |
| `badgeBounce` | FAB badge pop |
| `floatSlow` | Floating animation |
| `fire-flicker` | Fire text movement |
| `sirenFlash` | Siren SVG filter animation |
| `navSlideDown` | Navbar slide entrance |
