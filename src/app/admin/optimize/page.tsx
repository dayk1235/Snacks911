'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminStore } from '@/lib/adminStore';
import { analyzeSales } from '@/lib/salesOptimizer';
import { promos, isPromoActive } from '@/lib/promos';
import type { AdminProduct, Order } from '@/lib/adminTypes';

const CARD: React.CSSProperties = {
  background: '#111',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '1.5rem',
};

export default function SalesOptimizationPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [p, o] = await Promise.all([
        AdminStore.getProducts(),
        AdminStore.getOrders(),
      ]);
      setProducts(p);
      void o;
      setLoading(false);
    };
    load();
  }, []);

  const result = analyzeSales(orders, products);

  const applyOptimizations = async () => {
    setApplying(true);

    // 1. Mark low performers as unavailable
    for (const lp of result.lowPerformers) {
      const product = products.find(p => p.id === lp.productId);
      if (product && product.available) {
        await AdminStore.toggleProduct(lp.productId);
      }
    }

    // 2. Ensure best sellers are available
    for (const bs of result.bestSellers) {
      const product = products.find(p => p.id === bs.productId);
      if (product && !product.available) {
        await AdminStore.toggleProduct(bs.productId);
      }
    }

    // 3. Create combo from top opportunity
    if (result.comboOpportunities.length > 0) {
      const top = result.comboOpportunities[0];
      const productA = products.find(p => p.id === top.productA);
      const productB = products.find(p => p.id === top.productB);

      if (productA && productB) {
        const comboName = `Combo ${productA.name.split(' ')[0]} + ${productB.name.split(' ')[0]}`;
        const combo: AdminProduct = {
          id: `p_combo_${Date.now()}`,
          name: comboName,
          price: result.comboOpportunities[0].suggestedPrice,
          category: 'combos',
          imageUrl: productA.imageUrl || '/images/combo.webp',
          available: true,
          description: `${productA.name} + ${productB.name} — ¡Ahorra $${result.comboOpportunities[0].suggestedDiscount}!`,
          applicableProductIds: [],
        };
        await AdminStore.saveProduct(combo);
      }
    }

    setApplying(false);
    alert('Optimizaciones aplicadas. Recarga la página para ver los cambios.');
    router.refresh();
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Analizando datos de ventas...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Optimización de Ventas 🔥
          </h1>
          <p style={{ color: '#555', marginTop: '0.25rem', fontSize: '0.8rem' }}>
            Análisis de {orders.length} pedidos · {products.length} productos
          </p>
        </div>
        <button
          onClick={applyOptimizations}
          disabled={applying}
          style={{
            background: applying ? '#333' : 'linear-gradient(135deg, #FF4500, #FF6500)',
            border: 'none',
            borderRadius: '10px',
            padding: '0.7rem 1.5rem',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: applying ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          {applying ? 'Aplicando...' : 'Aplicar Optimizaciones'}
        </button>
      </div>

      {/* Recommended Actions */}
      <div style={{ ...CARD, marginBottom: '1.5rem', background: 'rgba(255,69,0,0.05)', borderColor: 'rgba(255,69,0,0.2)' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#FF4500' }}>
          Acciones Recomendadas
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {result.recommendedActions.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
              No hay acciones recomendadas aún. Sigue vendiendo para generar datos.
            </p>
          ) : (
            result.recommendedActions.map((action, i) => (
              <div
                key={i}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.82rem',
                  color: '#ccc',
                  lineHeight: 1.5,
                }}
              >
                {action}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Two columns: Best Sellers + Low Performers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Best Sellers */}
        <div style={CARD}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>
            ✅ Mejores Vendedores
          </h2>
          {result.bestSellers.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.8rem', margin: 0 }}>Sin datos suficientes</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {result.bestSellers.map((item, i) => (
                <div
                  key={item.productId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: i === 0 ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  }}
                >
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, width: '24px', height: '24px',
                    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                    color: i === 0 ? '#22c55e' : '#888',
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{item.productName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#555' }}>
                      {item.frequency} pedidos · {item.avgQuantityPerOrder} uds/pedido
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#22c55e' }}>
                      ${item.revenue.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#555' }}>Score: {item.score}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Performers */}
        <div style={{ ...CARD, borderColor: 'rgba(239,68,68,0.2)' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>
            ⚠️ Bajo Rendimiento
          </h2>
          {result.lowPerformers.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.8rem', margin: 0 }}>Todos los productos venden bien</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {result.lowPerformers.map((item) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(239,68,68,0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239,68,68,0.15)',
                      opacity: product?.available ? 1 : 0.5,
                    }}
                  >
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 800, width: '24px', height: '24px',
                      borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                    }}>
                      ↓
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: 600 }}>{item.productName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#555' }}>
                        {item.frequency} pedidos · {product?.available ? 'Disponible' : 'No disponible'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>
                        ${item.revenue.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#555' }}>Score: {item.score}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Combo Opportunities */}
      <div style={CARD}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#FFB800' }}>
          💡 Oportunidades de Combo
        </h2>
        {result.comboOpportunities.length === 0 ? (
          <p style={{ color: '#555', fontSize: '0.8rem', margin: 0 }}>
            No hay suficientes datos para detectar combos. Necesitas más pedidos con múltiples productos.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {result.comboOpportunities.map((combo, i) => {
              const productA = products.find(p => p.id === combo.productA);
              const productB = products.find(p => p.id === combo.productB);
              return (
                <div
                  key={i}
                  style={{
                    padding: '1rem',
                    background: 'rgba(255,184,0,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,184,0,0.15)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔥</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                        {productA?.name ?? 'Producto A'} + {productB?.name ?? 'Producto B'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#555' }}>
                        Ordenados juntos {combo.coOccurrenceCount} veces
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#555' }}>Precio sugerido:</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFB800', marginLeft: '0.5rem' }}>
                        ${combo.suggestedPrice}
                      </span>
                    </div>
                    <div style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      background: 'rgba(34,197,94,0.15)',
                      color: '#22c55e',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}>
                      Ahorro: ${combo.suggestedDiscount}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Promos */}
      <div style={{ ...CARD, marginTop: '1.5rem', borderColor: 'rgba(255,69,0,0.2)' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#FF4500' }}>
          🔥 Promos Activas
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {promos.map(promo => {
            const active = isPromoActive(promo);
            return (
              <div
                key={promo.id}
                style={{
                  padding: '1rem',
                  background: active ? 'rgba(255,69,0,0.08)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  border: `1px solid ${active ? 'rgba(255,69,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: active ? 1 : 0.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
                    {promo.title}
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    background: active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                    color: active ? '#22c55e' : '#555',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}>
                    {active ? 'ACTIVA' : 'INACTIVA'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.5rem' }}>
                  {promo.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555', textDecoration: 'line-through' }}>
                    ${promo.originalPrice}
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FF4500' }}>
                    ${promo.promoPrice}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    color: '#22c55e',
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    background: 'rgba(34,197,94,0.1)',
                    borderRadius: '4px',
                  }}>
                    -${promo.originalPrice - promo.promoPrice}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#FFB800', marginTop: '0.3rem', fontWeight: 600 }}>
                  {promo.urgency}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
