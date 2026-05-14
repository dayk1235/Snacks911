# Bugs Fixed

## Build errors

### 1. `Export cn doesn't exist in target module`
**File**: `src/components/ui/DesignSystem.tsx:5`
**Cause**: Imported `{ cn }` from `@/lib/utils/core` which didn't export it.
**Fix**: Added `cn()` function to `src/lib/utils/core.ts`:
```ts
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
```
**Also fixed**: `src/app/menu/page.tsx` — missing imports for `cn`, `PremiumButton`, `AnimatedBackground`, `motion`, `AnimatePresence`.

### 2. `Cannot find name 'AnimatedBackground'` / `'motion'` / `'AnimatePresence'`
**File**: `src/app/menu/page.tsx`
**Cause**: Components used without import.
**Fix**: Added all missing imports from `@/components/ui/DesignSystem`, `@/lib/utils/core`, and `framer-motion`.

### 3. Duplicate JSX in chips rendering
**File**: `src/components/chat/OrderBot.tsx:602-604`
**Cause**: Stale code left from edit — duplicate `{chip.label}</button>))}`.
**Fix**: Removed duplicate lines.

## Runtime bugs

### 4. Chat fallback error for all messages
**File**: `src/core/ai/aiAgent.ts`
**Cause**: `responseSchema` + `responseMimeType: 'application/json'` conflict in Gemini SDK.
**Fix**: Rewrote agent to use `systemInstruction` + regex JSON extraction + auto-correction.
**Model changed**: `gemini-1.5-flash` → `gemini-2.5-flash-lite`.

### 5. Menu/products not showing in chat
**File**: `src/core/botEngine.ts:dbGetProductsSafe()`
**Cause**: API returning `[]` (empty array) was treated as valid data, not triggering fallback.
**Fix**: 
```ts
// Before: return Array.isArray(data) ? data : fallback;
// After:  arr.length > 0 ? arr : fallback;
```
**Also**: Replaced 6-item hardcoded fallback with full `staticProducts` from `@/data/products`.

### 6. Product cards without images
**File**: `src/core/botEngine.ts:buildChatUI()`
**Cause**: Image URL mapping didn't use `getProductImage()` as final fallback.
**Fix**: Updated `getProductImageUrl()` helper and used it in `buildChatUI()` and `buildChatActions()`.

### 7. `[HEALTH] DB sync failed` warning
**File**: `src/core/selfHealingEngine.ts:56`
**Cause**: Supabase `system_state` table unreachable (project paused or table missing).
**Impact**: Non-critical — system uses in-memory fallback. Chat still works with static product data.

## ChatMessage type extension

**File**: `src/core/types.ts`
**Added**: `ui?: BotUI | null` to `ChatMessage` interface to support chat UI cards and cart summary.
