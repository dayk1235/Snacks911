/**
 * core/config/defaultConfig.ts
 *
 * Platform baseline TenantConfig — all features disabled (opt-in model).
 *
 * This is the "blank tenant" starting point. Production tenants extend this
 * with their own overrides (see src/config/ for implementations).
 *
 * Pure TypeScript — no side effects.
 */

import type { TenantConfig } from './featureFlags';
import { platformDefaultFeatures, defaultUpsellConfig } from './featureFlags';

export const defaultTenantConfig: TenantConfig = {
  tenantId: 'default',
  businessName: 'Mi Negocio',
  whatsappNumber: '520000000000',
  slug: 'default',
  locale: 'es-MX',
  currency: 'MXN',
  personality: 'Eres un asistente amable y eficiente.',
  plan: 'basic',
  features: { ...platformDefaultFeatures },
  upsellConfig: { ...defaultUpsellConfig },
};
