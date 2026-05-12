/**
 * core/config/featureFlags.ts
 *
 * Centralized, deterministic feature flag system.
 *
 * Design principles:
 * - Flags are typed enums — no magic strings
 * - Each flag defaults to false (opt-in model)
 * - TenantConfig is the single source of truth per tenant
 * - Pure TypeScript — no DB, no React, no side effects
 * - Fully testable in isolation
 */

// ─── Feature Flags ──────────────────────────────────────────────────────────

/**
 * All platform-level feature flags.
 * Add a new flag here to register it across the system.
 */
export type FeatureFlag =
  | 'upsell_progression'   // Cart-context upsell: Main → Drink → Side → Dessert
  | 'margin_scoring'        // Profit-margin weighted upsell recommendations
  | 'loyalty_program'       // Points accumulation & redemption at checkout
  | 'referrals'             // Referral code generation and discount system
  | 'payment_links'         // Conekta payment link generation at checkout
  | 'whatsapp_channel'      // Outbound WhatsApp message delivery
  | 'ai_responses'          // Use AI-generated responses (vs deterministic)
  | 'cart_abandonment'      // Cart abandonment detection & recovery flows
  | 'multi_language';       // i18n support (beyond es-MX default)

// ─── Upsell Configuration ───────────────────────────────────────────────────

export interface UpsellConfig {
  /** Enable the Main→Drink→Side→Dessert progression rule */
  progressionEnabled: boolean;
  /**
   * Weight multiplier for profit margin in the scoring formula.
   * score += margin * marginWeight
   * Default: 2 (see selectBestUpsell)
   */
  marginWeight: number;
  /**
   * Minimum score threshold for showing an upsell.
   * Candidates below this score are suppressed.
   */
  minScore: number;
  /**
   * Category progression order (configurable per tenant).
   * The engine tries to suggest the next missing category in this order.
   */
  progressionOrder: string[][];
}

// ─── Tenant Config ──────────────────────────────────────────────────────────

/**
 * Full configuration for a single tenant (a business using the platform).
 *
 * Usage:
 *   const config = snacks911Config;
 *   if (isFeatureEnabled('loyalty_program', config)) { ... }
 */
export interface TenantConfig {
  /** Unique identifier matching the tenants table in DB */
  tenantId: string;
  /** Display name shown in bot responses */
  businessName: string;
  /** WhatsApp number for order delivery */
  whatsappNumber: string;
  /** URL slug for routing (/menu, /t/{slug}) */
  slug: string;
  /** Locale for number formatting and default language */
  locale: string;
  /** Currency code */
  currency: string;
  /** AI personality/system prompt override */
  personality: string;
  /** Per-feature opt-in flags */
  features: Record<FeatureFlag, boolean>;
  /** Upsell engine fine-tuning */
  upsellConfig: UpsellConfig;
  /**
   * Subscription plan — controls which features can be enabled.
   * Enforcement happens in subscriptionGuard.ts at the infra layer.
   */
  plan: 'basic' | 'pro' | 'enterprise';
}

// ─── Feature Flag Helpers ────────────────────────────────────────────────────

/**
 * Returns true if the given feature is enabled for the tenant config.
 * Safe to call with undefined config — returns false (fail-closed).
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  config: TenantConfig | undefined | null
): boolean {
  if (!config) return false;
  return config.features[flag] === true;
}

/**
 * Returns the upsell config for the tenant, or the platform default.
 */
export function getUpsellConfig(config: TenantConfig | undefined | null): UpsellConfig {
  return config?.upsellConfig ?? defaultUpsellConfig;
}

// ─── Platform Defaults ───────────────────────────────────────────────────────

export const defaultUpsellConfig: UpsellConfig = {
  progressionEnabled: false,
  marginWeight: 2,
  minScore: -100,
  progressionOrder: [
    ['boneless', 'alitas', 'combo', 'combos'],  // mains
    ['bebida', 'bebidas'],                        // drinks
    ['papas'],                                    // sides
    ['postre', 'postres'],                        // desserts
  ],
};

/**
 * Baseline platform config — all features disabled.
 * New tenants start from here and override what they need.
 */
export const platformDefaultFeatures: Record<FeatureFlag, boolean> = {
  upsell_progression: false,
  margin_scoring: false,
  loyalty_program: false,
  referrals: false,
  payment_links: false,
  whatsapp_channel: false,
  ai_responses: false,
  cart_abandonment: false,
  multi_language: false,
};
