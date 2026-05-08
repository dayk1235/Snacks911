/**
 * lib/admin/metricsEngine.ts
 * 
 * Aggregates business and performance metrics for the Admin Dashboard.
 */

import { getSupabaseAdmin } from '@/lib/db.server';

export interface DashboardMetrics {
  today: {
    orders: number;
    revenue: number;
    avgTicket: number;
    conversionRate: number;
  };
  hourlyRevenue: { hour: string; total: number }[];
  dailyOrders: { date: string; count: number }[];
  topProducts: { name: string; quantity: number }[];
  alerts: {
    unpaidOld: number;
    unresolvedReviews: number;
    circuitBreakerActive: boolean;
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabaseAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStr = todayStart.toISOString();

  // 1. Today's Core Metrics
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total, created_at, status')
    .gte('created_at', todayStr)
    .not('status', 'eq', 'cancelled');

  const ordersCount = todayOrders?.length || 0;
  const revenue = todayOrders?.reduce((sum: number, o: any) => sum + Number(o.total), 0) || 0;
  const avgTicket = ordersCount > 0 ? revenue / ordersCount : 0;

  // 2. Conversion Rate (Today)
  // Conversion = (Created Orders) / (Unique Users with 'ADD_TO_CART' intent)
  const { data: uniqueUsers } = await supabase
    .from('ai_logs')
    .select('user_id')
    .gte('created_at', todayStr)
    .eq('intent', 'ADD_TO_CART');
  
  const uniqueAdders = new Set(uniqueUsers?.map((u: any) => u.user_id)).size;
  const conversionRate = uniqueAdders > 0 ? (ordersCount / uniqueAdders) * 100 : 0;

  // 3. Hourly Revenue (Last 12 Hours)
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: hourlyData } = await supabase
    .from('orders')
    .select('total, created_at')
    .gte('created_at', twelveHoursAgo)
    .not('status', 'eq', 'cancelled');

  const hourlyMap: Record<string, number> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.now() - i * 60 * 60 * 1000);
    const hourKey = `${d.getHours()}:00`;
    hourlyMap[hourKey] = 0;
  }

  hourlyData?.forEach((o: any) => {
    const d = new Date(o.created_at);
    const hourKey = `${d.getHours()}:00`;
    if (hourlyMap[hourKey] !== undefined) {
      hourlyMap[hourKey] += Number(o.total);
    }
  });

  const hourlyRevenue = Object.entries(hourlyMap)
    .map(([hour, total]) => ({ hour, total }))
    .reverse();

  // 4. Daily Orders (Last 30 Days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: dailyData } = await supabase
    .from('orders')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo)
    .not('status', 'eq', 'cancelled');

  const dailyMap: Record<string, number> = {};
  dailyData?.forEach((o: any) => {
    const dateKey = o.created_at.split('T')[0];
    dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1;
  });

  const dailyOrders = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 5. Top 5 Products (Current Month)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const { data: productData } = await supabase
    .from('order_items')
    .select('product_name, quantity')
    .gte('created_at', monthStart.toISOString());

  const productMap: Record<string, number> = {};
  productData?.forEach((i: any) => {
    productMap[i.product_name] = (productMap[i.product_name] || 0) + (i.quantity || 1);
  });

  const topProducts = Object.entries(productMap)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // 6. Alerts
  const twentyFiveMinAgo = new Date(Date.now() - 25 * 60 * 1000).toISOString();
  const { count: unpaidOld } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'awaiting_payment')
    .lte('created_at', twentyFiveMinAgo);

  const { count: unresolvedReviews } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .lte('rating', 3)
    .not('rating', 'is', null)
    .eq('review_escalated', true);

  const { data: circuitState } = await supabase
    .from('system_state')
    .select('value')
    .eq('id', 'circuit_breaker')
    .maybeSingle();

  const circuitBreakerActive = !!circuitState?.value;

  return {
    today: {
      orders: ordersCount,
      revenue,
      avgTicket,
      conversionRate,
    },
    hourlyRevenue,
    dailyOrders,
    topProducts,
    alerts: {
      unpaidOld: unpaidOld || 0,
      unresolvedReviews: unresolvedReviews || 0,
      circuitBreakerActive,
    }
  };
}
