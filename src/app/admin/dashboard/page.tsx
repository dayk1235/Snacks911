'use client';

/**
 * app/admin/dashboard/page.tsx
 * 
 * High-performance Admin Dashboard with Realtime Metrics and Charts.
 */

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, Users, ShoppingBag, DollarSign, 
  AlertTriangle, CheckCircle, Clock, Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

// ─── Constants & Types ────────────────────────────────────────────────────────
const COLORS = ['#ff5a00', '#00d1ff', '#ff0055', '#7000ff', '#00ffaa'];

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  status?: string;
}

// ─── UI Components ────────────────────────────────────────────────────────────

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, status }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ translateY: -5, borderColor: 'rgba(255, 90, 0, 0.4)' }}
    className="glass p-6 rounded-2xl flex flex-col justify-between group transition-all"
  >
    <div className="flex justify-between items-start">
      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[var(--accent)] group-hover:shadow-[0_0_15px_var(--accent)] transition-all">
        {icon}
      </div>
      {trend && (
        <span className="text-[10px] font-black text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
          {trend}
        </span>
      )}
    </div>
    <div className="mt-6">
      <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-3xl font-black text-white mt-1 tracking-tighter">
        {typeof value === 'number' && value > 1000 ? value.toLocaleString() : value}
      </h3>
      {status && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[8px] text-green-500 font-black uppercase tracking-widest">{status}</span>
        </div>
      )}
    </div>
  </motion.div>
);

