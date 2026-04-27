'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePosStore, type PosCartItem } from '@/lib/posStore';
import { supabase } from '@/lib/supabase';

// ── Product type from Supabase ─────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  is_best_seller: boolean;
  is_active: boolean;
}

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  DRAFT:      { label: 'Borrador',    color: '#555',    next: 'CONFIRMED'  as const },
  CONFIRMED:  { label: 'Confirmado',  color: '#3b82f6', next: 'PREPARING'  as const },
  PREPARING:  { label: 'Preparando',  color: '#f59e0b', next: 'DELIVERED'  as const },
  DELIVERED:  { label: 'Entregado',   color: '#22c55e', next: null },
  CANCELLED:  { label: 'Cancelado',   color: '#ef4444', next: null },
};

const CATEGORY_LABELS: Record<string, string> = {
  COMBOS: '🍗 Combos', PROTEINA: '💪 Proteína', PAPAS: '🍟 Papas',
  BANDERILLAS: '🌮 Banderillas', BEBIDAS: '🥤 Bebidas', EXTRAS: '🧀 Extras',
};

const PAYMENT_LABELS = { CASH: '💵 Efectivo', CARD: '💳 Tarjeta', TRANSFER: '📲 Transfer' };

export default function POSPage() {
  const {
    cart, paymentMethod, deliveryType, customerName, orders,
    isLoading, error, lastOrderId,
    addItem, removeItem, setQty, clearCart,
    setPaymentMethod, setDeliveryType, setCustomerName,
    submitOrder, fetchTodayOrders, updateOrderStatus,
    cartTotal, cartCount,
  } = usePosStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('COMBOS');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch products from Supabase
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    client.from('products').select('*').eq('is_active', true)
      .then(({ data }) => {
        setProducts(data || []);
        setLoadingProducts(false);
      });
  }, []);

  useEffect(() => {
    fetchTodayOrders();
    const interval = setInterval(fetchTodayOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchTodayOrders]);

  // Show success flash
  useEffect(() => {
    if (lastOrderId) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [lastOrderId]);

  const categories = [...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => p.category === activeCategory);

  const handleSubmit = async () => {
    try {
      await submitOrder();
    } catch (_) {}
  };

  const todayTotal = orders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'var(--font-body, sans-serif)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>🖥️ Punto de Venta</h1>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>Órdenes del día: {orders.filter(o => o.status !== 'CANCELLED').length} · Total: <span style={{ color: '#22c55e', fontWeight: 700 }}>${todayTotal.toFixed(0)}</span></p>
        </div>
        <button onClick={fetchTodayOrders} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
          🔄 Actualizar
        </button>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#22c55e', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 24px rgba(34,197,94,0.4)' }}
          >
            ✅ ¡Orden creada exitosamente!
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', flex: 1, overflow: 'hidden', height: 'calc(100vh - 65px)' }}>

        {/* LEFT — Product Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', flexShrink: 0 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: '8px', border: 'none',
                  background: activeCategory === cat ? '#FF4500' : 'rgba(255,255,255,0.06)',
                  color: activeCategory === cat ? '#fff' : '#888',
                  fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Products */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', alignContent: 'start' }}>
            {loadingProducts ? (
              <p style={{ color: '#555', gridColumn: '1/-1' }}>Cargando productos...</p>
            ) : filteredProducts.map(product => (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => addItem({
                  product_id: product.id,
                  product_name: product.name,
                  category: product.category,
                  unit_price: product.price,
                  selected_modifiers_json: [],
                })}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '1rem 0.75rem',
                  cursor: 'pointer', color: '#fff',
                  textAlign: 'left', transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,69,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                {product.is_best_seller && (
                  <span style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', fontSize: '0.55rem', background: '#FF4500', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 900, letterSpacing: '0.05em' }}>TOP</span>
                )}
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', lineHeight: 1.3 }}>{product.name}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FF4500' }}>${product.price}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* RIGHT — Cart + Checkout */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', background: '#0d0d0d' }}>

          {/* Cart header */}
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>🛒 Carrito ({cartCount()})</span>
            {cart.length > 0 && (
              <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Limpiar</button>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {cart.length === 0 ? (
              <p style={{ color: '#444', fontSize: '0.82rem', textAlign: 'center', marginTop: '2rem' }}>Toca un producto para agregarlo</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cart.map(item => (
                  <div key={item.product_id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.3 }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#FF4500', fontWeight: 800 }}>${(item.unit_price * item.qty).toFixed(0)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button onClick={() => setQty(item.product_id, item.qty - 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: '18px', textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => setQty(item.product_id, item.qty + 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid rgba(255,69,0,0.4)', background: 'rgba(255,69,0,0.1)', color: '#FF4500', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout panel */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

            {/* Customer name (optional) */}
            <input
              type="text"
              placeholder="Nombre del cliente (opcional)"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' }}
            />

            {/* Delivery type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              {(['PICKUP', 'DELIVERY'] as const).map(type => (
                <button key={type} onClick={() => setDeliveryType(type)}
                  style={{ padding: '0.5rem', borderRadius: '8px', border: `1px solid ${deliveryType === type ? 'rgba(255,69,0,0.5)' : 'rgba(255,255,255,0.08)'}`, background: deliveryType === type ? 'rgba(255,69,0,0.12)' : 'rgba(255,255,255,0.03)', color: deliveryType === type ? '#FF4500' : '#777', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.15s' }}
                >
                  {type === 'PICKUP' ? '🏃 Pickup' : '🛵 Delivery'}
                </button>
              ))}
            </div>

            {/* Payment method */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
              {(['CASH', 'CARD', 'TRANSFER'] as const).map(method => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  style={{ padding: '0.45rem 0.3rem', borderRadius: '8px', border: `1px solid ${paymentMethod === method ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.08)'}`, background: paymentMethod === method ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', color: paymentMethod === method ? '#22c55e' : '#777', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, transition: 'all 0.15s' }}
                >
                  {PAYMENT_LABELS[method]}
                </button>
              ))}
            </div>

            {/* Total + Submit */}
            <div style={{ background: 'rgba(255,69,0,0.06)', borderRadius: '10px', padding: '0.75rem', border: '1px solid rgba(255,69,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Total</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FF4500' }}>${cartTotal().toFixed(0)}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={cart.length === 0 || isLoading}
                style={{ width: '100%', padding: '0.75rem', background: cart.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FF4500, #FF6500)', border: 'none', borderRadius: '10px', color: cart.length === 0 ? '#444' : '#fff', fontWeight: 900, fontSize: '0.9rem', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.15s', letterSpacing: '0.02em' }}
              >
                {isLoading ? 'Procesando...' : `✅ Confirmar Orden`}
              </button>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: 0 }}>{error}</p>}
          </div>
        </div>
      </div>

      {/* TODAY'S ORDERS */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.5rem', background: '#0a0a0a' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Órdenes de Hoy</h2>
        {orders.length === 0 ? (
          <p style={{ color: '#444', fontSize: '0.8rem' }}>Sin órdenes registradas aún.</p>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {orders.map(order => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
              return (
                <div key={order.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.75rem', minWidth: '180px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.65rem', color: '#555' }}>#{order.id.slice(-6).toUpperCase()}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: config.color, background: `${config.color}22`, padding: '0.15rem 0.4rem', borderRadius: '6px' }}>{config.label}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#FF4500', marginBottom: '0.2rem' }}>${order.total?.toFixed(0)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.5rem' }}>
                    {order.payment_method} · {order.delivery_type}
                    {order.customer_name && ` · ${order.customer_name}`}
                  </div>
                  {config.next && (
                    <button
                      onClick={() => updateOrderStatus(order.id, config.next!)}
                      style={{ width: '100%', padding: '0.3rem', background: `${config.color}22`, border: `1px solid ${config.color}44`, borderRadius: '6px', color: config.color, cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                    >
                      → {STATUS_CONFIG[config.next].label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
