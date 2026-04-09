# Directory Structure

## 1. Application Core (`src/app/`)
- `/admin`: Admin Dashboard views (`layout.tsx`, `login/page.tsx` etc)
- `/api`: Serverless API route handlers (`/api/admin/login`, `/api/admin/logout`, `/api/admin/me`)
- `/components`: Shared React components (assumed structure)

## 2. Supporting Modules (`src/lib/`)
- `adminStore.ts`: LocalStorage DB wrapper defining methods like `getProducts`, `saveOrder`, etc.
- `adminTypes.ts`: TypeScript interfaces for DB entities.
- `sound.ts`: Shared audio logic.
- `server/adminSession.ts`: Authentication crypto helpers.
- `server/persistence.ts`: Storage helpers.

## 3. Configuration Files
- `next.config.ts`: Next.js configuration
- `postcss.config.mjs`: Styling conf
- `tsconfig.json` & `tsconfig.tsbuildinfo`: TypeScript configurations
- `.eslintrc.json` / `eslint.config.mjs`: Linter configurations
