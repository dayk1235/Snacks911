/**
 * lib/tenant/tenantResolver.ts
 * 
 * Resolves the tenant from incoming request data (WhatsApp number or slug).
 * Implements a simple in-memory cache to avoid excessive DB lookups.
 */

import { getSupabaseAdmin } from '@/lib/db.server';

export interface Tenant {
  id: string;
  slug: string;
  business_name: string;
  whatsapp_number: string;
  whatsapp_token: string;
  ai_personality: string;
  primary_color: string;
  logo_url?: string;
  plan: 'basic' | 'pro' | 'enterprise';
}

const tenantCache = new Map<string, { data: Tenant; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Flagship Tenant ──────────────────────────────────────────────────────────
// Hard-coded fast-path for Snacks 911 (tenant #1 / root domain).
// This ensures the main business always resolves instantly without a DB roundtrip.
// The 'id' is overwritten with the real DB UUID on every successful DB hit.
const FLAGSHIP_SLUG = 'snacks911';
export const FLAGSHIP_TENANT: Tenant = {
  id: '0fd8116f-40af-4208-a0ef-ea9f2ea67d69', // Real UUID from DB
  slug: 'snacks911',
  business_name: 'Snacks 911',
  whatsapp_number: '525584507458',
  whatsapp_token: '',
  ai_personality:
    'Eres el agente de ventas estrella de Snacks 911. Eres amable, rápido y muy bueno para cerrar ventas de combos y snacks. Hablas como chilango, pero profesional.',
  primary_color: '#FF4500',
  plan: 'enterprise',
};

/**
 * Resolves a tenant by the WhatsApp number they are messaging.
 */
export async function getTenantByWhatsAppNumber(whatsappNumber: string): Promise<Tenant | null> {
  const now = Date.now();
  const cacheKey = `wa-${whatsappNumber}`;

  if (tenantCache.has(cacheKey)) {
    const cached = tenantCache.get(cacheKey)!;
    if (now < cached.expires) return cached.data;
  }

  // Fast-path for Snacks 911's own WhatsApp number
  if (whatsappNumber === FLAGSHIP_TENANT.whatsapp_number) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('tenants').select('*').eq('slug', FLAGSHIP_SLUG).maybeSingle();
      const tenant = (data as Tenant) ?? FLAGSHIP_TENANT;
      tenantCache.set(cacheKey, { data: tenant, expires: now + CACHE_TTL });
      return tenant;
    } catch {
      return FLAGSHIP_TENANT; // DB down → still serve the flagship
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('whatsapp_number', whatsappNumber)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;

  const tenant = data as Tenant;
  tenantCache.set(cacheKey, { data: tenant, expires: now + CACHE_TTL });
  return tenant;
}

/**
 * Resolves a tenant by their slug (for URL routing or botEngine context).
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const now = Date.now();
  const cacheKey = `slug-${slug}`;

  if (tenantCache.has(cacheKey)) {
    const cached = tenantCache.get(cacheKey)!;
    if (now < cached.expires) return cached.data;
  }

  // Fast-path: 'snacks911' always resolves — DB hit to get the real UUID, fallback if unavailable
  if (slug === FLAGSHIP_SLUG) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('tenants').select('*').eq('slug', slug).maybeSingle();
      const tenant = (data as Tenant) ?? FLAGSHIP_TENANT;
      tenantCache.set(cacheKey, { data: tenant, expires: now + CACHE_TTL });
      return tenant;
    } catch {
      return FLAGSHIP_TENANT; // DB unavailable → return hardcoded constant
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;

  const tenant = data as Tenant;
  tenantCache.set(cacheKey, { data: tenant, expires: now + CACHE_TTL });
  return tenant;
}
