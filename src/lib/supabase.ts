import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

function getSupabase() {
  if (!supabaseInstance) {
    if (!supabaseUrl) {
      throw new Error('FATAL: NEXT_PUBLIC_SUPABASE_URL is not defined. Check your .env file.');
    }
    if (!supabaseKey) {
      throw new Error('FATAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined. Check your .env file.');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  }
});
