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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

// ─── UI Components ────────────────────────────────────────────────────────────

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, color }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between"
  >
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        {icon}
      </div>
      {trend && (
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
    </div>
  </motion.div>
);

const AlertItem: React.FC<{ type: 'warning' | 'error' | 'success'; title: string; desc: string }> = ({ type, title, desc }) => {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800'
  };
  const icons = {
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    error: <Zap className="w-5 h-5 text-red-500" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 ${styles[type]}`}>
      {icons[type]}
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs opacity-80">{desc}</p>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase Client (Using env vars)
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
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s

    // Realtime Subscription for Active Orders
    const channel = supabase
      .channel('active-orders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: "status=in.(pending,confirmed,preparing,ready,awaiting_payment)" 
      }, (payload) => {
        // Refresh local list on any change
        refreshActiveOrders();
      })
      .subscribe();

    refreshActiveOrders();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshActiveOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, total, status, created_at')
      .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'awaiting_payment'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setActiveOrders(data);
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Control</h1>
          <p className="text-gray-500 mt-1">Monitoreo en tiempo real de Snacks 911</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Estado del Sistema</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-green-600 font-bold uppercase tracking-wider">Operativo</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Pedidos Hoy" 
          value={metrics?.today.orders || 0} 
          icon={<ShoppingBag className="w-6 h-6" />} 
          color="bg-indigo-500"
        />
        <MetricCard 
          title="Ventas Hoy" 
          value={`$${metrics?.today.revenue.toLocaleString() || 0}`} 
          icon={<DollarSign className="w-6 h-6" />} 
          color="bg-emerald-500"
          trend="+12%"
        />
        <MetricCard 
          title="Ticket Promedio" 
          value={`$${Math.round(metrics?.today.avgTicket || 0)}`} 
          icon={<TrendingUp className="w-6 h-6" />} 
          color="bg-amber-500"
        />
        <MetricCard 
          title="Conversión Bot" 
          value={`${Math.round(metrics?.today.conversionRate || 0)}%`} 
          icon={<Users className="w-6 h-6" />} 
          color="bg-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Revenue Hourly */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Ventas por Hora (Últimas 12h)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.hourlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Realtime Active Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Pedidos Activos</h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">En Vivo</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {activeOrders.map((order) => (
                      <motion.tr 
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">{order.customer_name}</td>
                        <td className="px-6 py-4 text-gray-600">${order.total}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                            order.status === 'ready' ? 'bg-green-100 text-green-700' :
                            order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Top Products */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Top 5 Productos (Mes)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.topProducts}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="quantity"
                  >
                    {metrics?.topProducts.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Alertas Críticas</h3>
            <div className="space-y-4">
              {metrics?.alerts.unpaidOld > 0 && (
                <AlertItem 
                  type="warning" 
                  title="Pagos Pendientes" 
                  desc={`${metrics.alerts.unpaidOld} pedidos llevan >25min esperando pago.`} 
                />
              )}
              {metrics?.alerts.unresolvedReviews > 0 && (
                <AlertItem 
                  type="error" 
                  title="Baja Calificación" 
                  desc={`${metrics.alerts.unresolvedReviews} reseñas negativas requieren atención.`} 
                />
              )}
              {metrics?.alerts.circuitBreakerActive ? (
                <AlertItem 
                  type="error" 
                  title="Circuit Breaker Activo" 
                  desc="El bot ha bloqueado respuestas por seguridad." 
                />
              ) : (
                <AlertItem 
                  type="success" 
                  title="IA Estable" 
                  desc="El sistema está procesando pedidos sin anomalías." 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
