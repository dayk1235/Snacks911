'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import type { Product } from '@/data/products';
import { products } from '@/data/products';

/**
 * CartUpsellBanner — shows inside cart when total < MIN_ORDER.
 * Progress bar + 1-tap add-ons.
 */
export default function CartUpsellBanner({
  total,
  onAdd,
}: {
  total: number;
  onAdd: (product: Product) => void;
}) {
  const [added, setAdded] = useState<Set<number>>(new Set());

  const MIN_ORDER = 150;
  const remaining = MIN_ORDER - total;
  if (remaining <= 0) return null;

  // Suggest cheap complements: papas + 1 extra
  const suggestions = products.filter(p => p.id === 5 || p.id === 6); // Papas Gajo + Loaded

  const handleAdd = (product: Product) => {
    track('upsell_accepted', {
      context: 'cart_minimum',
      product_name: product.name,
      price: product.price,
    });
    onAdd(product);
    setAdded(prev => new Set(prev).add(product.id));
    setTimeout(() => setAdded(prev => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    }), 1500);
  };

  const pct = Math.min((total / MIN_ORDER) * 100, 100);

  return (
    <div style={{
      padding: '0.75rem 1rem',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Progress header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#FFB800', fontWeight: 700 }}>
          🛒 Pedido mínimo: ${MIN_ORDER}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#FF4500', fontWeight: 700 }}>
          Faltan ${remaining}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '5px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', marginBottom: '0.75rem',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg, #FFB800, #FF4500)',
          borderRadius: '5px', transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Quick add suggestions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {suggestions.map(item => {
          const isAdded = added.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleAdd(item)}
              disabled={isAdded}
              style={{
                flex: '1 1 calc(50% - 0.25rem)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 0.65rem',
                borderRadius: '10px',
                background: isAdded ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                border: isAdded ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: isAdded ? '#22c55e' : '#ccc',
                cursor: isAdded ? 'default' : 'pointer',
                fontSize: '0.72rem', fontWeight: 600,
                transition: 'all 0.15s ease',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                {item.category === 'papas' ? '🍟' : '🍗'}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {isAdded ? '✓ Agregado' : `${item.name} — $${item.price}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
