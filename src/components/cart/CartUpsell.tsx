'use client';

import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { products, getProductImage } from '@/data/products';
import { logEvent } from '@/core/eventLogger';
import { emitTelemetryEvent } from '@/core/telemetryEmitter';
import { useCartStore } from '@/lib/cartStore';
import { getBestUpsell } from '@/core';
import type { Product } from '@/data/products';
import type { CartItem } from '@/core/types';

interface CartUpsellProps {
  cartItems: CartItem[];
  onAdd: (product: Product) => void;
}

function CartUpsellComponent({ cartItems, onAdd }: CartUpsellProps) {
  const { getCartId } = useCartStore();
  const [addedId, setAddedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Curated list of irresistible upsells
  const upsellProducts = useMemo(() => {
    return products.filter(p => 
      p.category === 'extras' || 
      p.category === 'postres' || 
      p.category === 'bebidas' ||
      p.popular
    ).slice(0, 6);
  }, []);

  const handleAdd = (product: Product) => {
    const cartId = getCartId();
    logEvent({
      event_type: 'upsell_accepted',
      cart_id: cartId,
      payload_json: { product_id: product.id, product_name: product.name }
    });
    
    onAdd(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  if (dismissed || cartItems.length === 0) return null;

  return (
    <div className="cart-upsell-container my-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[0.7rem] font-black tracking-[0.2em] text-[var(--accent)] uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></span>
          🔥 EXCESOS NECESARIOS
        </h3>
        <button 
          onClick={() => setDismissed(true)}
          className="text-white/20 hover:text-white/60 transition-colors text-xs uppercase font-bold"
        >
          Ocultar
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
        {upsellProducts.map((product, i) => {
          const isAdded = addedId === product.id;
          return (
            <div 
              key={product.id}
              className="flex-shrink-0 w-[160px] glass p-3 snap-start group transition-all hover:border-[var(--accent)]/30"
              style={{ animation: `cardFadeIn 0.5s ease ${i * 0.1}s both` }}
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black/40">
                <img 
                  src={getProductImage(product)} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                {product.popular && (
                  <div className="absolute top-2 left-2 bg-[var(--accent)] text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
                    HOT
                  </div>
                )}
              </div>
              
              <div className="min-h-[32px] mb-2">
                <h4 className="text-[0.75rem] font-bold text-white leading-tight line-clamp-2">{product.name}</h4>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-col">
                  <span className="text-[var(--accent)] font-mono font-black text-sm">${product.price}</span>
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">Solo hoy</span>
                </div>
                
                <button
                  onClick={() => handleAdd(product)}
                  disabled={isAdded}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isAdded 
                    ? 'bg-green-500 text-white' 
                    : 'bg-white/5 border border-white/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black hover:shadow-[0_0_15px_var(--accent)]'
                  }`}
                >
                  {isAdded ? '✓' : <span className="text-xl font-bold">+</span>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

const CartUpsell = memo(CartUpsellComponent);
export default CartUpsell;
