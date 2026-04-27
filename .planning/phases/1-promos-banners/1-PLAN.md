---
wave: 1
depends_on: []
files_modified:
  - "src/app/api/store/settings/route.ts"
  - "src/lib/storeSettings.ts"
  - "src/app/admin/settings/page.tsx"
  - "src/components/PromoBanner.tsx"
  - "src/components/Hero.tsx"
autonomous: true
---

# Phase 1: Dynamic Promos & Banners

## Goal
Allow admins to control hero texts, discount banners, and urgent store announcements (e.g. "Cerrado hoy") dynamically from a dashboard, persisting the configuration in Supabase.

## Context
We already have a `store_settings` table acting as a key-value store in Supabase (currently holding `is_open` and `closed_message`). We will expand its usage. No schema migrations are required because it's a flexible key-value table.

## Tasks

<task>
  <objective>Create unified Store Settings API</objective>
  <read_first>
    - src/app/api/store/status/route.ts
  </read_first>
  <action>
    Create a new API route `src/app/api/store/settings/route.ts` to replace/extend `status/route.ts`.
    The GET method should fetch all keys from the `store_settings` table.
    The POST method should allow admins to UPSERT multiple keys at once:
    `is_open`, `closed_message`, `promo_banner_active`, `promo_banner_text`, `hero_title`, `hero_subtitle`.
  </action>
  <acceptance_criteria>
    - `src/app/api/store/settings/route.ts` exists and handles GET and POST.
    - POST method checks for admin/gerente session.
    - Code uses `supabaseAdmin.from('store_settings').upsert(...)`.
  </acceptance_criteria>
</task>

<task>
  <objective>Create Zustand global store for Settings</objective>
  <read_first>
    - src/lib/productStore.ts
  </read_first>
  <action>
    Create `src/lib/storeSettings.ts` using Zustand `create`.
    State should hold: `isOpen`, `closedMessage`, `promoActive`, `promoText`, `heroTitle`, `heroSubtitle`.
    Include `fetchSettings()` to GET from `/api/store/settings`.
    Include `updateSettings(newSettings)` to POST to `/api/store/settings`.
  </action>
  <acceptance_criteria>
    - `src/lib/storeSettings.ts` exports `useStoreSettings`.
    - It maps DB snake_case keys (e.g. `promo_banner_active`) to camelCase state.
  </acceptance_criteria>
</task>

<task>
  <objective>Build Admin Settings Dashboard</objective>
  <read_first>
    - src/app/admin/menu/page.tsx
  </read_first>
  <action>
    Create `src/app/admin/settings/page.tsx`.
    Build a UI with forms to toggle the Promo Banner (checkbox), edit the Promo Text (input), edit the Hero Title (input), edit the Hero Subtitle (textarea), and toggle Store Status (open/close).
    Use `useStoreSettings` to fetch on mount and update on save.
    Make it look consistent with the dark theme of the Menu Editor.
  </action>
  <acceptance_criteria>
    - `src/app/admin/settings/page.tsx` exists.
    - It contains inputs for all the settings keys.
    - It calls `updateSettings` on form submit.
  </acceptance_criteria>
</task>

<task>
  <objective>Connect Public UI Components to Settings Store</objective>
  <read_first>
    - src/components/PromoBanner.tsx
    - src/components/Hero.tsx
  </read_first>
  <action>
    Update `PromoBanner.tsx` and `Hero.tsx` to use `useStoreSettings()`.
    In `Hero.tsx`, replace static text like "El Hambre No Espera" with `heroTitle` (fallback to default if empty). Replace the subtitle paragraph with `heroSubtitle`.
    In `PromoBanner.tsx`, hide the banner if `promoActive` is false. Use `promoText` for the content.
    Call `fetchSettings()` on mount (or rely on a higher-level component, but for now invoke it inside useEffect if needed).
  </action>
  <acceptance_criteria>
    - `Hero.tsx` reads `useStoreSettings()`.
    - `PromoBanner.tsx` conditionally renders based on `useStoreSettings().promoActive`.
  </acceptance_criteria>
</task>

## Verification
- Run `npm run build` to ensure no TypeScript errors.
- Ensure navigating to `/admin/settings` loads the settings form without crashing.
