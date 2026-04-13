/**
 * Server-only Supabase client with service_role (bypasses RLS).
 * NEVER import this in client components.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service role client — bypasses RLS for admin operations
export const supabaseAdmin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })
  : null;

// Anon client — respects RLS (fallback only)
export const supabaseAnon = supabaseUrl
  ? createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })
  : null;
