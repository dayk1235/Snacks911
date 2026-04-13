'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AdminStore } from '@/lib/adminStore';
import { supabase } from '@/lib/supabase';
import { playOrderNotification } from '@/lib/sound';
import type { Order, OrderStatus } from '@/lib/adminTypes';
import OrderAlertModal, { type PendingOrder } from '@/components/OrderAlertModal';

// ─── Operational constants ───────────────────────────────────────────────────
const TARGET_PREP_MIN = 8;        // ideal time per order
const OVERLOAD_THRESHOLD = 6;     // active orders that trigger overload
const HIGH_LOAD_THRESHOLD = 4;    // active orders that trigger warning

// ─── Status visual config ────────────────────────────────────────────────────
const STATUS: Record<OrderStatus, { bg: string; border: string; text: string; nextLabel: string }> = {
  pending:    { bg: '#1a1500', border: '#FFB800', text: '#FFB800', nextLabel: '🔥 Preparando' },
  preparing:  { bg: '#1a0a00', border: '#FF4500', text: '#FF4500', nextLabel: '✅ Listo' },
  ready:      { bg: '#001a0a', border: '#22c55e', text: '#22c55e', nextLabel: '✓ Entregado' },
  delivered:  { bg: '#111',    border: '#333',     text: '#555',    nextLabel: '' },
};

// ─── Priority: returns { border, timeColor, isOverdue } ─────────────────────
function priority(mins: number): { border: string | null; timeColor: string; overdue: boolean } {
  if (mins >= 10) return { border: '#ef4444', timeColor: '#ef4444', overdue: true };
  if (mins >= 5)  return { border: '#FF4500',  timeColor: '#FF4500',  overdue: false };
  return { border: null, timeColor: '', overdue: false };
}

function elapsed(iso: string): { mins: number; label: string } {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return { mins, label: mins < 1 ? 'Ahora' : `${mins}min` };
}

// ─── Sound cooldown: 3s between alerts ──────────────────────────────────────
let lastSoundAt = 0;
const SOUND_COOLDOWN_MS = 3000;

function playAlertWithCooldown() {
  const now = Date.now();
  if (now - lastSoundAt < SOUND_COOLDOWN_MS) return;
  lastSoundAt = now;
  playOrderNotification();
}

// ─── Load assessment ─────────────────────────────────────────────────────────
type LoadLevel = 'good' | 'high' | 'overloaded';

function assessLoad(activeCount: number, avgPrep: number): { level: LoadLevel; message: string; color: string } {
  if (activeCount >= OVERLOAD_THRESHOLD) {
    return { level: 'overloaded', message: '⚠️ Sobrecarga — considera pausar nuevos pedidos', color: '#ef4444' };
  }
  if (activeCount >= HIGH_LOAD_THRESHOLD || avgPrep > TARGET_PREP_MIN * 1.5) {
    return { level: 'high', message: 'Carga alta — ritmo acelerado', color: '#FFB800' };
  }
  return { level: 'good', message: '✅ Buen ritmo', color: '#22c55e' };
}

// ─── Metrics computation (pure, no re-renders) ──────────────────────────────
function computeMetrics(allOrders: Order[], activeOrders: Order[]) {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = allOrders.filter(o => o.createdAt.slice(0, 10) === today);
  const completedToday = todayOrders.filter(o => o.status === 'delivered').length;

  let prepSum = 0;
  let prepCount = 0;
  todayOrders.forEach(o => {
    const mins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
    if (o.status === 'delivered' || o.status === 'ready' || o.status === 'preparing') {
      prepSum += mins;
      prepCount++;
    }
  });
  const avgPrep = prepCount > 0 ? Math.round(prepSum / prepCount) : 0;

  // Prep time vs target
  const prepDelta = avgPrep - TARGET_PREP_MIN;
  const prepStatus = avgPrep === 0 ? 'good' : prepDelta <= 2 ? 'good' : prepDelta <= 5 ? 'high' : 'overloaded';

  return {
    active: activeOrders.length,
    completedToday,
    avgPrep,
    prepStatus,
    prepDelta,
  };
}

