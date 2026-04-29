'use client';

import { useMemo } from 'react';
import { Button } from '../ui/Button';
import { Product } from '@/data/products';
import { products } from '@/data/products';

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
      const combo = products.find(p => p.id === 7); // Combo Boneless
      return {
        title: '¿Hazlo Combo?',
        message: 'Por solo un poco más, llévate tus boneless con papas y bebida.',
        upsellPrice: (combo?.price || 0) - product.price,
        upsellLabel: 'Combo Boneless',
        combo,
        rejectLabel: 'Solo boneless',
      };
    }
    if (isAlitas) {
      const combo = products.find(p => p.id === 8); // Combo Alitas
      return {
        title: '¿Hazlo Combo?',
        message: 'Tus alitas saben mejor con papas y una bebida fría.',
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
      onClick={handleReject}
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem',
        animation: 'upsellFadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card-premium"
        style={{
          width: '100%', maxWidth: '360px',
          padding: '1.75rem 1.5rem',
          textAlign: 'center',
          background: 'linear-gradient(145deg, #1a1a1a, #0d0d0d)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1 }}>
          {isBoneless ? '🔥' : '🍗'}
        </div>

        <h3 style={{
          margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: 800, color: '#fff',
          fontFamily: 'var(--font-display)', letterSpacing: '0.03em',
        }}>
          {offer.title}
        </h3>

        <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#888', lineHeight: 1.5 }}>
          {offer.message}
        </p>

        {/* Price highlight */}
        <div style={{
          display: 'inline-block',
          padding: '0.35rem 1rem',
          background: 'rgba(255,69,0,0.1)',
          border: '1px solid rgba(255,69,0,0.2)',
          borderRadius: '50px',
          marginBottom: '1.25rem',
        }}>
          <span style={{ fontSize: '0.78rem', color: '#FF4500', fontWeight: 700 }}>
            +${offer.upsellPrice} → {offer.upsellLabel}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <Button
            onClick={handleAccept}
            variant="primary"
            fullWidth
            style={{ padding: '0.95rem', fontSize: '1rem' }}
          >
            Sí, hacerlo combo →
          </Button>

          <Button
            onClick={handleReject}
            variant="secondary"
            fullWidth
            style={{ padding: '0.7rem', color: 'var(--text-muted)' }}
          >
            {offer.rejectLabel || 'No, gracias'}
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes upsellFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
