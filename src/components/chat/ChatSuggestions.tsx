'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { products, getProductImage } from '@/data/products';
import type { Product } from '@/data/products';
import { recordSuggestionInteraction, getSuggestionScores } from '@/lib/customerMemory';

const MAX_VISIBLE = 4;

const CATALOG = {
  combos: ['1', '2', '3'] as const,
  complements: ['10', '15', '16'] as const,
  lowCost: ['10', '15', '16', '14'] as const,
  default: ['1', '2'] as const,
};

function resolveProductIds(
  cartItemNames: string[],
  cartTotal: number,
): readonly string[] {
  const namesLower = cartItemNames.map((n) => `${n}`.toLowerCase());

  const notInCart = (id: string): boolean => {
    const product = products.find((p) => p.id === id);
    if (!product) return false;
    const nameLower = product.name.toLowerCase();
    return !namesLower.some(
      (cn) => nameLower.includes(cn) || cn.includes(nameLower),
    );
  };

  if (cartItemNames.length === 0) return CATALOG.combos;

  const hasProtein = cartItemNames.some((n) => {
    const s = `${n}`.toLowerCase();
    return (
      s.includes('alitas') ||
      s.includes('boneless') ||
      s.includes('combo')
    );
  });

  if (hasProtein) {
    const filtered = CATALOG.complements.filter(notInCart);
    if (filtered.length > 0) return filtered;
  }

  if (cartTotal < 150) {
    const filtered = CATALOG.lowCost.filter(notInCart);
    if (filtered.length > 0) return filtered;
  }

  return CATALOG.default.filter(notInCart);
}

export default function ChatSuggestions({
  onAdd,
  onVerTodos,
  cartItemNames = [],
  cartTotal = 0,
}: {
  onAdd?: (product: Product) => void;
  onVerTodos?: () => void;
  cartItemNames?: string[];
  cartTotal?: number;
}) {
  const [addedId, setAddedId] = useState<string | null>(null);

  const ids = useMemo(
    () => resolveProductIds(cartItemNames, cartTotal),
    [cartItemNames, cartTotal],
  );

  const suggestions = useMemo(() => {
    const scores = getSuggestionScores();
    
    return [...ids]
      .sort((a, b) => (scores[b] || 0) - (scores[a] || 0)) // Sort by score
      .slice(0, MAX_VISIBLE)
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean) as Product[];
  }, [ids]);

  // Track impressions (when suggestions appear)
  useEffect(() => {
    if (suggestions.length > 0) {
      suggestions.forEach(p => recordSuggestionInteraction(p.id, 'impression'));
    }
  }, [suggestions]);

  const handleAdd = useCallback(
    (product: Product) => {
      recordSuggestionInteraction(product.id, 'click');
      setAddedId(product.id);
      onAdd?.(product);
      setTimeout(() => setAddedId(null), 2000);
    },
    [onAdd],
  );

  if (suggestions.length === 0) return null;

  return (
    <div style={{ marginTop: '10px' }}>
      <div
        style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginLeft: '2px',
        }}
      >
        💬 Te recomiendo esto 🔥
      </div>

      <motion.div
        className="chat-cards-scroll"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, staggerChildren: 0.08 }}
      >
        {suggestions.map((product, i) => {
          const isAdded = addedId === product.id;
          return (
            <motion.div
              key={product.id}
              className="chat-product-card"
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 }
              }}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.25,
                delay: 0.3 + i * 0.08,
                ease: "easeOut"
              }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255, 69, 0, 0.15)', borderColor: 'rgba(255, 69, 0, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAdd(product)}
            >
              <div className="chat-product-card-img-wrap">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="chat-product-card-img"
                />
              </div>
              <div className="chat-product-card-body">
                <div className="chat-product-card-name">{product.name}</div>
                <div className="chat-product-card-price">${product.price}</div>
                <motion.div
                  className="chat-product-card-add"
                  whileHover={
                    isAdded
                      ? {}
                      : { scale: 1.08, backgroundColor: 'rgba(255,69,0,0.25)' }
                  }
                  animate={
                    isAdded
                      ? {
                          backgroundColor: 'rgba(34,197,94,0.15)',
                          color: '#22c55e',
                          scale: [1, 1.12, 1],
                        }
                      : {
                          backgroundColor: 'rgba(255,69,0,0.15)',
                          color: 'var(--accent)',
                          scale: 1,
                        }
                  }
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  {isAdded ? (
                    <>
                      <span style={{ fontSize: '0.7rem' }}>✓</span>
                      <span>Agregado 🔥</span>
                    </>
                  ) : (
                    '+ Agregar'
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}

        {onVerTodos && (
          <motion.div
            className="chat-product-card"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, delay: 0.3 + suggestions.length * 0.08, ease: "easeOut" }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255, 69, 0, 0.2)', borderColor: 'rgba(255, 69, 0, 0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onVerTodos}
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-gradient))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minWidth: '100px',
              maxWidth: '100px',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>📋</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>
              Ver todos →
            </span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
