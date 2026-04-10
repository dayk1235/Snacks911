'use client';

import { useState, useEffect } from 'react';
import { track } from '@/lib/analytics';
import type { Product } from '@/data/products';

/**
 * UpsellModal — product-level upsell.
 * Fires when user adds boneless or alitas.
 * Offers combo upgrade in one fast tap.
 */
export interface UpsellOffer {
  title: string;
  message: string;
  upsellPrice: number;       // e.g. +$30
  upsellLabel: string;       // e.g. 'Combo 911'
  upsellProductId: number;   // product ID to swap to
  rejectLabel?: string;      // default: 'No, gracias'
}

const OFFERS: Record<string, UpsellOffer> = {
  boneless: {
    title: '🔥 Hazlo combo',
    message: 'Agrega papas + aderezo y conviértelo en combo por solo +$30',
    upsellPrice: 30,
    upsellLabel: 'Combo 911',
    upsellProductId: 7,
  },
  alitas: {
    title: '🍟 Agrégale papas',
    message: 'Completa tu orden con papas por solo +$20',
    upsellPrice: 20,
    upsellLabel: 'Papas Gajo',
    upsellProductId: 5,
  },
};

export default function UpsellModal({
  product,
  onUpgrade,
  onSkip,
}: {
  product: Product;
  onUpgrade: (comboProduct: Product) => void;
  onSkip: () => void;
}) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const offer = OFFERS[product.category];

  useEffect(() => {
    if (!offer) { setShow(false); return; }
    // Don't show again in same session
    if (typeof window !== 'undefined' && sessionStorage.getItem('snacks911_upsell_done')) {
      setShow(false); return;
    }
    // Quick delay so it doesn't block the add animation
    const t = setTimeout(() => {
      setShow(true);
      track('upsell_shown', {
        product_name: product.name,
        category: product.category,
        offer_title: offer.title,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [product, offer]);

  if (!offer || !show || dismissed) return null;

  const handleAccept = () => {
    track('upsell_accepted', {
      product_name: product.name,
      upsell_to: offer.upsellLabel,
      upsell_price: offer.upsellPrice,
    });
    if (typeof window !== 'undefined') sessionStorage.setItem('snacks911_upsell_done', '1');
    onUpgrade({
      id: offer.upsellProductId,
      name: offer.upsellLabel,
      description: 'Tu pedido convertido en combo 🔥',
      price: product.price + offer.upsellPrice,
      category: product.category === 'boneless' ? 'combos' : 'papas',
      image: offer.upsellProductId === 7 ? '/images/combo.webp' : '/images/papas.webp',
    });
    setShow(false);
  };

  const handleReject = () => {
    track('upsell_rejected', {
      product_name: product.name,
      offer_title: offer.title,
    });
    if (typeof window !== 'undefined') sessionStorage.setItem('snacks911_upsell_done', '1');
    setDismissed(true);
    onSkip();
  };

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
        style={{
          width: '100%', maxWidth: '360px',
          background: 'linear-gradient(145deg, #1a1a1a, #111)',
          border: '1px solid rgba(255,69,0,0.2)',
          borderRadius: '24px', padding: '1.75rem 1.5rem',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(255,69,0,0.08)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1 }}>
          {product.category === 'boneless' ? '🔥' : '🍗'}
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
          <button
            onClick={handleAccept}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(255,69,0,0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(255,69,0,0.25)';
            }}
            style={{
              width: '100%',
              padding: '0.95rem',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,69,0,0.25)',
              transition: 'all 0.15s ease',
              fontFamily: 'var(--font-body)',
            }}
          >
            Sí, hacerlo combo →
          </button>

          <button
            onClick={handleReject}
            style={{
              width: '100%',
              padding: '0.7rem',
              borderRadius: '10px',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#555',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {offer.rejectLabel || 'No, gracias'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes upsellFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
