'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AdminStore } from '@/lib/adminStore';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/adminTypes';

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
};

function minsSince(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

function urgency(m: number) {
  // Kitchen pacing: keep it legible and decisive.
  if (m >= 12) {
    return {
      ring: 'border-red-500/50 bg-red-500/5',
      pill: 'bg-red-500 text-black',
      time: 'text-red-200',
    };
  }
  if (m >= 6) {
    return {
      ring: 'border-amber-400/50 bg-amber-400/5',
      pill: 'bg-amber-400 text-black',
      time: 'text-amber-200',
    };
  }
  return {
    ring: 'border-white/10 bg-white/[0.03]',
    pill: 'bg-white/10 text-white',
    time: 'text-white/80',
  };
}

function shortId(id: string) {
  return id?.slice(-6)?.toUpperCase?.() ?? id;
}

function primaryActionFor(status: OrderStatus): { label: string; next: OrderStatus } | null {
  const next = STATUS_FLOW[status];
  if (!next) return null;
  if (status === 'pending') return { label: 'Confirmar', next };
  if (status === 'confirmed') return { label: 'Preparar', next };
  if (status === 'preparing') return { label: 'Listo', next };
  if (status === 'ready') return { label: 'Entregar', next };
  return null;
}

function PrimaryButton({
  kind,
  disabled,
  onClick,
  children,
}: {
  kind: 'confirm' | 'progress' | 'deliver';
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const base =
    'min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-extrabold tracking-wide ' +
    'transition-[transform,background-color,box-shadow,opacity] duration-200 ease-out ' +
    'active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100';
  const theme =
    kind === 'confirm'
      ? 'bg-amber-400 text-black shadow-[0_10px_30px_-14px_rgba(251,191,36,0.7)] hover:bg-amber-300'
      : kind === 'deliver'
        ? 'bg-emerald-400 text-black shadow-[0_10px_30px_-14px_rgba(52,211,153,0.7)] hover:bg-emerald-300'
        : 'bg-white/10 text-white hover:bg-white/15';

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${theme}`}>
      {children}
    </button>
  );
}

function SecondaryButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/* ── Receipt printer (kept minimal, useful in ops) ───────────────────────── */
function printReceipt(order: Order) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const itemsTxt = order.items
    .map((i) => `${i.quantity}x ${i.productName}  $${(i.price * i.quantity).toLocaleString()}`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @media print { @page { margin: 0; size: 58mm auto; } body { margin: 0; width: 58mm; } }
    body { font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.1; padding: 4mm 2mm; }
    .c { text-align: center; } .b { font-weight: 700; } .hr { border-top: 1px dashed #000; margin: 6px 0; }
    pre { white-space: pre-wrap; margin: 0; font-family: inherit; }
  </style>
</head>
<body>
  <div class="c b">SNACKS 911</div>
  <div class="c">ANTOJO DE EMERGENCIA</div>
  <div class="hr"></div>
  <pre>ORDEN: #${String(order.id).slice(0, 8).toUpperCase()}
FECHA: ${dateStr} ${timeStr}
CLIENTE: ${String(order.customerName || '').toUpperCase()}
TEL: ${order.customerPhone || 'N/A'}</pre>
  <div class="hr"></div>
  <pre>${itemsTxt}</pre>
  <div class="hr"></div>
  <pre class="b">TOTAL: $${order.total.toLocaleString()}</pre>
  ${order.notes ? `<div class="hr"></div><pre>NOTAS: ${order.notes}</pre>` : ''}
</body>
</html>`;

  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tick, setTick] = useState(0);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Unlock audio once via user gesture (required by most browsers).
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current) return;
      const a = new Audio('/alert-cocina.mp3');
      a.volume = 1;
      a.play().catch(() => {});
      a.pause();
      a.currentTime = 0;
      audioRef.current = a;
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const playAlert = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }, []);

  const reload = useCallback(async () => {
    const next = (await AdminStore.getOrders()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Polling sound fallback.
    setOrders((prev) => {
      if (prev.length > 0) {
        const prevIds = new Set(prev.map((o) => o.id));
        const hasNew = next.some((o) => !prevIds.has(o.id));
        if (hasNew) playAlert();
      }
      return next;
    });
  }, [playAlert]);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 8000);

    const ch = supabase
      .channel('admin-orders-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        playAlert();
        reload();
      })
      .subscribe();

    return () => {
      clearInterval(id);
      supabase.removeChannel(ch);
    };
  }, [reload, playAlert]);

  // Ticker for timers (keeps UI reactive without refetching).
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  const markBusy = useCallback((id: string, on: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const markExiting = useCallback((id: string, on: boolean) => {
    setExitingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const advance = useCallback(
    async (order: Order) => {
      const action = primaryActionFor(order.status);
      if (!action) return;

      const { next } = action;
      markBusy(order.id, true);

      // Optimistic UI for speed.
      if (next === 'delivered') {
        markExiting(order.id, true);
      } else {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
      }

      try {
        await AdminStore.updateOrderStatus(order.id, next);

        if (next === 'delivered') {
          // Smooth removal (150–300ms).
          window.setTimeout(() => {
            setOrders((prev) => prev.filter((o) => o.id !== order.id));
            markExiting(order.id, false);
          }, 220);
        }
      } catch {
        // Roll back on failure.
        markExiting(order.id, false);
        await reload();
      } finally {
        markBusy(order.id, false);
      }
    },
    [markBusy, markExiting, reload]
  );

  const activeOrders = useMemo(() => {
    // Delivered should disappear from the dashboard automatically.
    return orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  }, [orders]);

  const pendingCol = useMemo(() => activeOrders.filter((o) => o.status === 'pending' || o.status === 'confirmed'), [activeOrders]);
  const preparingCol = useMemo(() => activeOrders.filter((o) => o.status === 'preparing'), [activeOrders]);
  const readyCol = useMemo(() => activeOrders.filter((o) => o.status === 'ready'), [activeOrders]);

  // `tick` intentionally referenced to keep timers fresh.
  void tick;

  const Column = ({
    title,
    count,
    children,
    accent,
  }: {
    title: string;
    count: number;
    accent: 'amber' | 'orange' | 'emerald';
    children: ReactNode;
  }) => {
    const accentCls =
      accent === 'amber'
        ? 'border-amber-400/30 bg-amber-400/5 text-amber-200'
        : accent === 'orange'
          ? 'border-orange-500/30 bg-orange-500/5 text-orange-200'
          : 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200';

    return (
      <section className="rounded-2xl border border-white/10 bg-black/20 p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-extrabold tracking-wide text-white">{title}</h2>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${accentCls}`}>
              {count}
            </span>
          </div>
          <div className="text-xs font-semibold text-white/40">Touch</div>
        </div>
        <div className="space-y-3">{children}</div>
      </section>
    );
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const m = minsSince(order.createdAt);
    const u = urgency(m);
    const action = primaryActionFor(order.status);
    const busy = busyIds.has(order.id);
    const exiting = exitingIds.has(order.id);

    const kind: 'confirm' | 'progress' | 'deliver' =
      order.status === 'pending' ? 'confirm' : order.status === 'ready' ? 'deliver' : 'progress';

    return (
      <article
        data-exiting={exiting ? 'true' : 'false'}
        className={[
          'min-h-[240px] rounded-2xl border p-6 md:p-7',
          'transition-[transform,opacity,background-color,border-color] duration-200 ease-out',
          'data-[exiting=true]:scale-[0.98] data-[exiting=true]:opacity-0',
          u.ring,
        ].join(' ')}
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-lg font-extrabold tracking-wider text-white">
                #{shortId(order.id)}
              </div>
              <div className="text-sm font-semibold text-white/50 tabular-nums">
                {new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="mt-1 truncate text-base font-semibold text-white/80">
              {order.customerName || 'Cliente'}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={`rounded-full px-3 py-1.5 text-sm font-extrabold tabular-nums ${u.pill}`}>
              {m < 1 ? 'NOW' : `${m}m`}
            </div>
            <div className={`text-sm font-semibold tabular-nums ${u.time}`}>${Number(order.total || 0).toFixed(0)}</div>
          </div>
        </header>

        <div className="mb-4 space-y-2">
          {order.items.slice(0, 6).map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="text-base font-extrabold text-white tabular-nums">x{item.quantity}</span>
                <span className="min-w-0 truncate text-base font-semibold text-white/80">{item.productName}</span>
              </div>
              <span className="text-base font-semibold text-white/40 tabular-nums">
                ${(item.price * item.quantity).toFixed(0)}
              </span>
            </div>
          ))}
          {order.items.length > 6 && (
            <div className="text-sm font-semibold text-white/40">+{order.items.length - 6} mas</div>
          )}
        </div>

        {order.notes && (
          <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200">
            {order.notes}
          </div>
        )}

        <footer className="mt-auto grid grid-cols-1 gap-2">
          {action && (
            <PrimaryButton
              kind={kind}
              disabled={busy}
              onClick={() => advance(order)}
            >
              {action.label}
            </PrimaryButton>
          )}
          <SecondaryButton disabled={busy} onClick={() => printReceipt(order)}>
            Imprimir
          </SecondaryButton>
        </footer>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white">Pedidos</h1>
          <div className="mt-1 text-sm font-semibold text-white/50">
            Activos: <span className="tabular-nums text-white/80">{activeOrders.length}</span>
            <span className="mx-2 text-white/20">|</span>
            Auto refresh: <span className="text-white/80">8s</span>
          </div>
        </div>
        <button
          type="button"
          onClick={reload}
          className="min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white active:scale-[0.99]"
        >
          Refrescar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Column title="Pending" count={pendingCol.length} accent="amber">
          {pendingCol.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm font-semibold text-white/40">
              Sin pedidos
            </div>
          ) : (
            pendingCol.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </Column>

        <Column title="Preparing" count={preparingCol.length} accent="orange">
          {preparingCol.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm font-semibold text-white/40">
              Sin pedidos
            </div>
          ) : (
            preparingCol.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </Column>

        <Column title="Ready" count={readyCol.length} accent="emerald">
          {readyCol.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm font-semibold text-white/40">
              Sin pedidos
            </div>
          ) : (
            readyCol.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </Column>
      </div>
    </div>
  );
}
