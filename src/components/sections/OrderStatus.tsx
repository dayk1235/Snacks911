'use client';

import { motion } from 'framer-motion';

export default function OrderStatus() {
  return (
    <section id="order-status" className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-[2.5rem] font-black mb-2 uppercase tracking-tighter text-white">
          🚑 ESTADO DEL RESCATE
        </h2>
        <p className="text-[var(--muted)] text-[0.85rem] mb-10 uppercase tracking-widest font-bold">
          Seguimiento táctico en tiempo real
        </p>

        <div className="glass p-10 relative overflow-hidden">
          {/* Subtle pulse background */}
          <div className="absolute inset-0 bg-[var(--accent)] opacity-[0.02] animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <span className="text-[0.8rem] font-black text-[var(--muted)] tracking-widest uppercase">RESCATE #5829</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                <span className="text-[var(--accent)] font-black text-[0.8rem] tracking-widest uppercase">EN CAMINO 🏍️</span>
              </div>
            </div>

            {/* Tracker Line */}
            <div className="relative h-1 bg-[var(--border)] mb-12 rounded-full overflow-visible">
              {/* Progress */}
              <motion.div 
                className="absolute left-0 top-0 h-full bg-[var(--accent)] shadow-[0_0_20px_var(--accent)]"
                initial={{ width: '0%' }}
                whileInView={{ width: '66%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />

              {/* Nodes */}
              <div className="absolute inset-0 flex justify-between items-center px-0">
                {[0, 33, 66, 100].map((pos, i) => {
                  const isCompleted = pos <= 66;
                  const isActive = pos === 66;
                  
                  return (
                    <div 
                      key={i}
                      className={`relative z-20 w-4 h-4 rounded-full border-2 transition-all duration-500 ${
                        isCompleted 
                          ? 'bg-[var(--accent)] border-[var(--accent)] shadow-[0_0_15px_var(--accent)]' 
                          : 'bg-[var(--bg)] border-[var(--border)]'
                      }`}
                      style={{ left: `calc(${pos}% - 8px)`, position: 'absolute' }}
                    >
                      {isActive && (
                        <div className="absolute inset-[-6px] rounded-full border border-[var(--accent)] animate-ping opacity-50" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Labels */}
            <div className="flex justify-between text-[0.7rem] font-black uppercase tracking-widest text-[var(--muted)]">
              <span className="text-[var(--fg)]">Recibido</span>
              <span className="text-[var(--fg)]">Cocina</span>
              <span className="text-[var(--accent)]">En camino</span>
              <span>Entregado</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
