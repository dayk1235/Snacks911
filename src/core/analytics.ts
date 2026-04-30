import { supabase } from '@/lib/supabase';

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
