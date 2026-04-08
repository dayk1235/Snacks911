'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { AdminStore } from '@/lib/adminStore';
import { Order, AdminProduct, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/adminTypes';

const CARD: React.CSSProperties = {
  background: '#111', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem',
};

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders]     = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const o = AdminStore.getOrders();
    const p = AdminStore.getProducts();
    setOrders(o);
    setProducts(p);

    const validCards = cardsRef.current.filter(Boolean);
    gsap.from(validCards, { opacity: 0, y: 28, stagger: 0.09, duration: 0.5, ease: 'power3.out' });
  }, []);

  // KPI computations
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders   = orders.filter(o => o.createdAt.slice(0, 10) === today);
  const todayRevenue  = todayOrders.reduce((s, o) => s + o.total, 0);
  const pendingCount  = orders.filter(o => o.status === 'pending').length;
  const avgTicket     = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;
  const availableProds = products.filter(p => p.available).length;

  const kpis = [
    { label: 'Ventas del día',    value: `$${todayRevenue.toLocaleString()}`, icon: '💰', color: '#FFB800', sub: `${todayOrders.length} pedidos` },
    { label: 'Pedidos pendientes',value: pendingCount.toString(),              icon: '⏳', color: '#FF4500', sub: 'Requieren atención' },
    { label: 'Ticket promedio',   value: `$${avgTicket}`,                     icon: '🎯', color: '#22c55e', sub: 'Por pedido' },
    { label: 'Productos activos', value: `${availableProds}/${products.length}`, icon: '🍗', color: '#818cf8', sub: 'Disponibles' },
  ];

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0 }}>
          Buenos días 👋
        </h1>
        <p style={{ color: '#555', marginTop: '0.3rem', fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpis.map((kpi, i) => (
          <div key={kpi.label} ref={el => { cardsRef.current[i] = el; }} style={CARD}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#555', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
                  {kpi.label}
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 900, color: kpi.color, margin: 0, lineHeight: 1 }}>
                  {kpi.value}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#444', margin: '0.4rem 0 0' }}>{kpi.sub}</p>
              </div>
              <span style={{ fontSize: '1.8rem', opacity: 0.6 }}>{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Two columns: recent orders + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        {/* Recent orders */}
        <div ref={el => { cardsRef.current[4] = el; }} style={CARD}>
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
            {recentOrders.map(order => (
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
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div ref={el => { cardsRef.current[5] = el; }} style={CARD}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Acciones rápidas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: '➕ Nuevo producto', href: '/admin/products' },
                { label: '📦 Ver pedidos',    href: '/admin/orders'   },
                { label: '💰 Ver ventas',     href: '/admin/sales'    },
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
          <div ref={el => { cardsRef.current[6] = el; }} style={{ ...CARD }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Estado del negocio
            </p>
            <StatusWidget />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusWidget() {
  const [accepting, setAccepting] = useState(true);
  useEffect(() => {
    setAccepting(AdminStore.getSettings().acceptingOrders);
  }, []);
  const toggle = () => {
    const s = AdminStore.getSettings();
    s.acceptingOrders = !s.acceptingOrders;
    AdminStore.saveSettings(s);
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
