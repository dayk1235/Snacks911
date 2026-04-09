# Architecture

## 1. System Design
- Architecture Pattern: Next.js App Router (React components + API Routes)
- Paradigm: Client-side rendering for interactivity (Animations, Admin Panel), Server-side API for Auth.
- State Persistence: Offline-first / Local-first approach for Admin Data via LocalStorage (`AdminStore`).

## 2. Data Flow
- Public site -> WhatsApp (Intent) -> Manual Order Intake
- Admin Panel -> Reads/Writes from local `localStorage` state
- Auth -> `POST /api/admin/login` -> Sets HttpOnly Cookie `snacks911_admin_session` -> Checked by `middleware.ts` and `layout.tsx` API `/me`.

## 3. Key Components
- `AdminStore`: Wrapper around localStorage to simulate a database for Products, Orders, Sales, Categories, and Settings.
- `middleware.ts`: Secures `/admin` routes via server-side verification.
- Session Management: Cryptographically signed token (`HMAC SHA-256`) checked explicitly on route load.
