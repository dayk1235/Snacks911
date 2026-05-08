/**
 * core/revenueMetrics.ts — Data-driven revenue intelligence.
 * 
 * Part of Phase 2: Analytics & Revenue Intelligence.
 * Calculates key performance indicators directly from event logs.
 */

import { supabase } from '@/lib/supabase';
import type { AntiLoopStrategy } from './antojo';

export interface StrategyMetrics {
  strategy: AntiLoopStrategy;
  conversionRate: number;
  avgTicket: number;
  orders: number;
  revenue: number;
  impressions: number;
}

/**
 * Calculates conversionRate and avgTicket per anti-loop strategy
 * by querying strategy_impressed / strategy_converted events.
 *
 * Returns empty array on DB errors (graceful fallback).
 */
export async function getStrategyMetrics(days = 7): Promise<StrategyMetrics[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: impressed, error: impErr } = await supabase
    .from('event_logs')
    .select('payload_json')
    .eq('event_type', 'strategy_impressed')
    .gte('occurred_at', since);

  const { data: converted, error: convErr } = await supabase
    .from('event_logs')
    .select('payload_json')
    .eq('event_type', 'strategy_converted')
    .gte('occurred_at', since);

  if (impErr || convErr || !impressed || !converted) {
    return [];
  }

  type Payload = { strategy?: string; total?: number; orderId?: string };
  type Row = { payload_json: Payload | null };

  const impByStrategy: Record<string, number> = {};
  const convByStrategy: Record<string, { count: number; total: number }> = {};

  for (const row of impressed as Row[]) {
    const s = (row.payload_json as Payload)?.strategy || 'antojo';
    impByStrategy[s] = (impByStrategy[s] || 0) + 1;
  }

  for (const row of converted as Row[]) {
    const p = row.payload_json as Payload;
    const s = p?.strategy || 'antojo';
    if (!convByStrategy[s]) convByStrategy[s] = { count: 0, total: 0 };
    convByStrategy[s].count++;
    convByStrategy[s].total += Number(p?.total || 0);
  }

  const allStrategies: AntiLoopStrategy[] = ['antojo', 'fomo', 'social', 'anchor'];

  return allStrategies.map((strategy) => {
    const impressions = impByStrategy[strategy] || 0;
    const conv = convByStrategy[strategy] || { count: 0, total: 0 };
    const orders = conv.count;
    const conversionRate = impressions > 0 ? orders / impressions : 0;
    const avgTicket = orders > 0 ? conv.total / orders : 0;

    return { strategy, conversionRate, avgTicket, orders, revenue: conv.total, impressions };
  });
}

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
