'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { products, getProductImage } from '@/data/products';
import { useCartStore } from '@/lib/cartStore';
import { motion } from 'framer-motion';

export default function TopVentas() {
  const { addToCart } = useCartStore();
  
  const topProducts = useMemo(() => {
    // Return top 3 popular products or just the first 3 if none marked
    return products.slice(0, 3);
  }, []);

  return (
    <section id="top-ventas" className="py-20 px-6 overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-10">
          <h2 className="text-[2.5rem] font-black uppercase tracking-tighter text-white mb-1">
            🔥 LO MÁS PEDIDO AHORA
          </h2>
          <p className="text-[var(--muted)] text-[0.85rem] uppercase tracking-widest font-bold">
            Más pedidos en los últimos 30 min
          </p>
        </div>

        <div className="flex gap-8 overflow-x-auto pb-10 no-scrollbar snap-x snap-mandatory">
          {topProducts.map((product, i) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass min-w-[300px] sm:min-w-[340px] p-6 flex flex-col gap-6 snap-start relative group"
            >
              <div className="absolute top-4 right-4 z-10 bg-[var(--accent)] text-[var(--bg)] px-3 py-1 rounded-md text-[0.7rem] font-black tracking-widest uppercase shadow-[0_0_15px_var(--accent)]">
                HOT
              </div>
              
              <div className="relative h-[200px] rounded-xl overflow-hidden bg-black/40">
                <Image 
                  src={getProductImage(product)} 
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{product.name}</h3>
                <p className="text-[var(--muted)] text-sm line-clamp-1">{product.description}</p>
              </div>

              <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                <span className="font-mono text-2xl font-black text-[var(--accent)]">${product.price}</span>
                <button 
                  onClick={() => addToCart(product)}
                  className="w-12 h-12 rounded-full bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,90,0,0.4)]"
                >
                  +
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
