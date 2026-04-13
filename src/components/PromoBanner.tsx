'use client';

import { memo, useState, useEffect } from 'react';
import { getActivePromos, type Promo } from '@/lib/promos';
import { products } from '@/data/products';
import type { Product } from '@/data/products';

interface PromoBannerProps {
  onAdd: (product: Product) => void;
}

function PromoBannerComponent({ onAdd }: PromoBannerProps) {
  const [activePromos, setActivePromos] = useState<Promo[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const check = () => {
      setActivePromos(getActivePromos());
    };
    check();
    const interval = setInterval(check, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for urgency
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${mins}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, []);

  if (activePromos.length === 0) return null;

  const promo = activePromos[0]; // Show first active promo
  if (dismissed[promo.id]) return null;

  const savings = promo.originalPrice - promo.promoPrice;

  // Find matching product
  let targetProduct: Product | null = null;
  if (promo.id === 'promo_combo_911') {
    targetProduct = products.find(p => p.name === '🔥 Combo 911') ?? null;
  } else if (promo.id === 'promo_boneless_tuesday') {
    targetProduct = products.find(p => p.name === 'Boneless Clásico') ?? null;
  } else if (promo.id === 'promo_callejero') {
    targetProduct = products.find(p => p.name === '🌮 Combo Callejero') ?? null;
  } else if (promo.id === 'promo_2x1_papas') {
    targetProduct = products.find(p => p.name === 'Papas Loaded') ?? null;
  }

  const handleClaim = () => {
    if (!targetProduct) return;
    // Add at promo price (we'll handle this via cart)
    onAdd(targetProduct);
  };

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(255,69,0,0.15), rgba(255,69,0,0.05))',
      border: '1px solid rgba(255,69,0,0.3)',
      borderRadius: '14px',
      padding: '1rem 1.25rem',
      margin: '1rem 1.5rem',
      maxWidth: '600px',
      animation: 'promoPulse 2s ease-in-out infinite',
    }}>
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(prev => ({ ...prev, [promo.id]: true }))}
        style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'none', border: 'none',
          color: '#888', fontSize: '0.9rem',
          cursor: 'pointer', padding: '0.2rem',
        }}
      >
        ✕
      </button>

      {/* Badge */}
      <div style={{
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        background: 'linear-gradient(135deg, #FF4500, #FF6500)',
        borderRadius: '6px',
        fontSize: '0.6rem',
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '0.1em',
        marginBottom: '0.5rem',
      }}>
        {promo.badge}
      </div>

      {/* Content */}
      <div style={{ marginBottom: '0.5rem' }}>
        <h3 style={{
          margin: '0 0 0.25rem',
          fontSize: '1.1rem',
          fontWeight: 800,
          color: '#fff',
        }}>
          {promo.title}
        </h3>
        <p style={{
          margin: 0,
          fontSize: '0.78rem',
          color: '#888',
          lineHeight: 1.4,
        }}>
          {promo.description}
        </p>
      </div>

      {/* Price + Urgency */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.8rem',
            color: '#555',
            textDecoration: 'line-through',
          }}>
            ${promo.originalPrice}
          </span>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: '#FF4500',
          }}>
            ${promo.promoPrice}
          </span>
          <span style={{
            padding: '0.15rem 0.5rem',
            background: 'rgba(34,197,94,0.15)',
            borderRadius: '6px',
            fontSize: '0.65rem',
            fontWeight: 800,
            color: '#22c55e',
          }}>
            -${savings}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.7rem',
            color: '#FFB800',
            fontWeight: 700,
          }}>
            {promo.urgency}
            {timeLeft && ` · ${timeLeft}`}
          </span>
          <button
            onClick={handleClaim}
            disabled={!targetProduct}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: targetProduct ? 'pointer' : 'not-allowed',
              boxShadow: '0 0 16px rgba(255,69,0,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            ¡Lo quiero! 🔥
          </button>
        </div>
      </div>

      <style>{`
        @keyframes promoPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,69,0,0.1); }
          50% { box-shadow: 0 0 30px rgba(255,69,0,0.2); }
        }
      `}</style>
    </div>
  );
}

const PromoBanner = memo(PromoBannerComponent);

export default PromoBanner;