const ActivityItem: React.FC<{ type: 'order' | 'abandoned' | 'alert'; title: string; time: string; amount?: string }> = ({ type, title, time, amount }) => {
  const icons = {
    order: { emoji: '🔥', color: 'text-orange-500' },
    abandoned: { emoji: '⚠️', color: 'text-yellow-500' },
    alert: { emoji: '🚨', color: 'text-red-500' }
  };

  return (
    <div className="p-4 bg-white/2 border border-white/5 rounded-xl flex items-center gap-4 hover:bg-white/5 transition-all group">
      <div className="text-xl">{icons[type].emoji}</div>
      <div className="flex-1">
        <p className="text-sm font-bold text-white/90">{title}</p>
        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">{time}</p>
      </div>
      {amount && <div className="text-[var(--accent)] font-mono font-bold">{amount}</div>}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const json = await res.json();
      if (json.success) setMetrics(json.data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // 15s faster refresh
    const channel = supabase
      .channel('active-orders')
      .on('postgres_changes', { 
        event: '*', schema: 'public', table: 'orders',
        filter: "status=in.(pending,confirmed,preparing,ready,awaiting_payment)" 
      }, () => refreshActiveOrders())
      .subscribe();

    refreshActiveOrders();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  const refreshActiveOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, total, status, created_at')
      .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'awaiting_payment'])
      .order('created_at', { ascending: false }).limit(10);
    if (data) setActiveOrders(data);
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(255,90,0,0.3)]"></div>
        <div className="text-[var(--accent)] font-black tracking-[0.3em] uppercase text-xs animate-pulse">Initializing Command Center...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-10 selection:bg-[var(--accent)] selection:text-black">
      {/* Tactical Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[var(--accent)] text-black px-3 py-1 rounded font-black text-[0.6rem] tracking-widest uppercase">HQ-COMMAND</div>
            <div className="text-white/20 font-mono text-[0.6rem] tracking-widest">v4.0.2 // EST: {new Date().toLocaleTimeString()}</div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Control <span className="text-[var(--accent)]">Center</span></h1>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            Settings
          </button>
          <button className="flex-1 md:flex-none px-6 py-3 bg-[var(--accent)] text-black rounded-xl text-[0.7rem] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,90,0,0.4)] transition-all">
            Broadcast Msg
          </button>
        </div>
      </header>

      {/* Grid Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard 
          title="Pedidos Despachados" 
          value={metrics?.today.orders || 0} 
          icon={<ShoppingBag className="w-6 h-6" />} 
          status="Live"
        />
        <MetricCard 
          title="Ingresos Totales (24h)" 
          value={`$${metrics?.today.revenue.toLocaleString() || 0}`} 
          icon={<DollarSign className="w-6 h-6" />} 
          trend="+18.4%"
        />
        <MetricCard 
          title="Eficiencia de IA" 
          value={`${Math.round(metrics?.today.conversionRate || 0)}%`} 
          icon={<Zap className="w-6 h-6" />} 
          status="Optimized"
        />
        <MetricCard 
          title="Tickets Activos" 
          value={activeOrders.length} 
          icon={<Clock className="w-6 h-6" />} 
          status="In Queue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Main Chart Card */}
          <div className="glass p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black tracking-tight uppercase italic">Flujo de <span className="text-[var(--accent)]">Ventas</span></h3>
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Realtime Feed</div>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.hourlyRevenue}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="total" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Card */}
          <div className="glass rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-black tracking-tight uppercase italic">Status de <span className="text-[var(--accent)]">Pedidos</span></h3>
              <div className="bg-white/5 px-4 py-1 rounded-full text-[10px] font-black text-white/40 uppercase tracking-widest">Last Update: {new Date().toLocaleTimeString()}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/2 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Dispatcher ID</th>
                    <th className="px-8 py-5">Cliente</th>
                    <th className="px-8 py-5">Monto</th>
                    <th className="px-8 py-5">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence>
                    {activeOrders.map((order) => (
                      <motion.tr 
                        key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-8 py-6 font-mono text-xs text-white/40">#{order.id.slice(0, 8)}</td>
                        <td className="px-8 py-6 font-bold text-sm">{order.customer_name}</td>
                        <td className="px-8 py-6 text-[var(--accent)] font-mono font-bold">${order.total}</td>
                        <td className="px-8 py-6">
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${
                            order.status === 'ready' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                            order.status === 'preparing' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                            'bg-white/10 text-white/40 border border-white/10'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* Quick Actions Console */}
          <div className="glass p-8 rounded-3xl">
            <h3 className="text-lg font-black tracking-tight uppercase italic mb-6">Quick <span className="text-[var(--accent)]">Actions</span></h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { l: 'Activar Promo 🔥', c: 'bg-white/5 border-white/10' },
                { l: 'Forzar Upsell 📈', c: 'bg-white/5 border-white/10' },
                { l: 'Reiniciar IA 🤖', c: 'bg-red-500/10 border-red-500/20 text-red-500' },
                { l: 'Cerrar Cocina 🚫', c: 'bg-white/5 border-white/10 opacity-50' }
              ].map(act => (
                <button key={act.l} className={`w-full p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-[1.02] active:scale-95 ${act.c}`}>
                  {act.l}
                </button>
              ))}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="glass p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black tracking-tight uppercase italic">Live <span className="text-[var(--accent)]">Activity</span></h3>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            </div>
            <div className="space-y-4">
              <ActivityItem type="order" title="Nueva Orden: Carlos G." time="Hace 2 min" amount="$340" />
              <ActivityItem type="order" title="Nueva Orden: Sofía M." time="Hace 5 min" amount="$1,200" />
              <ActivityItem type="abandoned" title="Carrito Abandonado" time="Hace 12 min" />
              <ActivityItem type="alert" title="Pago Fallido: ID-4592" time="Hace 20 min" />
            </div>
          </div>

          {/* Inventory Health */}
          <div className="glass p-8 rounded-3xl">
            <h3 className="text-lg font-black tracking-tight uppercase italic mb-6">Inventory <span className="text-[var(--accent)]">Health</span></h3>
            <div className="space-y-6">
              {[
                { l: 'Boneless HQ', p: 85, c: 'bg-[var(--accent)]' },
                { l: 'Papas Sazonadas', p: 42, c: 'bg-yellow-500' },
                { l: 'Salsa Fuego', p: 12, c: 'bg-red-500' }
              ].map(inv => (
                <div key={inv.l}>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span className="text-white/60">{inv.l}</span>
                    <span className={inv.p < 20 ? 'text-red-500' : 'text-white'}>{inv.p}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${inv.p}%` }}
                      className={`h-full ${inv.c} shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
