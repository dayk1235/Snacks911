# ADR 001: SaaS Modularization Strategy

## Status
Accepted

## Context
The Snacks 911 codebase is a high-velocity project with 261 passing integration tests. We need to transition to a SaaS-ready architecture to support multiple tenants (different businesses) while preserving the "Snacks 911" flagship application as the primary deployment.

## Decision
We decided on **Logical Modularization** (in-place) over a physical monorepo split (Turborepo/pnpm workspaces).

### Rationale
1. **Risk Mitigation**: A physical split into `packages/core` and `apps/snacks911` would require a complete overhaul of the test infrastructure (Jest aliases, module resolution) and the CI/CD pipeline, risking the stability of the 261 passing tests.
2. **Speed**: Logical modularization via TypeScript path aliases (`@core/*`, `@app/*`) achieves the same architectural boundary enforcement in a fraction of the time.
3. **Multi-tenancy**: Multi-tenancy is handled via a config-driven system (`TenantConfig`) rather than separate package deployments.

## Consequences
- **Boundary Enforcement**: Developers must use `@core/*` for platform logic and `@app/*` for tenant-specific configuration.
- **Config-Driven Bot**: The `botEngine` and skills now read from a `TenantConfig` object instead of using hardcoded constants or implicit business logic.
- **Flagship Identity**: `src/config/snacks911.ts` is now the single source of truth for the flagship app's identity.
- **Easy Onboarding**: To add a new tenant, a developer simply creates a new config in `src/config/` and registers it in the registry.

## Enforcement
- TypeScript path aliases prevent `src/core` from importing from `src/app` (circular dependency protection).
- Continuous Integration will run tests against the flagship `snacks911` configuration.
