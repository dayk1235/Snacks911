# Conventions

## 1. Code Style
- React: Heavy use of inline styles mixed with standard JSX, explicitly avoiding CSS modules but having global styling capabilities.
- TypeScript: Standard interfaces defined centrally in `src/lib/adminTypes.ts`.
- State Tracking: Relying heavily on component `useEffect` arrays to bootstrap and reset component state.

## 2. State & Component Lifecycle
- React Hooks for UI state (`useState`, `useEffect`, `useRef`, `useCallback`).
- Client-side interval polling for continuous background checks (`setInterval` for pending orders badge).
- GSAP usage directly interacting with React Refs (`cardRef.current`, `formRef.current`) during `useEffect`.

## 3. Naming Patterns
- Components: PascalCase filenames and component names.
- APIs / Routes: Route handler functions (`GET`, `POST`) within camelCased subdirectory structures (`/api/admin/...`).
- Storage Constants: Uppercase object constants (e.g., `K.PRODUCTS`).
