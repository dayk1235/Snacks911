'use client';

import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { products } from '@/data/products';
import { logEvent } from '@/core/eventLogger';
import { useCartStore } from '@/lib/cartStore';
import { getBestUpsell, UpsellOption } from '@/core/upsellEngine';
import type { Product } from '@/data/products';
import type { CartItem } from '@/types';

interface CartUpsellProps {
  cartItems: CartItem[];
  onAdd: (product: Product) => void;
}

function CartUpsellComponent({ cartItems, onAdd }: CartUpsellProps) {
  const { getCartId } = useCartStore();
  const [addedId, setAddedId]   = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastSuggestedId = useRef<number | null>(null);

  const [upsell, setUpsell] = useState<{ product: Product, title: string, subtitle: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchUpsell() {
      if (cartItems.length === 0) {
        if (!cancelled) setUpsell(null);
        return;
      }

      const best = await getBestUpsell(cartItems as any);
      if (cancelled) return;

      if (best) {
        // Map string UUID to local product (if possible) or use a placeholder
        // For now, we try to find it in our local products list
        const product = products.find(p => p.id.toString() === best.productId);
        
        if (product) {
          setUpsell({
            product,
            title: best.message.split('?')[0] + '?', // Extract emoji + question
            subtitle: best.message.split('?')[1]?.trim() || best.name
          });
        } else {
          setUpsell(null);
        }
      } else {
        setUpsell(null);
      }
    }

    fetchUpsell();
    return () => { cancelled = true; };
  }, [cartItems]);

  useEffect(() => {
    if (upsell && upsell.product.id !== lastSuggestedId.current) {
      logEvent({
        event_type: 'upsell_suggested',
        cart_id: getCartId(),
        payload_json: {
          product_id: upsell.product.id,
          product_name: upsell.product.name,
          upsell_type: upsell.title
        }
      });
      lastSuggestedId.current = upsell.product.id;
    }
  }, [upsell, getCartId]);

  const handleAdd = () => {
    if (!upsell) return;
    
    logEvent({
      event_type: 'upsell_accepted',
      cart_id: getCartId(),
      payload_json: {
        product_id: upsell.product.id,
        product_name: upsell.product.name
      }
    });

    onAdd(upsell.product);
    setAddedId(upsell.product.id);
    setTimeout(() => setAddedId(null), 1500);
    setTimeout(() => setDismissed(true), 500);
  };

  if (dismissed || !upsell) return null;

  const isAdded = addedId === upsell.product.id;

  return (
    <div className="card-premium" style={{
      margin: '0.75rem 1rem',
      padding: '0.85rem',
      background: 'linear-gradient(135deg, rgba(255, 69, 0, 0.08), rgba(20, 20, 20, 0.5))',
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
        <Button
          onClick={handleAdd}
          disabled={isAdded}
          variant="primary"
          style={{
            padding: '0.55rem 1.2rem',
            background: isAdded ? 'linear-gradient(135deg, #00C853, #00E676)' : undefined,
            fontSize: '0.82rem',
          }}
        >
          {isAdded ? '✓ Agregado' : '🔥 Pedir ahora'}
        </Button>
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
