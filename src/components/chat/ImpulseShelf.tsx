'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getProductImage } from '@/data/products';

interface ShelfProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
}

interface ImpulseShelfProps {
  visible?: boolean;
  products?: ShelfProduct[];
  onAdd?: (product: ShelfProduct) => void;
  onVerTodos?: () => void;
  chatBottom?: number;
  standalone?: boolean;
}

const MOCK_PRODUCTS: ShelfProduct[] = [
  { id: 'mock-1', name: 'Combo Mixto 911', price: 249, category: 'combos' },
  { id: 'mock-2', name: 'Boneless Power', price: 155, category: 'combos' },
  { id: 'mock-3', name: 'Alitas Fuego', price: 145, category: 'combos' },
  { id: 'mock-4', name: 'Papas 911 Loaded', price: 149, category: 'combos' },
  { id: 'mock-5', name: 'Dedos de Queso', price: 85, category: 'banderillas' },
  { id: 'mock-6', name: 'Banderilla Coreana', price: 79, category: 'banderillas' },
];

export default function ImpulseShelf({
  visible = true,
  products,
  onAdd,
  onVerTodos,
  chatBottom = 0,
  standalone = false,
}: ImpulseShelfProps) {
  const items = products && products.length > 0 ? products : MOCK_PRODUCTS;
  const shouldShow = visible && items.length > 0;

  const handleAdd = (product: ShelfProduct) => {
    if (onAdd) {
      onAdd(product);
    }
  };

  const containerStyle = standalone
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
          {items.map((product, i) => (
            <motion.div
              key={product.id}
              className="impulse-shelf-card"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
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
              <motion.button
                className="impulse-shelf-card-add-btn"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd(product);
                }}
              >
                +
              </motion.button>
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