// ─── Main KDS Page ───────────────────────────────────────────────────────────
export default function KitchenDisplay() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [employeeName] = useState(() => {
    try { return typeof window !== 'undefined' ? localStorage.getItem('snacks911_employee_name') || '' : ''; } catch { return ''; }
  });
  const [tick, setTick] = useState(0);
  const [rtConnected, setRtConnected] = useState(true);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Double-tap tracking: { orderId, timestamp }
  const lastTap = useRef<{ id: string; ts: number }>({ id: '', ts: 0 });

  // ── Load orders ──────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    const o = await AdminStore.getOrders();
    setOrders(o);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Auto-refresh every 15s ───────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(loadOrders, 15000);
    return () => clearInterval(iv);
  }, [loadOrders]);

  // ── Tick every 30s for elapsed timers ────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Supabase real-time with connection tracking ──────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('kds-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const newOrder = payload.new as Record<string, unknown>;
        const orderId = String(newOrder.id);

        // Fetch order with items immediately for the alert modal
        const { data: fullOrder } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', orderId)
          .single();

        const items = (fullOrder?.order_items as Record<string, unknown>[] | []) ?? [];

        setPendingOrder({
          id: orderId,
          customerName: String(newOrder.customer_name || ''),
          customerPhone: String(newOrder.customer_phone || ''),
          total: Number(newOrder.total || 0),
          items: items.map(i => ({
            productName: String(i.product_name),
            quantity: Number(i.quantity),
            price: Number(i.price),
          })),
          createdAt: String(newOrder.created_at || new Date().toISOString()),
        });

        // Refresh full order list in background
        loadOrders();
        setNewIds(prev => new Set([...prev, orderId]));
        playAlertWithCooldown();
      })
      .subscribe((status) => {
        setRtConnected(status === 'SUBSCRIBED');
      });

    const heartbeat = setInterval(() => {
      const state = ch.state;
      setRtConnected(state === 'joined' || state === 'joining');
    }, 10000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(heartbeat);
    };
  }, [loadOrders]);

  // ── Clear new-order highlights after 3s ──────────────────────────────────
  useEffect(() => {
    if (newIds.size === 0) return;
    const t = setTimeout(() => setNewIds(new Set()), 3000);
    return () => clearTimeout(t);
  }, [newIds]);

  // ── Advance status with double-tap safety for "ready → delivered" ────────
  const advance = useCallback(async (order: Order) => {
    const next: Record<OrderStatus, OrderStatus> = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
      delivered: 'delivered',
    };
    const status = next[order.status];

    if (order.status === 'ready') {
      const now = Date.now();
      const last = lastTap.current;
      if (last.id !== order.id || now - last.ts > 2000) {
        lastTap.current = { id: order.id, ts: now };
        return;
      }
      lastTap.current = { id: '', ts: 0 };
    }

    const assignBy = (!order.handledBy && status === 'preparing') ? employeeName || undefined : undefined;
    await AdminStore.updateOrderStatus(order.id, status, assignBy);
    await loadOrders();
  }, [employeeName, loadOrders]);

  // ── Sort: priority-first, then oldest first ──────────────────────────────
  const active = orders
    .filter(o => o.status !== 'delivered')
    .sort((a, b) => {
      const aMins = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 60000);
      const bMins = Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 60000);
      const aPrio = aMins >= 10 ? 0 : aMins >= 5 ? 1 : 2;
      const bPrio = bMins >= 10 ? 0 : bMins >= 5 ? 1 : 2;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  // ── High volume mode: active > 5 ─────────────────────────────────────────
  const highVolume = active.length > 5;

  // ── Metrics (computed from derived values, no extra state) ───────────────
  const metrics = computeMetrics(orders, active);
  const load = assessLoad(metrics.active, metrics.avgPrep);
  const pendingCount = active.filter(o => o.status === 'pending').length;
  const preparingCount = active.filter(o => o.status === 'preparing').length;
  const readyCount = active.filter(o => o.status === 'ready').length;

  // ── Layout config based on volume ────────────────────────────────────────
  const cardMin = highVolume ? 220 : 300;
  const cardPad = highVolume ? '0.6rem' : '1rem';
  const cardGap = highVolume ? '0.5rem' : '0.75rem';
  const gridPad = highVolume ? '0.5rem' : '0.75rem';
  const itemFontSize = highVolume ? '0.75rem' : '0.85rem';
  const orderNumSize = highVolume ? '1.3rem' : '1.6rem';
  const showEmployee = !highVolume;
  const showNextLabel = !highVolume;
  const showBadge = !highVolume;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.97)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: highVolume ? '0.4rem 0.75rem' : '0.6rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.06em', color: '#fff' }}>
            COCINA
          </span>
          {highVolume && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 800,
              padding: '0.1rem 0.4rem', borderRadius: '4px',
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              letterSpacing: '0.05em',
            }}>
              ALTA DEMANDA
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', fontWeight: 700 }}>
          {pendingCount > 0 && <span style={{ color: '#FFB800' }}>⏳ {pendingCount}</span>}
          {preparingCount > 0 && <span style={{ color: '#FF4500' }}>🔥 {preparingCount}</span>}
          {readyCount > 0 && <span style={{ color: '#22c55e' }}>✅ {readyCount}</span>}
        </div>
        <button
          onClick={async () => {
            localStorage.removeItem('snacks911_employee_name');
            await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
            router.push('/admin/login');
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            background: 'rgba(255,69,0,0.08)',
            border: '1px solid rgba(255,69,0,0.15)',
            borderRadius: '8px',
            color: '#FF4500', fontSize: '0.72rem',
            fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.08)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Salir
        </button>
        {employeeName && showEmployee && (
          <span style={{ fontSize: '0.7rem', color: '#444' }}>👤 {employeeName}</span>
        )}
      </header>

      {/* ── Metrics bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        padding: highVolume ? '0.35rem 0.75rem' : '0.5rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        fontSize: '0.68rem',
        color: '#555',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span>
          📊 Activos: <b style={{ color: load.color }}>{metrics.active}</b>
        </span>
        <span>
          ✅ Completados: <b style={{ color: '#22c55e' }}>{metrics.completedToday}</b>
        </span>
        <span>
          ⏱ Prep prom: <b style={{ color:
            metrics.prepStatus === 'overloaded' ? '#ef4444'
              : metrics.prepStatus === 'high' ? '#FFB800'
              : '#22c55e'
          }}>{metrics.avgPrep}min</b>
          {metrics.avgPrep > 0 && (
            <span style={{ color: metrics.prepDelta > 0 ? '#ef4444' : '#22c55e', marginLeft: '0.2rem' }}>
              ({metrics.prepDelta > 0 ? '+' : ''}{metrics.prepDelta} vs {TARGET_PREP_MIN}min)
            </span>
          )}
        </span>
        {/* Load assessment — decision support */}
        <span style={{
          marginLeft: 'auto',
          fontWeight: 700,
          color: load.color,
          padding: '0.1rem 0.5rem',
          borderRadius: '4px',
          background: `${load.color}12`,
        }}>
          {load.message}
        </span>
      </div>

      {/* ── Overload warning banner ─────────────────────────────────────── */}
      {load.level === 'overloaded' && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          padding: '0.5rem 1rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#ef4444',
          animation: 'kdsBannerPulse 2s ease-in-out infinite',
        }}>
          🔴 Carga excesiva — pausa pedidos nuevos hasta bajar a {OVERLOAD_THRESHOLD - 1} activos
        </div>
      )}

      {/* ── Reconnecting banner ─────────────────────────────────────────── */}
      {!rtConnected && (
        <div style={{
          background: 'rgba(239,68,68,0.15)',
          borderBottom: '1px solid rgba(239,68,68,0.3)',
          padding: '0.4rem 1rem',
          textAlign: 'center',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#ef4444',
        }}>
          ⚠️ Reconectando… los pedidos se actualizan al restaurar
        </div>
      )}

      {/* ── Order Grid ──────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: gridPad,
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardMin}px), 1fr))`,
          gap: cardGap,
          alignContent: 'start',
        }}
      >
        {active.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '6rem 1rem',
            color: '#333',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🍽️</div>
            <p style={{ fontSize: '0.9rem' }}>Sin pedidos activos</p>
          </div>
        )}

        {active.map(order => {
          const s = STATUS[order.status];
          const { mins, label } = elapsed(order.createdAt);
          const p = priority(mins);
          const isNew = newIds.has(order.id);
          const isPreparing = order.status === 'preparing';
          const isReadyDoubleTap = order.status === 'ready' && lastTap.current.id === order.id;
          const borderColor = p.border || (isNew ? '#FF4500' : s.border);

          return (
            <div
              key={order.id}
              onClick={() => advance(order)}
              style={{
                background: isNew ? 'rgba(255,69,0,0.1)' : s.bg,
                border: `2px solid ${borderColor}`,
                borderRadius: highVolume ? '8px' : '12px',
                padding: cardPad,
                cursor: 'pointer',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'border-color 0.15s',
                animation: isNew
                  ? 'kdsFlash 0.5s ease 3'
                  : (p.overdue ? 'kdsPulse 1.5s ease-in-out infinite' : (isPreparing ? 'kdsGlow 2s ease-in-out infinite' : 'none')),
                display: 'flex',
                flexDirection: 'column',
                gap: highVolume ? '0.3rem' : '0.5rem',
                minHeight: highVolume ? '100px' : '140px',
                touchAction: 'manipulation',
                opacity: isReadyDoubleTap ? 0.85 : 1,
              }}
            >
              {/* Row 1: Order # · elapsed · status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: orderNumSize,
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                  color: '#fff',
                  lineHeight: 1,
                }}>
                  #{order.id.slice(-6).toUpperCase()}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: highVolume ? '0.3rem' : '0.5rem' }}>
                  <span style={{
                    fontSize: highVolume ? '0.7rem' : '0.8rem',
                    fontWeight: 700,
                    color: p.timeColor || s.text,
                    animation: p.overdue ? 'kdsTextPulse 1s ease-in-out infinite' : 'none',
                  }}>
                    ⏱ {label}
                  </span>
                  {showBadge && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '50px',
                      background: `${s.text}18`,
                      color: s.text,
                      whiteSpace: 'nowrap',
                    }}>
                      {order.status === 'pending' ? 'PENDIENTE' : order.status === 'preparing' ? 'PREPARANDO' : 'LISTO'}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Items */}
              <div style={{ flex: 1, fontSize: itemFontSize, color: '#ccc', lineHeight: 1.4 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.4rem' }}>
                    <span style={{ color: '#FF4500', fontWeight: 800, minWidth: '1.5em' }}>{item.quantity}x</span>
                    <span>{item.productName}</span>
                  </div>
                ))}
              </div>

              {/* Row 3: Employee + next action hint (hidden in high volume) */}
              {!highVolume && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
                  {order.handledBy ? (
                    <span style={{ color: '#555' }}>🧑‍🍳 {order.handledBy}</span>
                  ) : (
                    <span style={{ color: '#333' }}>Sin asignar</span>
                  )}
                  <span style={{
                    color: isReadyDoubleTap ? '#ef4444' : s.text,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}>
                    {isReadyDoubleTap ? 'Toca de nuevo para entregar' : `Toca → ${s.nextLabel}`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blocking order alert modal */}
      {pendingOrder && (
        <OrderAlertModal
          order={pendingOrder}
          onAccept={() => setPendingOrder(null)}
        />
      )}

      <style>{`
        @keyframes kdsFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes kdsPulse {
          0%, 100% { border-color: #ef4444; box-shadow: none; }
          50% { border-color: rgba(239,68,68,0.4); box-shadow: 0 0 12px rgba(239,68,68,0.15); }
        }
        @keyframes kdsGlow {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: 0 0 8px rgba(255,69,0,0.12); }
        }
        @keyframes kdsTextPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes kdsBannerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
