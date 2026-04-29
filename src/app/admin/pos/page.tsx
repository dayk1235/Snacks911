'use client';

/**
 * admin/pos/page.tsx — High-efficiency Point of Sale & Order Management.
 * 
 * Optimized for speed, mobile-first, and button-centric.
 * Rule: Max 3 primary action buttons per view.
 */

import { useEffect, useState, useMemo } from 'react';
import { usePosStore } from '@/lib/posStore';

// Mapping local UI states to DB states
const UI_STATUS_MAP = {
  PENDIENTE: 'CONFIRMED',
  PREPARANDO: 'PREPARING',
  LISTO: 'DELIVERED',
};

export default function POSPage() {
  const { 
    orders, isLoading, fetchTodayOrders, updateOrderStatus 
  } = usePosStore();

  const [activeView, setActiveView] = useState<'MANAGEMENT' | 'NEW_ORDER'>('MANAGEMENT');

  // Sync data
  useEffect(() => {
    fetchTodayOrders();
    const interval = setInterval(fetchTodayOrders, 10000); // 10s sync
    return () => clearInterval(interval);
  }, [fetchTodayOrders]);

  // Derived metrics
  const pendingOrdersCount = useMemo(() => 
    orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PREPARING').length,
  [orders]);

  const activeOrders = useMemo(() => 
    orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  [orders]);

  const getWaitTime = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return `${minutes}m`;
  };

  return (
    <div style={{ 
      minHeight: '100vh', background: '#000', color: '#fff', 
      fontFamily: 'system-ui, sans-serif', paddingBottom: '80px' 
    }}>
      
      {/* 🟢 TOP BAR — STATS & LOGO */}
      <div style={{ 
        padding: '1.25rem', borderBottom: '1px solid #222', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#050505', position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#FF4500' }}>SNACKS 911 POS</h1>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
            {pendingOrdersCount} ÓRDENES ACTIVAS
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{pendingOrdersCount}</div>
          <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.1em' }}>PEDIDOS</div>
        </div>
      </div>

      {/* 📦 ORDER LIST — THE CORE OF THE POS */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activeOrders.length === 0 ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: '#333' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <p>Todo en orden. Esperando pedidos...</p>
          </div>
        ) : (
          activeOrders.map(order => (
            <div key={order.id} style={{ 
              background: '#111', borderRadius: '16px', padding: '1.25rem',
              border: '1px solid #222'
            }}>
              {/* Header: ID + Time */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>#{order.id.slice(-4).toUpperCase()}</span>
                <span style={{ 
                  color: '#FF4500', fontWeight: 800, fontSize: '0.9rem',
                  background: 'rgba(255,69,0,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px'
                }}>
                  ⌛ {getWaitTime(order.created_at)}
                </span>
              </div>

              {/* Items Summary (Big) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ddd' }}>
                  {order.customer_name || 'Cliente'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                  {order.payment_method} · {order.delivery_type}
                </div>
              </div>

              {/* 🎯 THE 3 STATUS BUTTONS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                  style={{ 
                    padding: '1rem 0.5rem', borderRadius: '12px', border: 'none',
                    background: order.status === 'CONFIRMED' ? '#3b82f6' : '#222',
                    color: order.status === 'CONFIRMED' ? '#fff' : '#666',
                    fontWeight: 800, fontSize: '0.75rem'
                  }}
                >
                  PENDIENTE
                </button>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                  style={{ 
                    padding: '1rem 0.5rem', borderRadius: '12px', border: 'none',
                    background: order.status === 'PREPARING' ? '#f59e0b' : '#222',
                    color: order.status === 'PREPARING' ? '#fff' : '#666',
                    fontWeight: 800, fontSize: '0.75rem'
                  }}
                >
                  PREPARANDO
                </button>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                  style={{ 
                    padding: '1rem 0.5rem', borderRadius: '12px', border: 'none',
                    background: order.status === 'DELIVERED' ? '#22c55e' : '#222',
                    color: order.status === 'DELIVERED' ? '#fff' : '#666',
                    fontWeight: 800, fontSize: '0.75rem'
                  }}
                >
                  LISTO
                </button>
              </div>

              {/* 🚫 BIG ACTION BUTTONS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.6rem' }}>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                  style={{ 
                    padding: '1.25rem', borderRadius: '12px', border: '1px solid #333',
                    background: 'transparent', color: '#ef4444', fontWeight: 800, fontSize: '0.8rem'
                  }}
                >
                  CANCELAR
                </button>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                  style={{ 
                    padding: '1.25rem', borderRadius: '12px', border: 'none',
                    background: '#22c55e', color: '#fff', fontWeight: 900, fontSize: '1rem'
                  }}
                >
                  ENTREGAR ✅
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🚀 STICKY BOTTOM NAV — MOBILE FIRST */}
      <div style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, 
        padding: '1rem', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', gap: '0.75rem', borderTop: '1px solid #222'
      }}>
        <button 
          onClick={() => setActiveView('MANAGEMENT')}
          style={{ 
            flex: 1, padding: '1rem', borderRadius: '14px', border: 'none',
            background: activeView === 'MANAGEMENT' ? '#fff' : '#111',
            color: activeView === 'MANAGEMENT' ? '#000' : '#888',
            fontWeight: 900, fontSize: '0.9rem'
          }}
        >
          ORDEÑES
        </button>
        <button 
          onClick={() => setActiveView('NEW_ORDER')}
          style={{ 
            flex: 1, padding: '1rem', borderRadius: '14px', border: 'none',
            background: activeView === 'NEW_ORDER' ? '#FF4500' : '#111',
            color: activeView === 'NEW_ORDER' ? '#fff' : '#888',
            fontWeight: 900, fontSize: '0.9rem'
          }}
        >
          + NUEVA ORDEN
        </button>
      </div>

      <style jsx global>{`
        body { background: #000; margin: 0; }
        * { box-sizing: border-box; }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
