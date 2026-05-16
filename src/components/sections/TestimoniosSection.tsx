'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const testimonios = [
  { nombre: 'Fer G.', colonia: 'Col. Ejército', stars: 5, texto: 'Las salsas no son de broma. El habanero 911 es nivel otra cosa 🔥', img: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { nombre: 'Diana R.', colonia: 'Iztapalapa', stars: 5, texto: 'Pedí a las 8 PM y llegó en 28 minutos. El combo mixto está brutal.', img: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { nombre: 'Carlos M.', colonia: 'Constitucional', stars: 5, texto: 'Ya pedí 3 veces esta semana. Los boneless con chipotle son mi perdición.', img: 'https://randomuser.me/api/portraits/men/46.jpg' },
  { nombre: 'Sofía T.', colonia: 'Centro', stars: 5, texto: 'Las papas loaded están increíbles. Súper recomendado.', img: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { nombre: 'Luis P.', colonia: 'San Andrés', stars: 5, texto: 'El servicio por chat está de locos, rapidísimo y caliente.', img: 'https://randomuser.me/api/portraits/men/22.jpg' },
];

export default function TestimoniosSection() {
  const [page, setPage] = useState(0);

  // Auto-rotate every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPage((prev) => prev + 1);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Get 3 items for the current page, wrapping around the array
  const visibleItems = [
    testimonios[(page * 3) % testimonios.length],
    testimonios[(page * 3 + 1) % testimonios.length],
    testimonios[(page * 3 + 2) % testimonios.length],
  ];

  return (
    <section className="relative overflow-hidden py-32 bg-[#050505]">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-[var(--color-primary)]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-[1200px] mx-auto relative z-10 px-6">
        <div className="mb-14 text-center">
          <h2 className="m-0 font-black uppercase text-white tracking-tighter" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            Lo que dicen <br/>
            <span className="text-[var(--color-primary)]">los que ya probaron</span>
          </h2>
          <p className="text-white/40 mt-4 font-bold tracking-widest uppercase text-sm">
            TESTIMONIOS REALES • 100% SATISFACCIÓN
          </p>
        </div>
        
        {/* Animated 3-Card Grid */}
        <div className="w-full min-h-[250px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, y: -20, filter: 'blur(12px)' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
            >
              {visibleItems.map((t, idx) => (
                <div 
                  key={`${page}-${idx}`} 
                  className="flex flex-col gap-4 px-6 py-6 rounded-[24px] cyber-glow-card relative group bg-[#0a0a0a]/80 backdrop-blur-xl justify-between shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.02]" 
                >
                  {/* Top: Image and Text */}
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-[var(--color-primary)]/50 shadow-[0_0_15px_rgba(255,90,0,0.3)] relative bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.img} alt={t.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <div className="flex gap-1 text-base text-[var(--color-primary)] filter drop-shadow-[0_0_8px_rgba(255,90,0,0.8)] mb-1">
                        {'★'.repeat(t.stars)}
                      </div>
                      <p className="m-0 text-[0.95rem] leading-snug text-white/90 font-medium italic">
                        &ldquo;{t.texto}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Bottom: User Info */}
                  <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-black text-white text-[0.85rem] tracking-wider uppercase">{t.nombre}</div>
                      <div className="text-[0.65rem] font-bold text-[var(--color-primary)] uppercase tracking-widest mt-0.5">{t.colonia}</div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm shadow-md transition-all group-hover:bg-[var(--color-primary)] group-hover:text-black group-hover:scale-110">
                      🔥
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .cyber-glow-card {
          border: 1px solid transparent;
          animation: cyber-glow-card 4s linear infinite;
        }
        @keyframes cyber-glow-card {
          0% {
            border-color: rgba(255, 90, 0, 0.4);
            box-shadow: 0 5px 20px -5px rgba(0,0,0,0.8), 0 0 10px rgba(255, 90, 0, 0.2), inset 0 0 5px rgba(255, 90, 0, 0.05);
          }
          33% {
            border-color: rgba(255, 0, 128, 0.4);
            box-shadow: 0 5px 20px -5px rgba(0,0,0,0.8), 0 0 15px rgba(255, 0, 128, 0.2), inset 0 0 5px rgba(255, 0, 128, 0.05);
          }
          66% {
            border-color: rgba(138, 43, 226, 0.4);
            box-shadow: 0 5px 20px -5px rgba(0,0,0,0.8), 0 0 15px rgba(138, 43, 226, 0.2), inset 0 0 5px rgba(138, 43, 226, 0.05);
          }
          100% {
            border-color: rgba(255, 90, 0, 0.4);
            box-shadow: 0 5px 20px -5px rgba(0,0,0,0.8), 0 0 10px rgba(255, 90, 0, 0.2), inset 0 0 5px rgba(255, 90, 0, 0.05);
          }
        }
      `}} />
    </section>
  );
}
