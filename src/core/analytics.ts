import { supabase } from '@/lib/supabase';
import type { AntiLoopStrategy } from './antojo';

export type StrategyPerformance = {
  strategy: AntiLoopStrategy;
  conversions: number;
  impressions: number;
  conversionRate: number;
  avgTicket: number;
  revenue: number;
};

export type AbandonedSession = {
  userId: string;
  lastCartAt: string;
  cartValue: number;
  items: string[];
};

/**
 * Detecta sesiones donde el usuario agregó productos al carrito
 * (ADD_TO_CART) pero nunca confirmó el pedido (CONFIRM_ORDER)
 * dentro de los siguientes N minutos.
 *
 * La consulta agrupa por user_id y excluye a quienes sí confirmaron.
 */
export async function detectAbandonedSessions(
  minutes = 2,
): Promise<AbandonedSession[]> {
  try {
    const windowMs = minutes * 60_000;
    const since = new Date(Date.now() - windowMs * 3).toISOString();

    // 1. Traer todos los ADD_TO_CART en la ventana de tiempo
    const { data: addLogs, error: addErr } = await supabase
      .from('ai_logs')
      .select('user_id, cart, total, created_at')
      .eq('intent', 'ADD_TO_CART')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (addErr || !addLogs) return [];

    // 2. Agrupar por userId: quedarse con el más reciente ADD_TO_CART
    const latestByUser: Map<
      string,
      { lastCartAt: string; cart: any; total: number }
    > = new Map();

    for (const row of addLogs) {
      const uid = row.user_id;
      if (!uid || latestByUser.has(uid)) continue;
      const cartData = row.cart;
      const items = Array.isArray(cartData) ? cartData : (cartData?.items || []);
      latestByUser.set(uid, {
        lastCartAt: row.created_at,
        cart: items,
        total: Number(row.total || 0),
      });
    }

    if (latestByUser.size === 0) return [];

    const userIds = Array.from(latestByUser.keys());

    // 3. Buscar CONFIRM_ORDER para esos mismos usuarios dentro de la ventana
    const { data: confirmLogs, error: confErr } = await supabase
      .from('ai_logs')
      .select('user_id')
      .in('user_id', userIds)
      .eq('intent', 'CONFIRM_ORDER')
      .gte('created_at', since);

    if (confErr) return [];

    const confirmedUsers = new Set(
      (confirmLogs || []).map((r) => r.user_id),
    );

    // 4. Filtrar: solo los que NO confirmaron
    const abandoned: AbandonedSession[] = [];

    for (const uid of userIds) {
      if (confirmedUsers.has(uid)) continue;
      const entry = latestByUser.get(uid)!;
      const itemNames = Array.isArray(entry.cart)
        ? entry.cart
        : entry.cart.map((i: any) => i.name || i);

      abandoned.push({
        userId: uid,
        lastCartAt: entry.lastCartAt,
        cartValue: entry.total,
        items: itemNames,
      });
    }

    return abandoned;
  } catch (err) {
    console.error(JSON.stringify({
      event: 'DETECT_ABANDONED_FAILED',
      error: String(err),
      timestamp: Date.now(),
    }));
    return [];
  }
}

/**
 * Query event_logs for strategy_impressed / strategy_converted events
 * and compute per-strategy performance.
 *
 * Falls back to empty array if the DB is unreachable or tables missing.
 */
