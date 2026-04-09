# Stack

## 1. Core Technologies
- Application Framework: Next.js 16.2.2 (App Router)
- Languages: TypeScript (^5), JavaScript
- Runtime environment: Node.js (^20)
- Rendering Strategy: Client and Server Components

## 2. Frontend
- UI Framework: React 19.2.4
- Styling: TailwindCSS v4 with PostCSS
- Animation: GSAP 3.14.2, Framer Motion
- State Management: React useState/useEffect, custom localStorage store (`AdminStore`)

## 3. Backend / Data
- Database/Persistence: LocalStorage (Browser-side persistence for admin data `snacks911_admin_*`), Server-side API Routes (App Router Route Handlers)
- Caching: Next.js built-in caching

## 4. Infrastructure & Ops
- Package Manager: npm (`package-lock.json`)
- Linter: ESLint 9+

## 5. Standard Libraries
- Web APIs (localStorage)
- Web Crypto API (`crypto.subtle` for HMAC signatures)
