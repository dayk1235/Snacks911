/**
 * core/revenueMetrics.ts — Data-driven revenue intelligence.
 * 
 * Part of Phase 2: Analytics & Revenue Intelligence.
 * Calculates key performance indicators directly from event logs.
 */

import { supabase } from '@/lib/supabase';

/**
 * Calculates total revenue for a specific date.
 * Sums up 'total' from 'order_created' event payloads.
 */
export async function getDailyRevenue(date: Date): Promise<number> {
  const d = new Date(date);
  const start = new Date(d.setHours(0,0,0,0)).toISOString();
  const end = new Date(d.setHours(23,59,59,999)).toISOString();

  const { data, error } = await supabase
    .from('event_logs')
    .select('payload_json')
    .eq('event_type', 'order_created')
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  if (error || !data) return 0;

  return data.reduce((sum, row) => sum + (Number(row.payload_json?.total) || 0), 0);
}

/**
 * Calculates the order conversion rate (Orders / Carts Created).
 */
export async function getConversionRate(date: Date): Promise<number> {
  const d = new Date(date);
  const start = new Date(d.setHours(0,0,0,0)).toISOString();
  const end = new Date(d.setHours(23,59,59,999)).toISOString();

  const { count: orders } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'order_created')
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  const { count: carts } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'cart_created')
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  if (!carts || carts === 0) return 0;
  return (orders || 0) / carts;
}

/**
 * Calculates the upsell acceptance rate (Accepted / Suggested).
 */
export async function getUpsellRate(date: Date): Promise<number> {
  const d = new Date(date);
  const start = new Date(d.setHours(0,0,0,0)).toISOString();
  const end = new Date(d.setHours(23,59,59,999)).toISOString();

  const { count: accepted } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'upsell_accepted')
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  const { count: suggested } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'upsell_suggested')
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  if (!suggested || suggested === 0) return 0;
  return (accepted || 0) / suggested;
}
