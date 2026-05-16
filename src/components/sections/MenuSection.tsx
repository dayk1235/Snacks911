'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { products, getProductImage } from '@/data/products';
import type { Product } from '@/data/products';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuSectionProps {
  onAdd: (product: Product) => void;
}

export default function MenuSection({ onAdd }: MenuSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['all', ...cats];
  }, []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <section id="menu" className="py-32 px-6 bg-[#050505]">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-[clamp(3rem,8vw,5rem)] font-black uppercase tracking-tighter text-white mb-4">
            DESPACHO DIRECTO
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[2px] w-12 bg-[var(--accent)]"></div>
            <p className="text-[var(--muted)] text-xs sm:text-sm uppercase tracking-[0.4em] font-black">
              Arsenal Completo de Sabor
            </p>
            <div className="h-[2px] w-12 bg-[var(--accent)]"></div>
          </div>
        </div>

        {/* Categories Filter - Centered */}
        <div className="flex justify-center gap-3 mb-16 overflow-x-auto pb-4 no-scrollbar">
          {categories.map(cat => (
            <motion.button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-pill ${selectedCategory === cat ? 'active' : ''}`}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {/* Products Grid - Centered items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, ease: [0.2, 1, 0.3, 1] }}
                className="glass p-5 group cursor-pointer hover:border-[var(--accent)]/40 transition-all duration-700 w-full max-w-[320px]"
                onClick={() => onAdd(product)}
              >
                <div className="relative aspect-square rounded-[1.5rem] overflow-hidden mb-6 bg-black/40">
                  <Image
                    src={getProductImage(product)}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-5 left-5 right-5 translate-y-6 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-75">
                    <motion.button
                      className="btn btn-primary btn-sm w-full"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
                    >
                      + RESCUE
                    </motion.button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 px-1">
                  <h4 className="text-[1.1rem] font-black text-white uppercase tracking-tight truncate">
                    {product.name}
                  </h4>
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                      <span className="text-[0.6rem] text-white/30 font-black uppercase tracking-[0.2em] mb-1">Costo Unitario</span>
                      <span className="font-mono text-[var(--accent)] font-black text-xl leading-none">
                        ${product.price}
                      </span>
                    </div>
                    <span className="text-[0.65rem] text-white/20 font-black uppercase tracking-widest border border-white/5 px-3 py-1 rounded-full">
                      {product.category}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>

  );
}
