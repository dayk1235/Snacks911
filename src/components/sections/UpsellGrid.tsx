'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { products, getProductImage } from '@/data/products';
import { useCartStore } from '@/lib/cartStore';
import { motion } from 'framer-motion';

export default function UpsellGrid() {
  const { addToCart } = useCartStore();
  
  const extras = useMemo(() => {
    return products.filter(p => 
      p.category?.toLowerCase() === 'complementos' || 
      p.category?.toLowerCase() === 'bebidas' ||
      p.name.includes('Extra')
    ).slice(0, 4);
  }, []);

  if (extras.length === 0) return null;

  return (
    <section id="extras" className="py-24 px-6 bg-[#050505]">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-16 reveal-on-scroll">
          <h2 className="text-[2.5rem] sm:text-[4rem] font-black uppercase tracking-tighter text-white mb-4">
            💣 EXTRAS QUE <span className="text-[var(--accent)]">HACEN DAÑO</span>
          </h2>
          <p className="text-white/30 text-[0.8rem] uppercase tracking-[0.3em] font-bold">
            Porque una orden básica no es suficiente
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {extras.map((product, i) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/2 border border-white/5 p-6 rounded-2xl flex flex-col gap-4 hover:border-[var(--accent)]/30 transition-all group"
            >
              <div className="relative h-[160px] rounded-xl overflow-hidden bg-black/40">
                <Image 
                  src={getProductImage(product)} 
                  alt={product.name}
                  fill
                  className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">{product.name}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--accent)] font-black text-xl">${product.price}</span>
                  <button 
                    onClick={() => addToCart(product)}
                    className="text-[0.7rem] font-black text-white/40 hover:text-[var(--accent)] uppercase tracking-widest transition-colors"
                  >
                    + AGREGAR
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
