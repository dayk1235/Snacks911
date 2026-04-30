'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminStore } from '@/lib/adminStore';
import { supabase } from '@/lib/supabase';
import { playOrderNotification } from '@/lib/sound';
import type { Order, OrderStatus } from '@/lib/adminTypes';
import OrderAlertModal, { type PendingOrder } from '@/components/modals/OrderAlertModal';

// ─── Operational constants ───────────────────────────────────────────────────
const TARGET_PREP_MIN = 8;        // ideal time per order
const OVERLOAD_THRESHOLD = 6;     // active orders that trigger overload
const HIGH_LOAD_THRESHOLD = 4;    // active orders that trigger warning

// ─── Status visual config ────────────────────────────────────────────────────
const STATUS: Record<OrderStatus, { bg: string; border: string; text: string; nextLabel: string }> = {
  pending:    { bg: '#1a1500', border: '#FFB800', text: '#FFB800', nextLabel: '🤝 Confirmar' },
  confirmed:  { bg: '#000a1a', border: '#3B82F6', text: '#3B82F6', nextLabel: '🔥 Preparar' },
  preparing:  { bg: '#1a0a00', border: '#FF4500', text: '#FF4500', nextLabel: '✅ Listo' },
  ready:      { bg: '#001a0a', border: '#22c55e', text: '#22c55e', nextLabel: '✓ Entregado' },
  delivered:  { bg: '#111',    border: '#333',     text: '#555',    nextLabel: '' },
  cancelled:  { bg: '#000',    border: '#333',     text: '#444',    nextLabel: '' },
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
function computeMetrics(allOrders: Order[], activeOrders: Order[], manualDeliveredCount: number) {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = allOrders.filter(o => {
    const dateStr = o.createdAt || (o as any).created_at || '';
    return dateStr.slice(0, 10) === today;
  });
  
  // Sumamos los que sigan en el estado local (si los hay) + el contador manual
  const completedInState = todayOrders.filter(o => o.status === 'delivered').length;
  const completedToday = completedInState + manualDeliveredCount;
  
  const pendingCount = todayOrders.filter(o => o.status === 'pending').length;
  const confirmedCount = todayOrders.filter(o => o.status === 'confirmed').length;

  let prepSum = 0;
  let prepCount = 0;
  todayOrders.forEach(o => {
    const dateStr = o.createdAt || (o as any).created_at;
    if (!dateStr) return;
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (['preparing', 'ready', 'delivered'].includes(o.status)) {
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
    pendingCount,
    confirmedCount,
    avgPrep,
    prepStatus,
    prepDelta,
    totalToday: todayOrders.length,
  };
}

function normalizeOrder(raw: any): Order {
  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  
  // Si no tiene ID o no es UUID, generamos uno legacy para no romper el estado local
  const id = raw.id && isUuid(String(raw.id)) 
    ? String(raw.id) 
    : (raw.id || `legacy-${Math.random().toString(36).substr(2, 9)}`);

  return {
    id,
    customerName: String(raw.customer_name || raw.customerName || ''),
    customerPhone: String(raw.customer_phone || raw.customerPhone || ''),
    total: Number(raw.total || 0),
    status: (String(raw.status || 'pending') as OrderStatus),
    createdAt: String(raw.created_at || raw.createdAt || new Date().toISOString()),
    items: Array.isArray(raw.items) ? raw.items : [],
    handledBy: raw.handled_by || raw.handledBy || undefined,
  };
}

/* ─── Main KDS Page ─────────────────────────────────────────────────────────── */
export default function KitchenDisplay() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [employeeName, setEmployeeName] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Audio Unlock (Browser Auto-play Policy) ────────────────────────────────
  useEffect(() => {
    const unlock = () => {
      if (!audioRef.current) {
        // Inicializamos con un Audio objeto para "desbloquear" el permiso del navegador
        const a = new Audio('/alert-cocina.mp3'); 
        a.volume = 1;
        a.play().catch(() => { /* Silenciar error */ });
        a.pause();
        a.currentTime = 0;
        audioRef.current = a;
        console.log('[KDS AUDIO] unlocked');
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snacks911_employee_name');
      if (saved) setEmployeeName(saved);
    } catch (err) {
      console.error('Error reading employee name from localStorage:', err);
    }
  }, []);
  const [tick, setTick] = useState(0);
  const [rtConnected, setRtConnected] = useState(true);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [recentDelivered, setRecentDelivered] = useState<Order[]>([]);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Double-tap tracking: { orderId, timestamp }
  const lastTap = useRef<{ id: string; ts: number }>({ id: '', ts: 0 });
  const advancingIdsRef = useRef<Set<string>>(new Set());

  // ── Play notification sound ──────────────────────────────────────────────
  const playAlert = useCallback(() => {
    const a = audioRef.current;
    if (!a) return console.warn('[KDS SOUND] locked');
    
    try {
      a.currentTime = 0;
      a.volume = 1;
      a.play().then(() => console.log('[KDS SOUND] played'))
              .catch(e => console.warn('[KDS SOUND] blocked', e));
    } catch (e) {
      console.warn('[KDS SOUND] error', e);
    }
  }, []);

  // ── Load orders ──────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    try {
      console.log('[Admin] Fetching orders from DB...');
      const res = await fetch('/api/orders-list');
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      const rawData = Array.isArray(json.data) ? (json.data as any[]) : [];
      const normalizedOrders = rawData.map(normalizeOrder);

      // ── Polling Sound Fallback ──
      // Si el realtime falla por RLS, el polling detectará la nueva orden aquí
      setOrders(prev => {
        if (prev.length > 0) {
          const existingIds = new Set(prev.map(o => o.id));
          const hasNew = normalizedOrders.some(o => !existingIds.has(o.id));
          if (hasNew) {
            console.log('[KDS POLL] Nueva orden detectada por polling');
            playAlert();
          }
        }
        return normalizedOrders;
      });
    } catch (err) {
      console.error('[Orders] Fallo al cargar órdenes:', err);
    }
  }, [playAlert]);

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

  // ── Reset delivered counter at local midnight ───────────────────────────
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();
    let dailyIntervalId: ReturnType<typeof setInterval> | null = null;

    const timeoutId = setTimeout(() => {
      setDeliveredCount(0);
      dailyIntervalId = setInterval(() => setDeliveredCount(0), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    return () => {
      clearTimeout(timeoutId);
      if (dailyIntervalId) clearInterval(dailyIntervalId);
    };
  }, []);

  // ── Supabase real-time with connection tracking ──────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('kds-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        // 1. Sonido primero (Prioridad absoluta)
        playAlert();

        // 2. Normalizar y Loggear
        const order = normalizeOrder(payload.new);
        console.log('[KDS INSERT]', order.id);

        // 3. Dedupe e insertar al inicio
        setOrders(prev => {
          if (prev.some(o => o.id === order.id)) return prev;
          return [order, ...prev];
        });

        // 4. Modal y Resaltado
        setPendingOrder({
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          total: order.total,
          items: order.items,
          createdAt: order.createdAt,
        });

        setNewIds(prev => new Set([...prev, order.id]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = normalizeOrder(payload.new);
        console.log('[KDS UPDATE]', updated.id, updated.status);

        if (updated.status === 'delivered' || updated.status === 'cancelled') {
          // Si ya no es activa, la removemos del estado local
          setOrders(prev => {
            const removed = prev.find(o => o.id === updated.id);
            if (updated.status === 'delivered' && removed) {
              setRecentDelivered(prevDelivered => [removed, ...prevDelivered].slice(0, 10));
            }
            return prev.filter(o => o.id !== updated.id);
          });
          if (updated.status === 'delivered') {
            setDeliveredCount(c => c + 1);
          }
          return;
        }

        // Si sigue activa, mergeamos (actualizar datos sin mover de lugar)
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      })
      .subscribe((status) => {
        console.log('[KDS CHANNEL]', status);
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
    if (advancingIdsRef.current.has(order.id)) return;
    advancingIdsRef.current.add(order.id);

    console.log('[KDS] id', order.id);

    // 1. Validar UUID format (advertencia para legacy, no descarte)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.id);
    if (!isUuid) {
      console.warn('[KDS] Intentando avanzar orden legacy/no-UUID:', order.id);
      // Nota: El backend podría rechazar esto si espera un UUID real.
    }

    const next: Record<OrderStatus, OrderStatus> = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
      delivered: 'delivered',
      cancelled: 'cancelled',
    };
    const status = next[order.status];

    // Double-tap safety for "ready → delivered"
    if (order.status === 'ready') {
      const now = Date.now();
      const last = lastTap.current;
      if (last.id !== order.id || now - last.ts > 2000) {
        lastTap.current = { id: order.id, ts: now };
        return;
      }
      lastTap.current = { id: '', ts: 0 };
    }

    // 2. Optimistic Update
    const prevOrder = { ...order };
    if (status === 'delivered') {
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setDeliveredCount(c => c + 1);
    } else {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status } : o));
    }

    try {
      // 3. PATCH directo
      const response = await fetch('/api/orders/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('[KDS] Fallo en actualización:', result.error);

        // Rollback optimista: Reinsertar la orden previa
        setOrders(prev => {
          if (prev.some(o => o.id === prevOrder.id)) {
            return prev.map(o => o.id === prevOrder.id ? prevOrder : o);
          }
          return [prevOrder, ...prev];
        });
        if (status === 'delivered') setDeliveredCount(c => Math.max(0, c - 1));
        return;
      }

      // Éxito: No llamar a loadOrders(), el estado local ya es correcto.
    } catch (err) {
      console.error('[KDS] Error de red, revirtiendo estado:', err);
      setOrders(prev => [prevOrder, ...prev.filter(o => o.id !== prevOrder.id)]);
      if (status === 'delivered') setDeliveredCount(c => Math.max(0, c - 1));
    } finally {
      advancingIdsRef.current.delete(order.id);
    }
  }, [loadOrders]);

  // ── Column grouping: active only, single pass ───────────────────────────
  const groups = useMemo(() => {
    const res = orders.reduce((acc, o) => {
      if (o.status === 'delivered' || o.status === 'cancelled') return acc;
      const s = o.status as keyof typeof acc;
      if (acc[s]) acc[s].push(o);
      return acc;
    }, {
      pending: [] as Order[],
      confirmed: [] as Order[],
      preparing: [] as Order[],
      ready: [] as Order[]
    });

    // Ordenar cada columna: Antiguas primero, empate por Total desc
    const sortFn = (a: Order, b: Order) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb;
      return b.total - a.total;
    };

    res.pending.sort(sortFn);
    res.confirmed.sort(sortFn);
    res.preparing.sort(sortFn);
    res.ready.sort(sortFn);

    return res;
  }, [orders]);

  // Derived list for metrics
  const active = useMemo(() => [
    ...groups.pending, ...groups.confirmed, ...groups.preparing, ...groups.ready
  ], [groups]);

  // ── High volume mode: active > 5 ─────────────────────────────────────────
  const highVolume = active.length > 5;

  // ── Metrics (computed from derived values, no extra state) ───────────────
  const metrics = computeMetrics(orders, active, deliveredCount);
  const load = assessLoad(metrics.active, metrics.avgPrep);
  const pendingCount = active.filter(o => o.status === 'pending').length;
  const confirmedCount = active.filter(o => o.status === 'confirmed').length;
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
          {confirmedCount > 0 && <span style={{ color: '#3B82F6' }}>🤝 {confirmedCount}</span>}
          {preparingCount > 0 && <span style={{ color: '#FF4500' }}>🔥 {preparingCount}</span>}
          {readyCount > 0 && <span style={{ color: '#22c55e' }}>✅ {readyCount}</span>}
        </div>
        <button
          onClick={() => {
            console.log('[KDS] Test sound trigger');
            playAlert();
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#888', fontSize: '0.72rem',
            fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { 
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; 
            (e.currentTarget as HTMLElement).style.color = '#fff';
          }}
          onMouseLeave={e => { 
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; 
            (e.currentTarget as HTMLElement).style.color = '#888';
          }}
        >
          🔊 Test Sonido
        </button>
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
          ✅ Entregadas hoy: <b style={{ color: '#22c55e' }}>{deliveredCount}</b>
        </span>
        <span>
          🤝 Confirmados: <b style={{ color: '#3B82F6' }}>{metrics.confirmedCount}</b>
        </span>
        <span>
          ⏳ Pendientes: <b style={{ color: '#FFB800' }}>{metrics.pendingCount}</b>
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

      {/* ── Recent delivered (collapsible) ─────────────────────────────── */}
      <details style={{
        margin: '0.5rem 0.75rem 0',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <summary style={{
          cursor: 'pointer',
          padding: '0.5rem 0.75rem',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#ddd',
          listStyle: 'none',
        }}>
          Últimas entregadas ({recentDelivered.length})
        </summary>
        <div style={{ padding: '0 0.75rem 0.6rem', display: 'grid', gap: '0.35rem' }}>
          {recentDelivered.length === 0 ? (
            <span style={{ fontSize: '0.72rem', color: '#666' }}>Sin entregas recientes</span>
          ) : recentDelivered.map(order => (
            <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.72rem' }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>#{order.id.slice(-6).toUpperCase()}</span>
              <span style={{ color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.customerName || 'Cliente'}
              </span>
              <span style={{ color: '#bbb' }}>${Number(order.total || 0).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </details>

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
