'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/stores/chatStore';
import ChatBot from './ChatBot';
import { useEffect } from 'react';

export default function ChatDrawer() {
  const { isOpen, close } = useChatStore();

  // Handle Escape key and body scroll lock
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Lock scroll only on mobile
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay - Mobile Only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden"
          />

          {/* MOBILE: Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] md:hidden rounded-t-[32px] overflow-hidden flex flex-col"
            style={{ 
              background: 'var(--color-bg)',
              height: '80dvh',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center py-3">
              <div className="w-12 h-1.5 rounded-full bg-white/10"></div>
            </div>
            
            <DrawerHeader onClose={close} />
            <div className="flex-1 overflow-hidden">
              <ChatBot />
            </div>
          </motion.div>

          {/* DESKTOP: Side Panel (Premium Floating Style) */}
          <motion.div
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="hidden md:flex fixed right-5 z-[1501] w-[420px] flex-col overflow-hidden rounded-[40px] cyber-glow-border"
            style={{ 
              top: '120px',
              height: 'calc(100vh - 140px)',
              background: 'rgba(5, 5, 5, 0.85)',
              backdropFilter: 'blur(25px)',
            }}
          >
            <DrawerHeader onClose={close} />
            <div className="flex-1 overflow-hidden">
              <ChatBot />
            </div>
          </motion.div>

          <style dangerouslySetInnerHTML={{__html: `
            .cyber-glow-border {
              border: 2px solid transparent;
              animation: cyber-glow 3s linear infinite;
            }
            @keyframes cyber-glow {
              0% {
                border-color: rgba(255, 90, 0, 0.6);
                box-shadow: 0 25px 60px -20px rgba(0,0,0,0.8), 0 0 30px rgba(255, 90, 0, 0.3), 0 0 50px rgba(255, 90, 0, 0.15), inset 0 0 15px rgba(255, 90, 0, 0.2);
              }
              33% {
                border-color: rgba(255, 0, 128, 0.6);
                box-shadow: 0 25px 60px -20px rgba(0,0,0,0.8), 0 0 40px rgba(255, 0, 128, 0.35), 0 0 60px rgba(255, 0, 128, 0.2), inset 0 0 20px rgba(255, 0, 128, 0.3);
              }
              66% {
                border-color: rgba(138, 43, 226, 0.6);
                box-shadow: 0 25px 60px -20px rgba(0,0,0,0.8), 0 0 40px rgba(138, 43, 226, 0.35), 0 0 60px rgba(138, 43, 226, 0.2), inset 0 0 20px rgba(138, 43, 226, 0.3);
              }
              100% {
                border-color: rgba(255, 90, 0, 0.6);
                box-shadow: 0 25px 60px -20px rgba(0,0,0,0.8), 0 0 30px rgba(255, 90, 0, 0.3), 0 0 50px rgba(255, 90, 0, 0.15), inset 0 0 15px rgba(255, 90, 0, 0.2);
              }
            }
          `}} />
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-2xl shadow-[0_8px_30px_rgba(255,90,0,0.4)]">
            🍗
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#050505] shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
        </div>
        <div>
          <h3 className="font-black text-white text-base uppercase tracking-[2px] leading-tight">
            Dispatcher <span className="text-[var(--color-primary)]">911</span>
          </h3>
          <p className="text-[0.65rem] font-bold text-white/40 uppercase tracking-widest mt-1 flex items-center gap-2">
            AI Assistant <span className="opacity-30">•</span> <span className="text-green-500/80">Online</span>
          </p>
        </div>
      </div>
      <motion.button
        onClick={onClose}
        className="btn btn-icon"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        ✕
      </motion.button>
    </div>
  );
}
