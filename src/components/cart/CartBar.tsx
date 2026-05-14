'use client';

import { useCartStore } from '@/lib/cartStore';

export default function CartBar() {
  const { totalItems, totalPrice } = useCartStore();

  if (totalItems === 0) return null;

  return (
    <div 
      id="cartBar" 
      className="glass cart-bar fixed bottom-[calc(40px+var(--safe-area-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-80px)] max-w-[700px] h-[90px] flex items-center justify-between px-10 z-[1000] transition-all duration-[800ms] border border-white/10"
    >
      <div className="flex items-center gap-4">
        <div id="cartIcon" className="relative text-2xl">
          🛒
          <span id="cartCount" className="absolute -top-2.5 -right-2.5 bg-[var(--accent)] text-[var(--bg)] text-[0.7rem] font-black w-[18px] h-[18px] rounded-full flex items-center justify-center animate-[pulse-glow_2s_infinite]">
            {totalItems}
          </span>
        </div>
        <div>
          <div id="cartTotal" className="font-mono font-black text-xl tracking-tight text-[var(--fg)]">
            ${totalPrice.toFixed(2)}
          </div>
          <div className="text-[0.7rem] text-[var(--muted)] font-bold tracking-widest uppercase">
            ESTATUS: LISTO PARA DESPACHO
          </div>
        </div>
      </div>
      <button 
        className="btn btn-primary !py-2.5 !px-6 !text-[0.8rem] !font-black !tracking-widest"
        onClick={() => window.location.href = '/checkout'}
      >
        CHECKOUT 🔥
      </button>

      <style jsx>{`
        .cart-bar {
          animation: slideUp 0.8s cubic-bezier(0.2, 1, 0.3, 1) forwards;
        }
        @keyframes slideUp {
          from { transform: translate(-50%, 200%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
