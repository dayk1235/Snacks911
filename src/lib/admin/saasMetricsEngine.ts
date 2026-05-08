import { getSupabaseAdmin } from '@/lib/db.server';

export interface SaaSMetrics {
  mrr: number;
  activeTenants: number;
  churnRate: number;
  ltv: number;
  avgTicket: number;
}

const PLAN_PRICES = {
  basic: 2499,
  pro: 4999
};

/**
 * SaaS Metrics Engine
 * Computes core business metrics for the platform.
 */
export async function getSaaSMetrics(): Promise<SaaSMetrics> {
  const supabase = getSupabaseAdmin();

  // 1. Compute MRR & Active Tenants
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('status', 'active');

  const activeTenants = activeSubs?.length || 0;
  const mrr = (activeSubs || []).reduce((acc: number, sub: any) => acc + (PLAN_PRICES[sub.plan as keyof typeof PLAN_PRICES] || 0), 0);

  // 2. Compute Churn Rate (Last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: churnedLast30 } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'canceled')
    .gt('canceled_at', thirtyDaysAgo.toISOString());

  const churnRate = activeTenants > 0 ? (churnedLast30 || 0) / (activeTenants + (churnedLast30 || 0)) : 0;

  // 3. Compute Avg Ticket (Last 30 days)
  const { data: orderMetrics } = await supabase
    .from('orders')
    .select('total')
    .gt('created_at', thirtyDaysAgo.toISOString());

  const totalRevenue = (orderMetrics || []).reduce((acc: number, o: any) => acc + Number(o.total), 0);
  const avgTicket = orderMetrics?.length ? totalRevenue / orderMetrics.length : 0;

  // 4. Compute LTV (Lifetime Value)
  // LTV = ARPU / User Churn
  const arpu = activeTenants > 0 ? mrr / activeTenants : 0;
  const ltv = churnRate > 0 ? arpu / churnRate : arpu * 12; // Fallback to 12 months if 0 churn

  return {
    mrr,
    activeTenants,
    churnRate: Number((churnRate * 100).toFixed(2)),
    ltv: Math.round(ltv),
    avgTicket: Math.round(avgTicket)
  };
}

/**
 * SQL Version (Optimized View)
 * 
 * CREATE OR REPLACE VIEW saas_business_metrics AS
 * WITH active_stats AS (
 *   SELECT 
 *     COUNT(*) as active_count,
 *     SUM(CASE WHEN plan = 'basic' THEN 2499 WHEN plan = 'pro' THEN 4999 ELSE 0 END) as mrr
 *   FROM subscriptions WHERE status = 'active'
 * ),
 * churn_stats AS (
 *   SELECT COUNT(*) as churned_count
 *   FROM subscriptions 
 *   WHERE status = 'canceled' AND canceled_at > NOW() - INTERVAL '30 days'
 * )
 * SELECT 
 *   mrr,
 *   active_count as active_tenants,
 *   ROUND((churned_count::numeric / (active_count + churned_count + 0.00001)) * 100, 2) as churn_rate_pct,
 *   ROUND((mrr / (active_count + 0.00001)) / (churned_count::numeric / (active_count + churned_count + 0.00001) + 0.01), 2) as estimated_ltv
 * FROM active_stats, churn_stats;
 */
