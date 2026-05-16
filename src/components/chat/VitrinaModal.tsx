'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/data/products';
import { getProductImage } from '@/data/products';

interface VitrinaModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAdd: (product: Product) => void;
}

const CATEGORIES = [
  { id: 'all', label: '🔥 Todos' },
  { id: 'combos', label: 'Combos' },
  { id: 'proteina', label: 'Proteína' },
  { id: 'papas', label: 'Papas' },
  { id: 'banderillas', label: 'Banderillas' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'postres', label: 'Postres' },
  { id: 'extras', label: 'Extras' },
];

export default function VitrinaModal({ isOpen, onClose, products, onAdd }: VitrinaModalProps) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return products;
    return products.filter(p => p.category === filter);
  }, [products, filter]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="vitrina-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="vitrina-header">
            <span className="vitrina-title">🍟 Menú Completo</span>
            <motion.button
              className="vitrina-close"
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
            >
              ✕
            </motion.button>
          </div>

          <div className="vitrina-filters">
            {CATEGORIES.map(cat => (
              <motion.button
                key={cat.id}
                className={`vitrina-filter-pill ${filter === cat.id ? 'active' : ''}`}
                onClick={() => setFilter(cat.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
              >
                {cat.label}
              </motion.button>
            ))}
          </div>

          <motion.div
            className="vitrina-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                className="vitrina-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onAdd(product);
                  onClose();
                }}
              >
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="vitrina-card-img"
                  loading="lazy"
                />
                <div className="vitrina-card-body">
                  <div className="vitrina-card-name">{product.name}</div>
                  <div className="vitrina-card-price">${product.price}</div>
                  {product.description && (
                    <div className="vitrina-card-desc">{product.description}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
