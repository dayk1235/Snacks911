'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAKE_ORDERS = [
  "Juan pidió Boneless 🔥",
  "María pidió Combo 911 🚨",
  "Carlos pidió Papas Gajo 🍟",
  "Ana pidió Alitas BBQ 🍗",
  "Luis pidió Combo Familiar 📦",
  "Sofía pidió Dips Extra 🍯"
];

export default function LiveFeed() {
  const [currentOrder, setCurrentOrder] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentOrder((prev) => (prev + 1) % FAKE_ORDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#080808] border-y border-white/5 py-4 overflow-hidden relative">
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-center sm:justify-start gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[0.65rem] font-black text-white/40 uppercase tracking-[0.2em]">EN VIVO:</span>
        </div>
        
        <div className="h-[20px] relative flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentOrder}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-[0.75rem] font-bold text-white tracking-wide"
            >
              {FAKE_ORDERS[currentOrder]}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden sm:block text-[0.6rem] font-bold text-[var(--accent)] uppercase tracking-widest opacity-50">
          Despacho prioritario activo
        </div>
      </div>
    </div>
  );
}
