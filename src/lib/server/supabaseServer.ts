
if (typeof window === 'undefined') {
  console.log("[SUPABASE SERVER ENV]:", {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "MISSING",
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING"
  });
}

/**
 * Server-only Supabase client with service_role (bypasses RLS).
 * NEVER import this in client components.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CustomerProfile } from '@/core/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Anon client — for routes that need RLS-respected access
function createAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('FATAL: Supabase Anon credentials missing (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export const supabaseAnon: SupabaseClient = (typeof window === 'undefined') 
  ? createAnonClient() 
  : ({} as any);

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('FATAL: NEXT_PUBLIC_SUPABASE_URL is missing. Check your environment.');
  }
  if (!key) {
    throw new Error('FATAL: SUPABASE_SERVICE_ROLE_KEY is missing. Check your environment.');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function getCustomerProfileFromDB(phone: string): Promise<CustomerProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("phone_number, name, total_orders, last_order_date, last_order_total, favorite_product, preferences, restrictions, created_at")
    .eq("phone_number", phone)
    .single();

  if (error || !data) return null;

  return {
    phone: data.phone_number,
    name: data.name,
    totalOrders: data.total_orders,
    totalSpent: data.last_order_total,
    lastOrderAt: data.last_order_date ? new Date(data.last_order_date) : null,
    createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    favoriteProduct: data.favorite_product,
    preferences: data.preferences,
    restrictions: data.restrictions,
  };
}

export async function upsertCustomerProfile(profile: Partial<CustomerProfile> & { phone: string }): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  const row = {
    phone_number: profile.phone,
    name: profile.name,
    favorite_product: profile.favoriteProduct,
    preferences: profile.preferences,
    restrictions: profile.restrictions,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("customers")
    .upsert(row, { onConflict: 'phone_number' });

  if (error) {
    console.error("[supabaseServer] Error upserting profile:", error);
    throw error;
  }
}
