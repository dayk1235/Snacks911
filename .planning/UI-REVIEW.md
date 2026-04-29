# UI-REVIEW.md — Snacks 911 WebApp

**Audit Date:** 2026-04-28  
**Auditor:** gsd-ui-review (automated)  
**Scope:** All implemented UI components across Phases 1.1, 1.2, 1.5, 2.1, 2.2

---

## Executive Summary

| Pillar | Score (1-4) | Status |
|--------|-------------|--------|
| 1. Visual Hierarchy | 3 | ✅ Good |
| 2. Consistency | 3 | ✅ Good |
| 3. Feedback & Response | 2 | ⚠️ Needs Work |
| 4. Efficiency | 3 | ✅ Good |
| 5. Accessibility | 1 | ❌ Critical |
| 6. Mobile Experience | 2 | ⚠️ Needs Work |

**Overall Score: 2.3 / 4.0** — Functional but requires refinement for premium positioning

---

## Pillar 1: Visual Hierarchy — Score: 3/4

### What Works
- **Strong color tokens** defined in `globals.css`: `--bg-primary`, `--accent`, `--text-primary`
- **Clear CTA styling** with `.btn-primary` gradient and hover states
- **Card system** with `.card-premium` using backdrop-blur and subtle borders
- **Combo highlighting** via border treatment (`1.5px solid rgba(255, 69, 0, 0.35)`)

### What's Missing
- **No typography scale** documented — using `var(--font-display)` and `var(--font-body)` without defined sizes
- **Inconsistent heading hierarchy** — components use inline `fontSize` instead of semantic classes
- **No spacing system** — margins/padding are magic numbers (`0.75rem`, `1.5rem`, `2rem`)

### Recommendations
1. Define type scale: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`
2. Create spacing tokens: `--space-1` through `--space-8`
3. Replace inline `fontSize` with semantic class names

---

## Pillar 2: Consistency — Score: 3/4

### What Works
- **Unified button system** (`.btn-primary`, `.btn-secondary`, `.btn-ghost`)
- **Shared component library** — `Button.tsx` exists in `/ui/`
- **Dark theme enforced** via `globals.css` root variables
- **Custom cursor** implementation consistent across non-admin pages

### What's Missing
- **No component documentation** — UI components lack usage examples
- **Mixed styling approaches** — some use Tailwind classes, some use inline `style={{}}`
- **Inconsistent naming** — `Cart.tsx` vs `CartUpsell.tsx` vs `UpsellModal.tsx`

### Recommendations
1. Create `COMPONENTS.md` with usage examples for each component
2. Standardize on Tailwind-first approach, minimize inline styles
3. Audit component naming for consistency

---

## Pillar 3: Feedback & Response — Score: 2/4

### What Works
- **Button hover states** with `transform: scale(1.04)` and shadow transitions
- **Cart pulse animation** via `.btn-pulse` class toggle
- **Modal fade-in animations** (`cartFadeIn`, `cartSlideUp` keyframes)
- **Loading states** in some components via `isLoading` prop

### What's Missing
- **No toast/notification system** — errors and successes silent
- **Missing skeleton loaders** — cart, menu, products load without visual feedback
- **No error boundaries** — component failures crash silently
- **Incomplete form validation feedback** — customer capture modal validates but doesn't show field errors

### Recommendations
1. Implement `<Toast />` component for success/error messages
2. Add skeleton loaders to `ProductCard`, `Cart`, `Menu` page
3. Create error boundary wrapper for critical components
4. Add inline validation messages to all forms

---

## Pillar 4: Efficiency — Score: 3/4

### What Works
- **Memoization** in `ProductCard` via `memo()` and `useRef`
- **Optimized images** via `next/image` with `loading="lazy"`
- **GSAP animations** for cart interactions (performant CSS transforms)
- **Custom cursor disabled** on admin pages (`data-admin="true"`)

### What's Missing
- **No virtualization** for long product lists
- **Cart state** not persisted across page refreshes (no localStorage sync)
- **Redundant re-renders** — `useState` for `added` triggers extra render cycle

### Recommendations
1. Implement `react-window` or similar for menu with 20+ items
2. Sync cart to localStorage after each add/remove
3. Use `useTransition` for non-urgent state updates

---

## Pillar 5: Accessibility — Score: 1/4 ❌

### Critical Issues
- **Custom cursor removes native cursor** for all users — violates WCAG 2.1 SC 1.4.10 (Reflow)
- **No focus management** — modals don't trap focus, keyboard users can tab into background
- **Missing ARIA labels** — buttons with only icons have no `aria-label`
- **Color contrast** — `--text-muted: #888888` on `--bg-primary: #080808` fails WCAG AA
- **No skip links** — keyboard users must tab through entire nav on every page
- **Form labels missing** — customer capture inputs have no `<label>` elements

### Must-Fix Before Launch
1. Remove custom cursor or make it optional via user preference
2. Add focus trap to all modals (`react-focus-lock` or custom implementation)
3. Add `aria-label` to all icon-only buttons
4. Increase `--text-muted` to `#A0A0A0` minimum for AA compliance
5. Add `<SkipLink />` component to bypass navigation
6. Wrap all inputs with visible or sr-only `<label>`

