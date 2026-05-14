'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/data/products';
import Image from 'next/image';
import { getProductImage } from '@/data/products';
import { useState } from 'react';

interface ProductCustomizerModalProps {
  product: Product | null;
  onClose: () => void;
  onConfirm: (product: Product, selectedNames: string[], chosenExtras: any[]) => void;
}

export default function ProductCustomizerModal({ product, onClose, onConfirm }: ProductCustomizerModalProps) {
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  if (!product) return null;

  const extras = [
    { id: 'e1', name: 'Salsa Secreta 911', price: 1.00 },
    { id: 'e2', name: 'Tocino Ahumado', price: 2.00 },
    { id: 'e3', name: 'Queso Extra', price: 1.50 },
    { id: 'e4', name: 'Chiles Toreados', price: 0.50 }
  ];

  const toggleExtra = (name: string) => {
    setSelectedExtras(prev => 
      prev.includes(name) ? prev.filter(e => e !== name) : [...prev, name]
    );
  };

  const handleConfirm = () => {
    const chosen = extras.filter(e => selectedExtras.includes(e.name)).map(e => ({
      ...e,
      id: Number(e.id.replace('e', '')),
      category: 'extras',
      available: true
    }));
    onConfirm(product, selectedExtras, chosen);
  };

  const totalPrice = product.price + selectedExtras.reduce((sum, name) => {
    const extra = extras.find(e => e.name === name);
    return sum + (extra?.price || 0);
  }, 0);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass w-full max-w-[450px] p-8 relative overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            ✕
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">CUSTOMIZE</h2>
            <p className="text-[var(--muted)] text-sm uppercase tracking-widest font-bold">Protocolo de Personalización Táctica</p>
          </div>

          <div className="flex items-center gap-6 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/40">
              <Image src={getProductImage(product)} alt={product.name} fill className="object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">{product.name}</h3>
              <p className="text-[var(--accent)] font-mono text-lg font-black">${product.price}</p>
            </div>
          </div>

          <div className="space-y-4 mb-10">
            <p className="text-[var(--muted)] text-[0.7rem] font-black uppercase tracking-[0.2em] mb-4">Módulos Adicionales</p>
            {extras.map(extra => (
              <label 
                key={extra.name}
                className={`flex justify-between items-center p-4 rounded-xl cursor-pointer transition-all border ${
                  selectedExtras.includes(extra.name)
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40 text-white'
                    : 'bg-white/5 border-white/5 text-[var(--muted)] hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[0.9rem] font-black uppercase tracking-tight">{extra.name}</span>
                  <span className="text-[0.7rem] font-bold opacity-60">+$${extra.price.toFixed(2)}</span>
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={selectedExtras.includes(extra.name)}
                  onChange={() => toggleExtra(extra.name)}
                />
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  selectedExtras.includes(extra.name)
                    ? 'bg-[var(--accent)] border-[var(--accent)]'
                    : 'border-white/20'
                }`}>
                  {selectedExtras.includes(extra.name) && <span className="text-[var(--bg)] font-black text-xs">✓</span>}
                </div>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-[var(--muted)] font-black uppercase text-xs tracking-widest">Total del Rescate:</span>
              <span className="text-3xl font-black text-white font-mono">${totalPrice.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleConfirm}
              className="btn btn-primary w-full !py-5"
            >
              AGREGAR AL RESCATE 🔥
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
