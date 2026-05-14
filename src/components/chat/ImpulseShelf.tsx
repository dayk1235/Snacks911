'use client';

import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { getProductImage } from '@/data/products';

interface ShelfProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  label?: string;
}

interface ImpulseShelfProps {
  visible?: boolean;
  products?: ShelfProduct[];
  onAdd?: (product: ShelfProduct) => void;
  onVerTodos?: () => void;
  chatBottom?: number;
  standalone?: boolean;
  inline?: boolean;
}

function ShelfAddButton({ onClick }: { onClick: () => void }) {
  const [added, setAdded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (added) return;
    setAdded(true);
    onClick();
    setTimeout(() => setAdded(false), 1000);
  };

  return (
    <motion.button
      className="impulse-shelf-card-add-btn"
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      onClick={handleClick}
      animate={{
        backgroundColor: added ? '#22c55e' : undefined,
        scale: added ? [1, 1.2, 1] : 1,
      }}
    >
      {added ? '✓' : '+'}
    </motion.button>
  );
}

export default function ImpulseShelf({
  visible = true,
  products = [],
  onAdd,
  onVerTodos,
  chatBottom = 0,
  standalone = false,
  inline = false,
}: ImpulseShelfProps) {
  const items = products;
  const shouldShow = visible && items.length > 0;

  const handleAdd = (product: ShelfProduct) => {
    if (onAdd) {
      onAdd(product);
    }
  };

  const containerStyle = (standalone || inline)
    ? { position: 'relative' as const }
    : { position: 'fixed' as const, bottom: `${chatBottom + 12}px`, left: '1.25rem', zIndex: 9997 };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="impulse-shelf"
          initial={{ opacity: 0, y: -24, width: standalone ? '100%' : '540px' }}
          animate={{ opacity: 1, y: 0, width: standalone ? '100%' : 'min(85vw, 640px)' }}
          exit={{ opacity: 0, y: -12, width: standalone ? '100%' : '540px' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ ...containerStyle, pointerEvents: 'auto' }}
        >
          {items.map((product: any, i) => (
            <motion.div
              key={product.id}
              className="impulse-shelf-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255, 69, 0, 0.15)', borderColor: 'rgba(255, 69, 0, 0.3)' }}
              whileTap={{ scale: 0.97 }}
            >
              {product.label && (
                <div className="impulse-shelf-card-badge">
                  {product.label}
                </div>
              )}
              <img
                src={product.image || getProductImage({ id: product.id, name: product.name, category: product.category } as any)}
                alt={product.name}
                className="impulse-shelf-card-img"
                loading="lazy"
              />
              <div className="impulse-shelf-card-body">
                <div className="impulse-shelf-card-name">{product.name}</div>
                <div className="impulse-shelf-card-price">${product.price}</div>
              </div>
              <ShelfAddButton onClick={() => handleAdd(product)} />
            </motion.div>
          ))}

          {onVerTodos && (
            <motion.button
              className="impulse-shelf-ver-todos"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onVerTodos}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Ver todos
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