---

## Pillar 6: Mobile Experience — Score: 2/4

### What Works
- **Responsive layout** via Tailwind's default breakpoints
- **Touch-friendly buttons** with `padding: 0.8rem 1.5rem`
- **No horizontal overflow** enforced in `globals.css`

### What's Missing
- **No mobile menu** — Navbar doesn't collapse to hamburger on small screens
- **Cart not optimized** — takes full width on mobile, obscuring context
- **Modal sizing** — customer modal uses `maxWidth: 380px` but doesn't account for iPhone SE (320px viewport)
- **Touch targets** — some buttons (`.btn-ghost`) have `padding: 0.5rem` below 44px minimum

### Recommendations
1. Implement mobile hamburger menu with slide-out drawer
2. Convert cart to bottom sheet on mobile (`position: fixed; bottom: 0`)
3. Use `width: 100%; max-width: 380px` instead of fixed `maxWidth`
4. Increase all touch targets to minimum `44px × 44px`

---

## Component Inventory

| Component | File | Status | Issues |
|-----------|------|--------|--------|
| Button | `components/ui/Button.tsx` | ✅ | Limited variants |
| ProductCard | `components/ProductCard.tsx` | ✅ | Accessibility, inline styles |
| Cart | `components/Cart.tsx` | ✅ | No mobile optimization, missing focus trap |
| CartUpsell | `components/CartUpsell.tsx` | ✅ | None critical |
| Navbar | `components/Navbar.tsx` | ⚠️ | No mobile menu |
| Hero | `components/Hero.tsx` | ✅ | None critical |
| CombosSection | `components/CombosSection.tsx` | ✅ | None critical |
| ComboSelectorModal | `components/ComboSelectorModal.tsx` | ✅ | Missing ARIA |
| ComboShowcase | `components/ComboShowcase.tsx` | ✅ | None critical |
| ProductCustomizerModal | `components/ProductCustomizerModal.tsx` | ⚠️ | Complex, needs focus trap |
| ChatBot | `components/ChatBot.tsx` | ⚠️ | Accessibility issues |
| OrderBot | `components/OrderBot.tsx` | ⚠️ | Accessibility issues |
| ReviewSection | `components/ReviewSection.tsx` | ✅ | None critical |
| WelcomeModal | `components/WelcomeModal.tsx` | ⚠️ | Missing focus trap |
| OrderAlertModal | `components/OrderAlertModal.tsx` | ⚠️ | Missing focus trap |
| DecisionLock | `components/DecisionLock.tsx` | ✅ | None critical |
| ScrollCTA | `components/ScrollCTA.tsx` | ✅ | None critical |
| UpsellModal | `components/UpsellModal.tsx` | ⚠️ | Missing focus trap |

---

## Phase Coverage

| Phase | UI Hint | UI-SPEC Generated? | UI-REVIEW Generated? |
|-------|---------|-------------------|---------------------|
| 1.1 Menu + Cart + Upsell | ✅ Yes | ❌ No | ✅ This document |
| 1.2 Admin Promos & Banners | ✅ Yes | ❌ No | ⏳ Pending |
| 1.3 Store Announcements | ✅ Yes | ❌ No | ⏳ Pending |
| 1.5 Conversational Flow Engine | ❌ No | ❌ No | ⏳ Pending |
| 2.1 POS Core | ✅ Yes | ❌ No | ⏳ Pending |
| 2.2 Cash Management | ✅ Yes | ❌ No | ⏳ Pending |
| 2.3 Roles & Audit | ✅ Yes | ❌ No | ⏳ Not started |
| 2.4 Review Control | ✅ Yes | ❌ No | ⏳ Not started |

---

## Priority Action Items

### P0 — Blockers (Fix Before Any Launch)
1. **Accessibility: Focus trap for all modals** — Estimated: 4 hours
2. **Accessibility: Add ARIA labels to icon buttons** — Estimated: 1 hour
3. **Accessibility: Fix color contrast for muted text** — Estimated: 30 min
4. **Mobile: Implement hamburger menu** — Estimated: 3 hours

### P1 — High Priority (Next Sprint)
1. **Toast notification system** — Estimated: 3 hours
2. **Skeleton loaders for menu/cart** — Estimated: 2 hours
3. **Cart persistence via localStorage** — Estimated: 1 hour
4. **Mobile bottom sheet for cart** — Estimated: 2 hours

### P2 — Medium Priority (Future Enhancement)
1. **Typography scale documentation** — Estimated: 1 hour
2. **Spacing system tokens** — Estimated: 1 hour
3. **Component documentation (COMPONENTS.md)** — Estimated: 4 hours
4. **Virtualization for long lists** — Estimated: 2 hours

---

## Next Steps

1. **Create UI-SPEC.md for Phase 1.1** — Define design tokens, component contracts
2. **Fix P0 accessibility issues** — Unblock launch readiness
3. **Implement toast system** — Improve user feedback
4. **Re-audit after fixes** — Run `gsd:ui-review` again to verify improvements

---

*Generated by gsd-ui-review skill — 2026-04-28*
