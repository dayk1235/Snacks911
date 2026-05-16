'use client';

import { motion } from 'framer-motion';
import { buildWaLink } from '@/utils/whatsapp';

export default function WhatsAppButton() {
  return (
    <motion.a
      href={buildWaLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir WhatsApp para hacer un pedido en Snacks 911"
      className="fixed bottom-6 right-6 z-[999] btn btn-success"
      style={{ fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: '0.3px' }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
    >
      <span className="relative flex h-3 w-3 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
      </span>
      Pedir ahora
    </motion.a>
  );
}
