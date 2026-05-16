'use client';

import { buildWaLink } from '@/utils/whatsapp';

export default function WhatsAppButton() {
  return (
    <a
      href={buildWaLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir WhatsApp para hacer un pedido en Snacks 911"
      className="fixed bottom-6 right-6 z-[999] flex items-center gap-2 bg-green-500 hover:bg-green-600
        text-white font-bold py-3 px-5 rounded-full shadow-2xl
        hover:scale-105 active:scale-95 transition-all duration-200"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span className="relative flex h-3 w-3 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
      </span>
      Pedir ahora
    </a>
  );
}
