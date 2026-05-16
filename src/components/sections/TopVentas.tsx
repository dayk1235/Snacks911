'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { products, getProductImage } from '@/data/products';
import { useCartStore } from '@/lib/cartStore';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export default function TopVentas() {
  const { addToCart } = useCartStore();
  
  const topProducts = useMemo(() => {
    // Return top popular products: Combo 911, Boneless, Papas
    return products.filter(p => 
      p.name.includes('Combo') || 
      p.name.includes('Boneless') || 
      p.name.includes('Papas')
    ).slice(0, 3);
  }, []);

  return (
    <section id="top-ventas" className="py-24 px-6 overflow-hidden bg-black/20">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <div className="reveal-on-scroll">
            <h2 className="text-[3rem] sm:text-[4.5rem] font-black uppercase tracking-tighter text-white leading-[0.85] mb-4">
              🔥 LO MÁS <br /> <span className="fire-text">PEDIDO AHORA</span>
            </h2>
            <p className="text-[var(--accent)] text-[0.7rem] uppercase tracking-[0.3em] font-black flex items-center gap-2">
              <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></span>
              SISTEMA DE DESPACHO EN TIEMPO REAL
            </p>
          </div>
          <div className="hidden lg:block text-right opacity-30 text-[0.6rem] font-bold tracking-widest uppercase">
            Actualizado hace 2 min • Basado en 142 pedidos recientes
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar snap-x snap-mandatory -mx-6 px-6">
          {topProducts.map((product, i) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="glass min-w-[320px] sm:min-w-[420px] p-8 flex flex-col gap-6 snap-start relative group border-white/5"
            >
              <div className="absolute top-6 left-6 z-10 bg-red-600 text-white px-3 py-1 rounded-sm text-[0.6rem] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse">
                CRITICAL HIT
              </div>
              
              <div className="relative h-[240px] rounded-2xl overflow-hidden bg-black/60 shadow-inner">
                <Image 
                  src={getProductImage(product)} 
                  alt={product.name}
                  fill
                  className="object-contain p-4 transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              </div>

              <div className="flex flex-col gap-2 relative z-10">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{product.name}</h3>
                  <span className="font-mono text-2xl font-black text-[var(--accent)]">${product.price}</span>
                </div>
                <p className="text-white/40 text-[0.8rem] leading-relaxed line-clamp-2 pr-10">{product.description}</p>
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={() => addToCart(product)}
              >
                + ACTIVAR PEDIDO
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
