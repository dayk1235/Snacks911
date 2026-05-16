'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/lib/chatStore';
import { Button } from '@/components/ui/Button';

export default function ScrollCTA() {
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(false);
  const setPhase = useChatStore((s) => s.setPhase);

  useEffect(() => {
    const handleScroll = () => {
      if (closed) return;
      
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollY / height) * 100;

      if (progress > 40) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [closed]);

  const handleOpenChat = () => {
    setShow(false);
    // Disparar el evento para abrir el chat si es necesario
    // O simplemente confiar en que el usuario hará clic en el FAB
    // Pero aquí podemos forzar el inicio del flujo
    window.dispatchEvent(new CustomEvent('open-snacks-chat'));
  };

  return (
    <AnimatePresence>
      {show && !closed && (
        <motion.div
          className="scroll-cta-container"
          initial={{ opacity: 0, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="scroll-cta-content">
            <span className="scroll-cta-text">🔥 ¿Ya sabes qué pedir?</span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenChat}
            >
              Pedir ahora
            </Button>
            <motion.button
              className="scroll-cta-close"
              onClick={() => setClosed(true)}
              whileHover={{ scale: 1.2, rotate: 90 }}
              whileTap={{ scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
            >
              ×
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
