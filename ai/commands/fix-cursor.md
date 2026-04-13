# fix-cursor

Fix custom cursor issues.

## Steps

1. Read `src/components/CustomCursor.tsx`
2. Ensure cursor renders at full opacity on mount (no `opacity: 0` wrapper)
3. Set initial position to viewport center
4. Touch devices: return `null` or remove element — no RAF, no listeners
5. RAF loop: cleanup on unmount with `cancelAnimationFrame`
6. No `useState` — only `useRef` to avoid re-renders
7. Hover detection: check `closest('a, button, input, [role="button"]')`
8. Build and verify