export async function getTopPerformingStrategy(
  days = 7,
): Promise<StrategyPerformance[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: impressed, error: impErr } = await supabase
    .from('event_logs')
    .select('payload_json, occurred_at')
    .eq('event_type', 'strategy_impressed')
    .gte('occurred_at', since);

  const { data: converted, error: convErr } = await supabase
    .from('event_logs')
    .select('payload_json, occurred_at')
    .eq('event_type', 'strategy_converted')
    .gte('occurred_at', since);

  if (impErr || convErr || !impressed || !converted) {
    return [];
  }

  type Payload = { strategy?: string; total?: number; orderId?: string };
  type Row = { payload_json: Payload | null; occurred_at: string };

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
  const result: StrategyPerformance[] = allStrategies.map((strategy) => {
    const impressions = impByStrategy[strategy] || 0;
    const conv = convByStrategy[strategy] || { count: 0, total: 0 };
    const conversions = conv.count;
    const conversionRate = impressions > 0 ? conversions / impressions : 0;
    const avgTicket = conversions > 0 ? conv.total / conversions : 0;

    return {
      strategy,
      conversions,
      impressions,
      conversionRate,
      avgTicket,
      revenue: conv.total,
    };
  });

  result.sort((a, b) => b.conversionRate - a.conversionRate);
  return result;
}

export async function getBotAnalytics() {
  // 1. Obtener datos de órdenes y eventos
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('total, created_at, channel, customer_phone');

  const { data: events, error: eventsErr } = await supabase
    .from('wa_events')
    .select('action, timestamp, phone');

  if (ordersErr || eventsErr) throw new Error('Error al obtener métricas');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // --- Pedidos por Día ---
  const ordersByDay: Record<string, number> = {};
  orders?.forEach(o => {
    const day = o.created_at.split('T')[0];
    ordersByDay[day] = (ordersByDay[day] || 0) + 1;
  });

  // --- Ticket Promedio ---
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
  const averageTicket = orders?.length ? totalRevenue / orders.length : 0;

  // --- Conversión Chat -> Pedido ---
  // Definimos conversión como: Usuarios que iniciaron chat vs Usuarios que crearon orden
  const uniqueChatUsers = new Set(events?.map(e => e.phone)).size;
  const uniqueOrderUsers = new Set(orders?.filter(o => o.channel === 'WHATSAPP').map(o => o.customer_phone)).size;

  const conversionRate = uniqueChatUsers > 0 ? (uniqueOrderUsers / uniqueChatUsers) * 100 : 0;

  return {
    summary: {
      totalOrders: orders?.length || 0,
      totalRevenue,
      averageTicket,
      conversionRate: `${conversionRate.toFixed(2)}%`,
      ordersToday: ordersByDay[todayStr] || 0
    },
    ordersByDay,
    funnel: {
      chats: uniqueChatUsers,
      orders: uniqueOrderUsers
    }
  };
}
export async function getBusinessMetrics() {
  try {
    // 1. Revenue & Orders
    const { data: ordersData, error: ordersErr } = await supabase
      .from('orders')
      .select('total');
    
    if (ordersErr) throw ordersErr;
    
    const revenue = ordersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const ordersCount = ordersData?.length || 0;

    // 2. AI Cost
    const { data: costsData, error: costsErr } = await supabase
      .from('ai_costs')
      .select('cost');
    
    if (costsErr) throw costsErr;
    
    const aiCost = costsData?.reduce((sum, c) => sum + (c.cost || 0), 0) || 0;

    // 3. Profit
    const profit = revenue - aiCost;

    // 4. Avg Ticket
    const avgTicket = ordersCount > 0 ? revenue / ordersCount : 0;

    // 5. Top Strategy
    const strategies = await getTopPerformingStrategy(30);
    const topStrategy = strategies.length > 0 ? strategies[0].strategy : 'none';

    return {
      revenue: Number(revenue.toFixed(2)),
      aiCost: Number(aiCost.toFixed(4)),
      profit: Number(profit.toFixed(2)),
      orders: ordersCount,
      avgTicket: Number(avgTicket.toFixed(2)),
      topStrategy
    };
  } catch (err) {
    console.error("[ANALYTICS] Error calculating business metrics:", err);
    return {
      revenue: 0,
      aiCost: 0,
      profit: 0,
      orders: 0,
      avgTicket: 0,
      topStrategy: 'none'
    };
  }
}
