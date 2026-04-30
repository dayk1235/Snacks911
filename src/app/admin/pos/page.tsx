'use client';

/**
 * admin/pos/page.tsx — High-efficiency Point of Sale & Order Management.
 * 
 * Optimized for speed, mobile-first, and button-centric.
 * Rule: Max 3 primary action buttons per view.
 */

import { useEffect, useState, useMemo } from 'react';
import { usePosStore } from '@/lib/posStore';
import { useProductStore } from '@/lib/productStore';

export default function POSPage() {
  const { 
    orders, isLoading, error, fetchTodayOrders, updateOrderStatus,
    cart, addItem, removeItem, setQty, clearCart, 
    customerName, setCustomerName, paymentMethod, setPaymentMethod,
    deliveryType, setDeliveryType, submitOrder, cartTotal
  } = usePosStore();

  const { products, fetchProducts } = useProductStore();

  const [activeView, setActiveView] = useState<'MANAGEMENT' | 'NEW_ORDER'>('MANAGEMENT');

  // Sync data
  useEffect(() => {
    fetchTodayOrders();
    const interval = setInterval(fetchTodayOrders, 10000); // 10s sync
    return () => clearInterval(interval);
  }, [fetchTodayOrders]);

  useEffect(() => {
    if (activeView === 'NEW_ORDER') {
      fetchProducts();
    }
  }, [activeView, fetchProducts]);

  // Derived metrics
  const pendingOrdersCount = useMemo(() => 
    orders.filter(o => o.status === 'pending' || o.status === 'preparing').length,
  [orders]);

  const activeOrders = useMemo(() => 
    orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  [orders]);

  const getWaitTime = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return `${minutes}m`;
  };

  const handleOrderSubmit = async () => {
    try {
      await submitOrder();
      setActiveView('MANAGEMENT');
    } catch (e) {
      // Error handled by store
    }
  };

  console.log('POS_UI_ORDERS:', orders);
  console.log('STATE_AFTER_SET:', orders);
  console.log('RENDER_ORDERS:', orders);

  return (
    <div style={{ 
      minHeight: '100vh', background: '#000', color: '#fff', 
      fontFamily: 'system-ui, sans-serif', paddingBottom: '100px' 
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
            {activeView === 'MANAGEMENT' ? `${pendingOrdersCount} ÓRDENES ACTIVAS` : 'NUEVA ORDEN'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{pendingOrdersCount}</div>
          <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.1em' }}>PEDIDOS</div>
        </div>
      </div>

      {/* ⚠️ ERROR BANNER */}
      {error && (
        <div style={{ 
          background: '#ef4444', color: '#fff', padding: '1rem', 
          textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 
        }}>
          ❌ {error}
        </div>
      )}

      {/* 📦 CONTENT VIEW */}
      {activeView === 'MANAGEMENT' ? (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.length === 0 && !isLoading ? (
            <div style={{ padding: '4rem 0', textAlign: 'center', color: '#333' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
              <p>Todo en orden. Esperando pedidos...</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} style={{ 
                background: '#111', borderRadius: '16px', padding: '1.25rem',
                border: '1px solid #222', opacity: isLoading ? 0.7 : 1,
                pointerEvents: isLoading ? 'none' : 'auto'
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
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '8px' }}>
                    Total: ${order.total}
                  </div>
                </div>

                {/* 🎯 THE 3 STATUS BUTTONS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'pending')}
                    style={{ 
                      padding: '1rem 0.5rem', borderRadius: '12px', border: 'none',
                      background: order.status === 'pending' ? '#3b82f6' : '#222',
                      color: order.status === 'pending' ? '#fff' : '#666',
                      fontWeight: 800, fontSize: '0.75rem'
                    }}
                  >
                    PENDIENTE
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    style={{ 
                      padding: '1rem 0.5rem', borderRadius: '12px', border: 'none',
                      background: order.status === 'preparing' ? '#f59e0b' : '#222',
                      color: order.status === 'preparing' ? '#fff' : '#666',
                      fontWeight: 800, fontSize: '0.75rem'
                    }}
                  >
                    PREPARANDO
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    style={{ 
                      padding: '1rem 0.5rem', borderRadius: '12px', border: 'none',
                      background: order.status === 'ready' ? '#22c55e' : '#222',
                      color: order.status === 'ready' ? '#fff' : '#666',
                      fontWeight: 800, fontSize: '0.75rem'
                    }}
                  >
                    LISTO
                  </button>
                </div>

                {/* 🚫 BIG ACTION BUTTONS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.6rem' }}>
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    style={{ 
                      padding: '1.25rem', borderRadius: '12px', border: '1px solid #333',
                      background: 'transparent', color: '#ef4444', fontWeight: 800, fontSize: '0.8rem'
                    }}
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
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
      ) : (
        /* 🛒 NEW ORDER VIEW */
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', minHeight: '60vh' }}>
            
            {/* Products List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#666' }}>MENÚ</h3>
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: '0.75rem', overflowY: 'auto', maxHeight: '70vh' 
              }}>
                {products.filter(p => p.available).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => addItem({
                      product_id: String(p.id),
                      product_name: p.name,
                      category: p.category,
                      unit_price: (deliveryType === 'DELIVERY' ? (p as any).delivery_price : undefined) ?? p.price,
                      selected_modifiers_json: []
                    })}
                    style={{ 
                      background: '#111', border: '1px solid #222', borderRadius: '12px',
                      padding: '1rem', textAlign: 'left', color: '#fff'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>{p.name}</div>
                    <div style={{ color: '#FF4500', fontWeight: 900 }}>${((deliveryType === 'DELIVERY' ? (p as any).delivery_price : undefined) ?? p.price)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Sidebar */}
            <div style={{ 
              background: '#0a0a0a', border: '1px solid #222', borderRadius: '16px',
              padding: '1.25rem', display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 900 }}>RESUMEN</h3>
              
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                {cart.length === 0 ? (
                  <p style={{ color: '#444', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>
                    Carrito vacío
                  </p>
                ) : (
                  cart.map(item => (
                    <div key={item.product_id} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: '0.75rem', borderBottom: '1px solid #111', paddingBottom: '0.75rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.product_name || 'Producto'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>${item.unit_price} x {item.qty}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => setQty(item.product_id, item.qty - 1)} style={{ background: '#222', border: 'none', color: '#fff', borderRadius: '4px', width: '24px' }}>-</button>
                        <button onClick={() => setQty(item.product_id, item.qty + 1)} style={{ background: '#222', border: 'none', color: '#fff', borderRadius: '4px', width: '24px' }}>+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ borderTop: '1px solid #222', paddingTop: '1rem' }}>
                <input 
                  type="text" placeholder="Nombre del Cliente"
                  value={customerName} onChange={e => setCustomerName(e.target.value)}
                  style={{ 
                    width: '100%', padding: '0.75rem', background: '#000', border: '1px solid #333',
                    borderRadius: '8px', color: '#fff', marginBottom: '0.75rem'
                  }}
                />
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <select 
                    value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}
                    style={{ flex: 1, padding: '0.75rem', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontWeight: 900, fontSize: '1.2rem' }}>
                  <span>TOTAL</span>
                  <span style={{ color: '#FF4500' }}>${cartTotal()}</span>
                </div>

                <button 
                  onClick={handleOrderSubmit}
                  disabled={cart.length === 0 || isLoading}
                  style={{ 
                    width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                    background: '#FF4500', color: '#fff', fontWeight: 900, fontSize: '1.1rem',
                    opacity: (cart.length === 0 || isLoading) ? 0.5 : 1
                  }}
                >
                  {isLoading ? 'ENVIANDO...' : 'CREAR PEDIDO ⚡'}
                </button>
                
                <button 
                  onClick={() => { clearCart(); setActiveView('MANAGEMENT'); }}
                  style={{ 
                    width: '100%', padding: '0.75rem', borderRadius: '12px', border: 'none',
                    background: 'transparent', color: '#666', fontWeight: 700, marginTop: '0.5rem'
                  }}
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 STICKY BOTTOM NAV — MOBILE FIRST */}
      <div style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, 
        padding: '1rem', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', gap: '0.75rem', borderTop: '1px solid #222', zIndex: 100
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
          ÓRDENES
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
