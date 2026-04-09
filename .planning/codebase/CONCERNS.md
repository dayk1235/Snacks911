# Concerns

## 1. Technical Debt
- **Data Persistence**: Admin data is entirely stored in the browser's `localStorage` via the `AdminStore` library. This implies data is isolated per device/browser and volatile. If cache is wiped, the DB is effectively reset. No central database.
- **Inline Styles**: Significant use of extensive inline styles in root layouts and components (e.g., `src/app/admin/layout.tsx`).

## 2. Security
- Default fallback credentials `admin` / `snacks911` exist inside the `adminSession.ts` utility. Must override using `ADMIN_USER` and `ADMIN_PASS` in production.
- Client-side Database: An attacker with device access can directly edit `localStorage`, altering "Server-like" admin state natively without needing to spoof API calls.

## 3. System Brittleness
- Server vs Client Syncing: Some layouts behave differently based on hydrating client state. Next.js can sometimes throw hydration mismatch errors if offline DOM does not match the server HTML payload exactly.
