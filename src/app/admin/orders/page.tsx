'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminStore } from '@/lib/adminStore';
import { Order, OrderStatus, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/adminTypes';

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  pending:   'preparing',
  preparing: 'ready',
  ready:     'delivered',
  delivered: null,
};

const STATUS_BTN: Record<OrderStatus, string> = {
  pending:   '🔥 Comenzar a preparar',
  preparing: '✅ Marcar como listo',
  ready:     '📦 Marcar como entregado',
  delivered: '',
};

const ALL_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered'];

/* ── Receipt printer ──────────────────────────────────────────────────────── */
function printReceipt(order: Order) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const itemsHTML = order.items.map(item =>
    `<tr>
      <td style="text-align:left;padding:2px 0">${item.quantity}x ${item.productName}</td>
      <td style="text-align:right;padding:2px 0">$${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket ${order.id}</title>
  <style>
    @page {
      margin: 0;
      size: 80mm auto;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 80mm;
      max-width: 80mm;
      padding: 8mm 4mm;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .bold { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    .total-row td { 
      font-weight: bold; 
      font-size: 14px; 
      padding-top: 6px;
      border-top: 1px solid #000;
    }
    .header-logo {
      font-size: 22px;
      font-weight: bold;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="header-logo">🚨 SNACKS 911</div>
    <div style="font-size:10px;margin-top:2px">Cuando el antojo no puede esperar</div>
    <hr class="divider">
  </div>
  
  <div style="margin: 4px 0">
    <div><strong>Pedido:</strong> ${order.id}</div>
    <div><strong>Cliente:</strong> ${order.customerName}</div>
    ${order.customerPhone ? `<div><strong>Tel:</strong> ${order.customerPhone}</div>` : ''}
    <div><strong>Fecha:</strong> ${dateStr} ${timeStr}</div>
    <div><strong>Estado:</strong> ${ORDER_STATUS_LABELS[order.status]}</div>
  </div>
  
  <hr class="divider">
  
  <table>
    <thead>
      <tr>
        <th style="text-align:left;padding:2px 0;font-size:11px">PRODUCTO</th>
        <th style="text-align:right;padding:2px 0;font-size:11px">PRECIO</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>
  
  <hr class="divider">
  
  <table>
    <tr class="total-row">
      <td style="text-align:left">TOTAL</td>
      <td style="text-align:right">$${order.total.toLocaleString()}</td>
    </tr>
  </table>
  
  ${order.notes ? `
  <hr class="divider">
  <div style="font-size:11px"><strong>Notas:</strong> ${order.notes}</div>
  ` : ''}
  
  <hr class="divider">
  
  <div class="center" style="margin-top:4px;font-size:10px">
    ¡Gracias por tu preferencia! 🔥<br>
    Síguenos en redes: @snacks911<br>
    <br>
    --- SNACKS 911 ---
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  <\/script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/* ── Orders Page ──────────────────────────────────────────────────────────── */
export default function OrdersPage() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [filter, setFilter]     = useState<OrderStatus | 'all'>('all');

  const reload = useCallback(async () => {
    const o = (await AdminStore.getOrders())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(o);
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 8000); // live refresh every 8s
    return () => clearInterval(id);
  }, [reload]);

  const advance = async (id: string, currentStatus: OrderStatus) => {
    const next = STATUS_FLOW[currentStatus];
    if (!next) return;
    await AdminStore.updateOrderStatus(id, next);
    reload();
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const countFor = (s: OrderStatus) => orders.filter(o => o.status === s).length;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>📦 Pedidos</h1>
        <p style={{ margin: '0.3rem 0 0', color: '#555', fontSize: '0.875rem' }}>
          Se actualiza cada 5 segundos · {orders.length} pedidos en total
        </p>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '0.45rem 1rem', borderRadius: '20px',
            background: filter === 'all' ? 'rgba(255,69,0,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filter === 'all' ? '#FF4500' : 'rgba(255,255,255,0.08)'}`,
            color: filter === 'all' ? '#FF4500' : '#666',
            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Todos ({orders.length})
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '0.45rem 1rem', borderRadius: '20px',
              background: filter === s ? ORDER_STATUS_COLORS[s] + '22' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === s ? ORDER_STATUS_COLORS[s] : 'rgba(255,255,255,0.08)'}`,
              color: filter === s ? ORDER_STATUS_COLORS[s] : '#666',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {ORDER_STATUS_LABELS[s]} ({countFor(s)})
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#333' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>No hay pedidos en este estado</p>
          </div>
        )}

        {filtered.map(order => (
          <div
            key={order.id}
            style={{
              background: '#111', borderRadius: '16px',
              border: `1px solid ${ORDER_STATUS_COLORS[order.status]}22`,
              padding: '1.25rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '1rem',
              alignItems: 'start',
            }}
          >
            {/* Left: order info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{order.id}</span>
                <span style={{
                  padding: '0.2rem 0.65rem', borderRadius: '20px',
                  background: ORDER_STATUS_COLORS[order.status] + '22',
                  color: ORDER_STATUS_COLORS[order.status],
                  fontSize: '0.72rem', fontWeight: 700,
                }}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#444' }}>⏱ {fmtTime(order.createdAt)}</span>
              </div>

              {/* Customer */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#888' }}>
                  👤 {order.customerName}
                </span>
                {order.customerPhone && (
                  <span style={{ fontSize: '0.82rem', color: '#555' }}>📱 {order.customerPhone}</span>
                )}
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                      ×{item.quantity}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#888' }}>{item.productName}</span>
                    <span style={{ fontSize: '0.78rem', color: '#555', marginLeft: 'auto' }}>
                      ${(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <p style={{ marginTop: '0.5rem', padding: '0.4rem 0.7rem', background: 'rgba(255,184,0,0.08)', borderRadius: '6px', fontSize: '0.78rem', color: '#FFB800', margin: '0.5rem 0 0' }}>
                  📝 {order.notes}
                </p>
              )}
            </div>

            {/* Right: total + actions */}
            <div style={{ textAlign: 'right', minWidth: '140px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFB800', marginBottom: '0.75rem' }}>
                ${order.total.toLocaleString()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {STATUS_FLOW[order.status] && (
                  <button
                    onClick={() => advance(order.id, order.status)}
                    style={{
                      padding: '0.6rem 1rem',
                      background: `${ORDER_STATUS_COLORS[order.status]}22`,
                      border: `1px solid ${ORDER_STATUS_COLORS[order.status]}55`,
                      borderRadius: '10px',
                      color: ORDER_STATUS_COLORS[order.status],
                      fontSize: '0.8rem', fontWeight: 700,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: 'background 0.18s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = ORDER_STATUS_COLORS[order.status] + '44'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ORDER_STATUS_COLORS[order.status] + '22'; }}
                  >
                    {STATUS_BTN[order.status]}
                  </button>
                )}

                {order.status === 'delivered' && (
                  <span style={{ fontSize: '0.78rem', color: '#444' }}>Completado ✓</span>
                )}

                {/* Print receipt button */}
                <button
                  onClick={() => printReceipt(order)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#888',
                    fontSize: '0.78rem', fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = '#888';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                >
                  🖨️ Imprimir ticket
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
