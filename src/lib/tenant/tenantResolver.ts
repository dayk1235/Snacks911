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
 * Resolves a tenant by their slug (for URL routing).
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const now = Date.now();
  const cacheKey = `slug-${slug}`;

  if (tenantCache.has(cacheKey)) {
    const cached = tenantCache.get(cacheKey)!;
    if (now < cached.expires) return cached.data;
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
