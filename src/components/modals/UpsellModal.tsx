'use client';

import { useMemo } from 'react';
import { Button } from '../ui/Button';
import { Product, products, getProductImage } from '@/data/products';

interface UpsellModalProps {
  product: Product;
  onUpgrade: (combo: Product) => void;
  onSkip: () => void;
}

export default function UpsellModal({ product, onUpgrade, onSkip }: UpsellModalProps) {
  const isBoneless = product.category === 'proteina' && product.name.toLowerCase().includes('boneless');
  const isAlitas   = product.category === 'proteina' && product.name.toLowerCase().includes('alita');

  const offer = useMemo(() => {
    if (isBoneless) {
      const combo = products.find(p => p.id === '2'); // Boneless Power 911
      return {
        title: '¡MEJOR EN COMBO!',
        message: 'Añade papas sazonadas y refresco por una fracción del precio. El rescate perfecto.',
        upsellPrice: (combo?.price || 0) - product.price,
        upsellLabel: 'Combo Boneless',
        combo,
        rejectLabel: 'Solo boneless',
      };
    }
    if (isAlitas) {
      const combo = products.find(p => p.id === '3'); // Alitas Fuego 911
      return {
        title: '¡MEJOR EN COMBO!',
        message: 'Tus alitas necesitan refuerzos. Papas y bebida para una misión completa.',
        upsellPrice: (combo?.price || 0) - product.price,
        upsellLabel: 'Combo Alitas',
        combo,
        rejectLabel: 'Solo alitas',
      };
    }
    return null;
  }, [isBoneless, isAlitas, product.price]);

  if (!offer || !offer.combo) return null;

  const handleAccept = () => onUpgrade(offer.combo!);
  const handleReject = () => onSkip();

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-6 backdrop-blur-md bg-black/80 animate-[fadeIn_0.2s_ease]"
      onClick={handleReject}
    >
      <div
        className="w-full max-w-[420px] glass p-8 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[var(--accent)] blur-md opacity-50"></div>
        
        <div className="text-center mb-8">
          <div className="text-4xl mb-4 animate-bounce">🔥</div>
          <h3 className="text-2xl font-black tracking-tight text-white uppercase mb-2">
            {offer.title}
          </h3>
          <p className="text-white/40 text-sm leading-relaxed px-4">
            {offer.message}
          </p>
        </div>

        {/* Highlight Card */}
        <div className="bg-white/5 border border-[var(--accent)]/30 rounded-2xl p-5 mb-8 flex items-center gap-4 relative group">
          <div className="absolute -top-3 -right-3 bg-[var(--accent)] text-black text-[10px] font-black px-3 py-1 rounded-full shadow-[0_0_15px_var(--accent)]">
            BEST VALUE
          </div>
          <div className="w-16 h-16 bg-black/40 rounded-xl overflow-hidden flex-shrink-0">
             <img 
               src={getProductImage(offer.combo)}
               alt="Combo"
               className="w-full h-full object-cover"
             />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Upgrade a</div>
            <div className="text-lg font-black text-white">{offer.upsellLabel}</div>
            <div className="text-[var(--accent)] font-mono font-bold">Por solo +${offer.upsellPrice}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            className="w-full py-5 bg-[var(--accent)] text-black font-black text-xl rounded-xl tracking-tighter uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,90,0,0.2)]"
          >
            SÍ, HACERLO COMBO 🔥
          </button>

          <button
            onClick={handleReject}
            className="w-full py-3 text-white/30 text-xs font-bold uppercase tracking-widest hover:text-white/60 transition-colors"
          >
            {offer.rejectLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
