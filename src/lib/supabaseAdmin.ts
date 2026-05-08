// Server-side only
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isServer = typeof window === 'undefined';

if (isServer && !supabaseServiceKey) {
  throw new Error('Missing SUPABASE SERVICE ROLE KEY (server only)');
}

export const supabaseAdmin = isServer 
  ? createClient(supabaseUrl || '', supabaseServiceKey || '')
  : ({} as any);
