'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/stores/chatStore';
import { useEffect, useState } from 'react';

export default function ChatBubble() {
  const { isOpen, toggle } = useChatStore();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Show tooltip after 3 seconds if chat is closed
    const timer = setTimeout(() => {
      if (!isOpen) setShowTooltip(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 left-6 z-[60] flex flex-col items-start gap-3">
      {/* Tooltip */}
      <AnimatePresence>
        {!isOpen && showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-white text-black text-[0.8rem] font-bold px-4 py-2.5 rounded-2xl rounded-bl-none shadow-[0_10px_30px_rgba(0,0,0,0.3)] max-w-[180px] relative border border-gray-100"
          >
            🔥 ¿Qué se te antoja hoy?
            <div className="text-[0.7rem] font-medium text-gray-500 mt-0.5">
              Pide en segundos con IA
            </div>
            {/* Arrow */}
            <div className="absolute -bottom-1 left-0 w-2 h-2 bg-white rotate-45 border-b border-r border-gray-100"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => {
          toggle();
          setShowTooltip(false);
        }}
        whileHover={{ scale: 1.1, rotate: -5 }}
        whileTap={{ scale: 0.9 }}
        className={`relative w-16 h-16 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-500 border border-white/10 ${
          isOpen ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'
        }`}
        aria-label={isOpen ? "Cerrar chat" : "Abrir chat de pedidos"}
      >
        {/* Glow Effect */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-[24px] bg-white opacity-20 blur-xl animate-pulse"></div>
        )}

        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              className="text-xl"
            >
              ✕
            </motion.span>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="flex flex-col items-center"
            >
              <span className="text-3xl filter drop-shadow-md">🍗</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Small Active Badge */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#050505] animate-pulse"></span>
        )}
      </motion.button>
    </div>
  );
}
