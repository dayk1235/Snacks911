'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminStore } from '@/lib/adminStore';
import { supabase } from '@/lib/supabase';
import { playOrderNotification } from '@/lib/sound';
import { Order, AdminProduct, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/adminTypes';

const CARD: React.CSSProperties = {
  background: '#111', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem',
};

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders]     = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [newOrderFlash, setNewOrderFlash] = useState<string | null>(null);
  const [cardsReady, setCardsReady] = useState(false);
  const audioInitialized = useRef(false);

  useEffect(() => {
    const load = async () => {
      const o = await AdminStore.getOrders();
      const p = await AdminStore.getProducts();
      setOrders(o);
      setProducts(p);
      setCardsReady(true);
    };
    load();
  }, []);

  // ── Supabase real-time: new order notification ──────────────────────────
  const handleNewOrder = useCallback((orderId: string) => {
    // Play sound (initializes audio context on first call)
    playOrderNotification();
    // Flash effect
    setNewOrderFlash(orderId);
    setTimeout(() => setNewOrderFlash(null), 3000);
    // Refresh orders list
    AdminStore.getOrders().then(setOrders);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-order-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const id = (payload.new as Record<string, unknown>)?.id as string;
          if (id) handleNewOrder(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleNewOrder]);

  // Initialize audio context on first user interaction (browser autoplay policy)
  useEffect(() => {
    const initOnce = () => {
      if (audioInitialized.current) return;
      audioInitialized.current = true;
      playOrderNotification();
      document.removeEventListener('click', initOnce);
    };
    document.addEventListener('click', initOnce, { once: true });
    return () => document.removeEventListener('click', initOnce);
  }, []);

  // KPI computations
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders   = orders.filter(o => o.createdAt.slice(0, 10) === today);
  const todayRevenue  = todayOrders.reduce((s, o) => s + o.total, 0);
  const pendingCount  = todayOrders.filter(o => o.status === 'pending').length;
  const avgTicket     = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;
  const availableProds = products.filter(p => p.available).length;

  // Yesterday comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayOrders  = orders.filter(o => o.createdAt.slice(0, 10) === yesterdayStr);
  const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.total, 0);
  const yesterdayAvg     = yesterdayOrders.length > 0 ? Math.round(yesterdayRevenue / yesterdayOrders.length) : 0;

  const pctChange = (now: number, prev: number) => {
    if (prev === 0) return now > 0 ? { label: 'Nuevo', color: '#22c55e' } : null;
    const pct = ((now - prev) / prev) * 100;
    const up = pct >= 0;
    return {
      label: `${up ? '↑' : '↓'} ${Math.abs(Math.round(pct))}%`,
      color: up ? '#22c55e' : '#ef4444',
    };
  };

  // Multi-item order %
  const multiItemOrders = todayOrders.filter(o => o.items.reduce((s, i) => s + i.quantity, 0) >= 2);
  const multiItemPct = todayOrders.length > 0 ? Math.round((multiItemOrders.length / todayOrders.length) * 100) : 0;

  // Top 3 products today
  const todayProductFreq: Record<string, { count: number; revenue: number }> = {};
  todayOrders.forEach(o => {
    o.items.forEach(item => {
      if (!todayProductFreq[item.productName]) todayProductFreq[item.productName] = { count: 0, revenue: 0 };
      todayProductFreq[item.productName].count += item.quantity;
      todayProductFreq[item.productName].revenue += item.price * item.quantity;
    });
  });
  const topToday = Object.entries(todayProductFreq)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 3);

  // Weekly revenue (last 7 days)
  const weekRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter(o => o.createdAt.slice(0, 10) === key && o.status !== 'pending');
    return { day: d.toLocaleDateString('es-MX', { weekday: 'short' }), total: dayOrders.reduce((s, o) => s + o.total, 0), count: dayOrders.length };
  });
  const weekTotal = weekRevenue.reduce((s, d) => s + d.total, 0);
  const weekOrders = weekRevenue.reduce((s, d) => s + d.count, 0);
  const weekAvg = weekOrders > 0 ? Math.round(weekTotal / weekOrders) : 0;

  // Top products by frequency
  const productFreq: Record<string, { count: number; revenue: number }> = {};
  orders.filter(o => o.status !== 'pending').forEach(o => {
    o.items.forEach(item => {
      if (!productFreq[item.productName]) productFreq[item.productName] = { count: 0, revenue: 0 };
      productFreq[item.productName].count += item.quantity;
      productFreq[item.productName].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.entries(productFreq)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5);

  // Peak hours
  const hourFreq: Record<number, number> = {};
  orders.filter(o => o.status !== 'pending').forEach(o => {
    const h = new Date(o.createdAt).getHours();
    hourFreq[h] = (hourFreq[h] || 0) + 1;
  });
  const peakHour = Object.entries(hourFreq).sort(([, a], [, b]) => b - a)[0];

  const kpis = [
    { label: 'Ventas del día',    value: `$${todayRevenue.toLocaleString()}`, icon: '💰', color: '#FFB800', sub: `${todayOrders.length} pedidos`, change: pctChange(todayRevenue, yesterdayRevenue) },
    { label: 'Pedidos hoy',       value: todayOrders.length.toString(),        icon: '📦', color: '#FF4500', sub: `${pendingCount} pendientes`,   change: pctChange(todayOrders.length, yesterdayOrders.length) },
    { label: 'Ticket promedio',   value: `$${avgTicket}`,                     icon: '🎯', color: '#22c55e', sub: `Ayer: ${yesterdayAvg ? '$' + yesterdayAvg : '—'}`, change: pctChange(avgTicket, yesterdayAvg) },
    { label: 'Pedidos 2+ items',  value: `${multiItemPct}%`,                  icon: '🛒', color: '#818cf8', sub: `${multiItemOrders.length} de ${todayOrders.length}`, change: null },
  ];

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Buenos días 👋
          </h1>
          <p style={{ color: '#555', marginTop: '0.25rem', fontSize: '0.8rem' }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* New order flash */}
          {newOrderFlash && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.75rem', borderRadius: '50px',
              background: 'rgba(255,69,0,0.15)', border: '1px solid rgba(255,69,0,0.3)',
              animation: 'flashPulse 0.6s ease-in-out infinite alternate',
            }}>
              <span style={{ fontSize: '0.8rem' }}>🔔</span>
              <span style={{ fontSize: '0.65rem', color: '#FF4500', fontWeight: 700 }}>Nuevo pedido</span>
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.75rem', borderRadius: '50px',
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 700 }}>En vivo</span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map((kpi, i) => (
          <div key={kpi.label} style={{
            ...CARD,
            opacity: cardsReady ? 1 : 0,
            transform: cardsReady ? 'translateY(0)' : 'translateY(24px)',
            transition: `opacity .5s ease ${i * 0.08}s, transform .5s ease ${i * 0.08}s`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <p style={{ color: '#555', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                {kpi.label}
              </p>
              <span style={{ fontSize: '1.4rem', opacity: 0.5, flexShrink: 0, marginLeft: '0.5rem' }}>{kpi.icon}</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: kpi.color, margin: '0.3rem 0', lineHeight: 1 }}>
              {kpi.value}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.7rem', color: '#444', margin: 0 }}>{kpi.sub}</p>
              {kpi.change && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 800,
                  color: kpi.change.color,
                  background: kpi.change.color + '15',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}>
                  {kpi.change.label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly revenue + Top products + Peak hour */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Weekly revenue chart */}
        <div style={CARD}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Última semana — ${weekTotal.toLocaleString()}
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
            {weekRevenue.map((d, i) => {
              const maxVal = Math.max(...weekRevenue.map(w => w.total), 1);
              const h = (d.total / maxVal) * 100;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '100%', height: `${Math.max(h, 4)}px`,
                    background: d.total > 0 ? 'linear-gradient(to top, #FF4500, #FF6A00)' : 'rgba(255,255,255,0.04)',
                    borderRadius: '4px', transition: 'height 0.3s',
                  }} />
                  <span style={{ fontSize: '0.55rem', color: '#555', fontWeight: 600 }}>{d.day.slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: '#444' }}>
            {weekOrders} pedidos · Ticket prom: ${weekAvg}
          </p>
        </div>

        {/* Top 3 products today */}
        <div style={CARD}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            🏆 Top 3 — hoy
          </p>
          {topToday.length === 0 ? (
            <p style={{ color: '#444', fontSize: '0.8rem', margin: 0 }}>Sin ventas aún</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {topToday.map(([name, data], i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, width: '20px', height: '20px',
                    borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? 'rgba(255,69,0,0.2)' : i === 1 ? 'rgba(255,184,0,0.15)' : 'rgba(255,255,255,0.06)',
                    color: i === 0 ? '#FF4500' : i === 1 ? '#FFB800' : '#888',
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#555' }}>{data.count} uds</div>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#22c55e' }}>${data.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak hour + quick stats */}
        <div style={CARD}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            📊 Datos rápidos
          </p>
          {peakHour ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#888' }}>Hora pico:</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FF4500' }}>
                {peakHour[0]}:00
              </div>
              <div style={{ fontSize: '0.7rem', color: '#444' }}>{peakHour[1]} pedidos</div>
            </div>
          ) : (
            <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: '#444' }}>Sin datos de hora pico</div>
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.25rem' }}>Total general</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#22c55e' }}>
              ${orders.filter(o => o.status !== 'pending').reduce((s, o) => s + o.total, 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#444' }}>{orders.length} pedidos totales</div>
          </div>
        </div>
      </div>

      {/* Two columns: recent orders + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        {/* Recent orders */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Pedidos recientes</h2>
            <button
              onClick={() => router.push('/admin/orders')}
              style={{ background: 'none', border: 'none', color: '#FF4500', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Ver todos →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentOrders.length === 0 && (
              <p style={{ color: '#444', textAlign: 'center', padding: '1rem 0' }}>Sin pedidos aún</p>
            )}
            {recentOrders.map(order => {
              const waConfirmed = order.whatsappConfirmed ?? false;
              return (
              <div key={order.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: '#151515', border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                      {order.id}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#555' }}>• {order.customerName}</span>
                    {!waConfirmed && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700,
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        background: 'rgba(239,68,68,0.12)',
                        color: '#ef4444',
                      }}>
                        ⚠️ WhatsApp
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#444' }}>
                    {order.items.map(i => i.productName).join(', ')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFB800' }}>
                    ${order.total}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#444' }}>{fmtTime(order.createdAt)}</div>
                </div>
                <div style={{
                  padding: '0.25rem 0.6rem', borderRadius: '20px',
                  background: ORDER_STATUS_COLORS[order.status] + '22',
                  color: ORDER_STATUS_COLORS[order.status],
                  fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {ORDER_STATUS_LABELS[order.status]}
                </div>
              </div>
            );
              })}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={CARD}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Acciones rápidas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: '➕ Nuevo producto', href: '/admin/products' },
                { label: '📦 Ver pedidos',    href: '/admin/orders'   },
                { label: '💰 Ver ventas',     href: '/admin/sales'    },
                { label: '🔥 Optimizar',      href: '/admin/optimize' },
                { label: '⚙️  Configuración', href: '/admin/settings' },
              ].map(a => (
                <button
                  key={a.href}
                  onClick={() => router.push(a.href)}
                  style={{
                    padding: '0.7rem 1rem', borderRadius: '10px',
                    background: '#151515', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#ccc', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.18s, color 0.18s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.3)'; (e.currentTarget as HTMLElement).style.color = '#FF4500'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status over accepting orders */}
          <div style={{ ...CARD }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Estado del negocio
            </p>
            <StatusWidget />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes flashPulse {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0.6; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}

function StatusWidget() {
  const [accepting, setAccepting] = useState(true);
  useEffect(() => {
    AdminStore.getSettings().then(s => setAccepting(s.acceptingOrders));
  }, []);
  const toggle = async () => {
    const s = await AdminStore.getSettings();
    s.acceptingOrders = !s.acceptingOrders;
    await AdminStore.saveSettings(s);
    setAccepting(s.acceptingOrders);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.9rem', color: accepting ? '#22c55e' : '#FF4500', fontWeight: 700 }}>
        {accepting ? '🟢 Abierto' : '🔴 Cerrado'}
      </span>
      <button
        onClick={toggle}
        style={{
          width: '44px', height: '24px', borderRadius: '12px',
          background: accepting ? '#22c55e' : '#333',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: '3px',
          left: accepting ? '22px' : '3px',
          width: '18px', height: '18px',
          background: '#fff', borderRadius: '50%',
          transition: 'left 0.2s',
          display: 'block',
        }} />
      </button>
    </div>
  );
}
