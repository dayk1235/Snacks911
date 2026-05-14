# SaaS Landing Page — Apple Dark Pro

## Identity

- **Brand**: AI Commerce (platform, NOT Snacks 911)
- **Palette**: Indigo `#6366F1` accent on `#0A0A0F` void
- **Philosophy**: Apple-style — generoso espacio, tipografía masiva, glass sutil, sin glows agresivos

## Design tokens

| Token | Value |
|-------|-------|
| Background | `#0A0A0F` |
| Glass surface | `rgba(255,255,255,0.03)` + blur 40px |
| Accent | `#6366F1` (indigo) |
| Accent light | `#A5B4FC` |
| Text primary | `#FFFFFF` |
| Text secondary | `rgba(255,255,255,0.35)` |
| Border | `rgba(255,255,255,0.04)` |

## Sections

### Nav (sticky glass)
- Blur 40px, bottom border `rgba(255,255,255,0.04)`
- Logo: Zap icon indigo + "AI Commerce" text
- Links: `white/35` → hover `white/70`
- CTA: `pro-btn-primary` indigo solid

### Hero
- Typography: `text-7xl lg:text-8xl` bold, tracking `-0.02em`
- "vende solo" in indigo light `#A5B4FC`
- Badge: indigo pill with Sparkles icon
- 2 CTAs: primary indigo solid + secondary glass white
- Phone mockup: glass `pro-phone` with dark chat bubbles

### Features (3 cards)
- Cards: `pro-card` with 32px radius, border invisible
- Hover: border increases to indigo 15%, translateY -4px
- Icons: indigo 400 inside glass circle
- Typography: `text-xl` semibold titles, `text-[0.94rem]` body at 25% opacity

### Pricing (2 plans)
- Cards: 32px radius, 12 padding units
- Pro card: elevated background `white/[0.03]` + indigo border `indigo-500/10`
- Price: `text-6xl` bold white
- Features: ShieldCheck indigo icons
- CTAs: `pro-btn-primary` for Pro, `pro-btn-secondary` for Basic

### CTA
- Border-top separator
- Heading: `text-6xl` white
- Single CTA: `pro-btn-primary text-lg px-12 py-5`

### Footer
- Ultra minimal: `text-white/10`, Zap icon at 20% opacity

## CSS classes

| Class | Purpose |
|-------|---------|
| `.pro-void` | Solid `#0A0A0F` background |
| `.pro-glass` | Glass with 40px blur |
| `.pro-card` | Card with subtle border, hover accent |
| `.pro-btn-primary` | Solid indigo `#6366F1`, hover `#4F46E5` |
| `.pro-btn-secondary` | Glass with white border |
| `.pro-phone` | Phone mockup glass container |
| `.text-accent` | Indigo light `#A5B4FC` |

## What was removed

| Removed | Reason |
|---------|--------|
| Cyberdelic CSS (~170 lines) | Magenta/cyan/purple neons, glows, orbs — felt cheap/gamer |
| All `btn-neon`, `btn-ghost-neon`, `card-neon-*`, `psychedelic-cta`, `cyber-*` | Replaced with clean Apple-style |
| Rotating gradient borders | Too busy |
| Glow shadows (40-80px) | Replaced with subtle 0.06 glow |
