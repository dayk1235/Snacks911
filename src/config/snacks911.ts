/**
 * config/snacks911.ts
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              SNACKS 911 — Flagship App Config                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * This is the single file that makes this app "Snacks 911".
 * All platform features that Snacks 911 uses are enabled here.
 *
 * To deploy this platform for a NEW tenant:
 *   1. Copy this file to src/config/{tenant-slug}.ts
 *   2. Change tenantId, businessName, slug
 *   3. Adjust features and upsellConfig to match the client's plan
 *   4. Register the config in src/config/index.ts
 *
 * Pure TypeScript — no React, no DB, no side effects.
 */

import type { TenantConfig } from '@/core/config/featureFlags';
import { defaultTenantConfig } from '@/core/config/defaultConfig';

export const snacks911Config: TenantConfig = {
  ...defaultTenantConfig,

  // ─── Identity ───────────────────────────────────────────────
  tenantId: 'snacks911',
  businessName: 'Snacks 911',
  whatsappNumber: '525584507458',
  slug: 'snacks911',
  locale: 'es-MX',
  currency: 'MXN',
  plan: 'pro',

  // ─── AI Personality ─────────────────────────────────────────
  personality:
    'Eres un mesero experto en alitas y snacks de Snacks 911. ' +
    'Eres amable, eficiente y siempre buscas incrementar el ticket promedio ' +
    'sugiriendo combos y complementos de forma natural.',

  // ─── Feature Flags ───────────────────────────────────────────
  // Every flag that Snacks 911 uses must be explicitly enabled here.
  features: {
    upsell_progression: true,   // Main → Drink → Side → Dessert progression
    margin_scoring: true,        // Profit-margin weighted recommendations
    loyalty_program: true,       // Points & redemption at checkout
    referrals: true,             // Referral code system
    payment_links: true,         // Conekta payment links
    whatsapp_channel: true,      // WhatsApp outbound delivery
    ai_responses: true,          // AI-generated responses
    cart_abandonment: true,      // Abandonment detection & recovery
    multi_language: false,       // Spanish only for now
  },

  // ─── Upsell Engine ──────────────────────────────────────────
  upsellConfig: {
    progressionEnabled: true,
    marginWeight: 2,             // margin * 2 in the scoring formula
    minScore: -100,              // Suppress very negative-scored suggestions
    progressionOrder: [
      ['boneless', 'alitas', 'combo', 'combos'],   // Step 1: main dishes
      ['bebida', 'bebidas'],                         // Step 2: drinks
      ['papas'],                                     // Step 3: sides
      ['postre', 'postres'],                         // Step 4: desserts
    ],
  },
};
