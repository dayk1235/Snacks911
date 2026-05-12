/**
 * config/index.ts
 *
 * Tenant config registry.
 *
 * Maps tenant slugs to their TenantConfig objects.
 * The bot engine, API routes, and middleware use this to
 * look up the active config without touching the database.
 *
 * For dynamic (DB-driven) tenant resolution, see lib/tenant/tenantResolver.ts.
 */

import type { TenantConfig } from '@/core/config/featureFlags';
import { snacks911Config } from './snacks911';

// ─── Config Registry ────────────────────────────────────────────────────────
// Add new tenant configs here as the platform grows.

const tenantRegistry: Record<string, TenantConfig> = {
  snacks911: snacks911Config,
};

/**
 * Returns the TenantConfig for the given slug.
 * Falls back to snacks911Config as the default (current single-tenant deploy).
 */
export function getTenantConfig(slug?: string): TenantConfig {
  if (!slug) return snacks911Config;
  return tenantRegistry[slug] ?? snacks911Config;
}

/** The active flagship config for this deployment */
export { snacks911Config };

/** Re-export types for convenience */
export type { TenantConfig } from '@/core/config/featureFlags';
export { isFeatureEnabled, getUpsellConfig } from '@/core/config/featureFlags';
