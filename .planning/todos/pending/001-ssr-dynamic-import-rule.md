---
title: "SSR Control Rule: dynamic import required for animated/live components"
status: pending
priority: P1
source: "promoted from /gsd-note"
created: 2026-04-13
theme: architecture
---

## Rule

**If a component contains any of the following, it MUST disable SSR using `dynamic()` import:**

- CSS animations or keyframe animations
- Live/dynamic text that changes on mount (dates, clocks, real-time data)
- Browser-only APIs (`localStorage`, `window`, `navigator`, etc.)
- `typeof window !== 'undefined'` branches inside render logic or `useState` initializers
- Any state that differs between server and first client render

## Pattern to Apply

```tsx
// ❌ BAD — causes hydration mismatch
import MyComponent from '@/components/MyComponent';

// ✅ GOOD — SSR-safe for animated/dynamic components
import dynamic from 'next/dynamic';
const MyComponent = dynamic(() => import('@/components/MyComponent'), { ssr: false });
```

## Also: Never use `typeof window` in render or useState

```tsx
// ❌ BAD — SSR always false, client may be true → mismatch
const [items, setItems] = useState(() => {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('key') || '[]');
  }
  return [];
});

// ✅ GOOD — both start identical, localStorage read deferred
const [items, setItems] = useState([]);
useEffect(() => {
  const saved = localStorage.getItem('key');
  if (saved) setItems(JSON.parse(saved));
}, []);
```

## Acceptance Criteria

- [ ] All animated components use `dynamic({ ssr: false })`
- [ ] No `typeof window` branches in `useState` initializers
- [ ] No `typeof window` branches in JSX/render functions
- [ ] `suppressHydrationWarning` used on containers that MUST render dynamic text server-side

## Components Audited (Snacks 911)

- [x] `Hero` — `dynamic({ ssr: false })` ✅
- [x] `TickerBar` — `dynamic({ ssr: false })` ✅
- [x] `Cart` — `dynamic({ ssr: false })` ✅
- [x] `CustomCursor` — `dynamic({ ssr: false })` ✅
- [x] `WelcomeModal` — `dynamic({ ssr: false })` ✅
- [x] `OrderBot` — `dynamic({ ssr: false })` ✅
- [x] `page.tsx` cart localStorage — moved to `useEffect` ✅
