/**
 * Server-only Supabase client with service_role (bypasses RLS).
 * NEVER import this in client components.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service role client — bypasses RLS for admin operations
export const supabaseAdmin: SupabaseClient | null = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })
  : null;

// Anon client — for routes that need RLS-respected access
export const supabaseAnon: SupabaseClient | null = supabaseUrl
  ? createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })
  : null;

// Helper to get admin client or throw (use in webhooks)
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error('Missing Supabase environment variables (URL or SERVICE_ROLE_KEY)');
  }
  return supabaseAdmin;
}
