/**
 * core/alertEngine.ts — System health and revenue monitoring.
 * 
 * Part of Phase 2: Analytics & Revenue Intelligence.
 * Detects performance anomalies in real-time based on event logs.
 */

import { supabase } from '@/lib/supabase';

export interface Alert {
  type: 'conversion_low' | 'upsell_low' | 'fallback_high';
  message: string;
  severity: 'warning' | 'critical';
}

/**
 * Scans recent event logs to detect performance issues.
 * 
 * Rules:
 * 1. Conversion < 20% (last 60 mins)
 * 2. Upsell Rate < 10% (last 60 mins)
 * 3. Fallback Rate > 5% (last 60 mins)
 */
export async function checkAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();
  const sixtyMinsAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  // 1. Conversion Alert
  const { count: orders } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'order_created')
    .gte('occurred_at', sixtyMinsAgo);

  const { count: carts } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'cart_created')
    .gte('occurred_at', sixtyMinsAgo);

  console.log(`AlertEngine: orders=${orders}, carts=${carts}`);

  if (carts && carts > 10) { // Minimum sample size of 10
    const convRate = (orders || 0) / carts;
    if (convRate < 0.20) {
      alerts.push({
        type: 'conversion_low',
        message: `Conversion is at ${(convRate * 100).toFixed(1)}% (Threshold: 20%)`,
        severity: 'critical'
      });
    }
  }

  // 2. Upsell Alert
  const { count: accepted } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'upsell_accepted')
    .gte('occurred_at', sixtyMinsAgo);

  const { count: suggested } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'upsell_suggested')
    .gte('occurred_at', sixtyMinsAgo);

  if (suggested && suggested > 5) { // Minimum sample size of 5
    const upRate = (accepted || 0) / suggested;
    if (upRate < 0.10) {
      alerts.push({
        type: 'upsell_low',
        message: `Upsell acceptance is at ${(upRate * 100).toFixed(1)}% (Threshold: 10%)`,
        severity: 'warning'
      });
    }
  }

  // 3. Fallback Rate Alert
  const { count: fallbacks } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'fallback_triggered') 
    .gte('occurred_at', sixtyMinsAgo);

  const { count: totalIntents } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'intent_detected')
    .gte('occurred_at', sixtyMinsAgo);

  if (totalIntents && totalIntents > 20) {
    const fallRate = (fallbacks || 0) / totalIntents;
    if (fallRate > 0.05) {
      alerts.push({
        type: 'fallback_high',
        message: `System fallback rate is too high: ${(fallRate * 100).toFixed(1)}%`,
        severity: 'critical'
      });
    }
  }

  return alerts;
}
