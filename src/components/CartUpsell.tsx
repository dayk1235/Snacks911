'use client';

import { memo, useMemo, useState } from 'react';
import type { Product } from '@/data/products';
import { products } from '@/data/products';

interface CartUpsellProps {
  cartItems: { id: number; name: string; price: number; quantity: number; category?: string }[];
  onAdd: (product: Product) => void;
}

/**
 * CartUpsell — Shows contextual upsell based on cart contents.
 * Rules:
 *  - alitas → sugerir papas
 *  - boneless → sugerir combo
 *  - combo → sugerir bebida/extras
 */
function CartUpsellComponent({ cartItems, onAdd }: CartUpsellProps) {
  const [dismissed, setDismissed] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);

  const upsell = useMemo(() => {
    const categories = new Set(cartItems.map(i => i.category));
    const hasAlitas = categories.has('alitas');
    const hasBoneless = categories.has('boneless');
    const hasCombo = categories.has('combos');
    const hasPapas = categories.has('papas');
    const hasBebida = cartItems.some(i => i.name.toLowerCase().includes('refresco') || i.name.toLowerCase().includes('agua'));

    // Priority: alitas → papas, boneless → combo, combo → bebida
    if (hasAlitas && !hasPapas) {
      const papas = products.find(p => p.name === 'Papas Loaded')
        ?? products.find(p => p.name === 'Papas Gajo');
      if (papas) {
        return {
          product: papas,
          title: '🍟 ¿Con papas?',
          subtitle: 'Queda perfecto con tus alitas',
        };
      }
    }

    if (hasBoneless && !hasCombo) {
      const combo = products.find(p => p.badges?.some(b => b.includes('Más pedido')) && p.category === 'combos')
        ?? products.find(p => p.category === 'combos');
      if (combo) {
        return {
          product: combo,
          title: '🔥 ¿Mejora a Combo?',
          subtitle: 'Incluye papas + aderezo',
        };
      }
    }

    if (hasCombo && !hasBebida) {
      const bebida = products.find(p => p.name === 'Refresco 600ml')
        ?? products.find(p => p.name.includes('Refresco'));
      if (bebida) {
        return {
          product: bebida,
          title: '🥤 ¿Con bebida?',
          subtitle: 'Refresco 600ml +$25',
        };
      }
    }

    // Fallback: suggest premium combo or extras
    if (hasCombo && !cartItems.some(i => i.name.includes('Premium'))) {
      const premium = products.find(p => p.badges?.some(b => b.includes('Premium')));
      if (premium) {
        return {
          product: premium,
          title: '💎 ¿Upgrade a Premium?',
          subtitle: 'Alitas + Boneless + papas loaded',
        };
      }
    }

    return null;
  }, [cartItems]);

  const handleAdd = () => {
    if (!upsell) return;
    onAdd(upsell.product);
    setAddedId(upsell.product.id);
    setTimeout(() => setAddedId(null), 1500);
    setTimeout(() => setDismissed(true), 500);
  };

  if (dismissed || !upsell) return null;

  const isAdded = addedId === upsell.product.id;

  return (
    <div style={{
      margin: '0.75rem 1rem',
      padding: '0.85rem',
      background: 'linear-gradient(135deg, rgba(255,69,0,0.08), rgba(255,69,0,0.03))',
      border: '1px solid rgba(255,69,0,0.2)',
      borderRadius: '14px',
      animation: 'upsellSlideIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{
          fontSize: '0.6rem', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#FF7040',
        }}>
          Te recomendamos
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none',
            color: '#555', fontSize: '0.8rem',
            cursor: 'pointer', padding: '0.2rem',
          }}
        >
          ✕
        </button>
      </div>

      {/* Product */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', marginBottom: '0.15rem' }}>
            {upsell.title}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.3rem' }}>
            {upsell.subtitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FF4500' }}>
              ${upsell.product.price}
            </span>
            {upsell.product.originalPrice && (
              <span style={{
                fontSize: '0.7rem', color: '#555',
                textDecoration: 'line-through',
              }}>
                ${upsell.product.originalPrice}
              </span>
            )}
          </div>
        </div>

        {/* Quick add button */}
        <button
          onClick={handleAdd}
          disabled={isAdded}
          style={{
            padding: '0.55rem 1.2rem',
            background: isAdded
              ? 'linear-gradient(135deg, #00C853, #00E676)'
              : 'linear-gradient(135deg, #FF4500, #FF6500)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: isAdded ? 'default' : 'pointer',
            boxShadow: isAdded
              ? '0 4px 14px rgba(0,200,83,0.25)'
              : '0 2px 12px rgba(255,69,0,0.3)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {isAdded ? '✓ Agregado' : '+ Agregar'}
        </button>
      </div>

      <style>{`
        @keyframes upsellSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const CartUpsell = memo(CartUpsellComponent);

export default CartUpsell;
