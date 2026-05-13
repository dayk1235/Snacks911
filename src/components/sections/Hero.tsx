'use client';

import { memo, useEffect, useState } from 'react';
import { AdminStore } from '@/lib/adminStore';
import type { BusinessSettings } from '@/lib/adminTypes';
import { useStoreSettings } from '@/lib/storeSettingsStore';
import type { Product } from '@/data/products';

interface HeroProps {
  featuredProduct?: Product;
  onOrderFeatured?: () => void;
}

const DEFAULT_SETTINGS: Partial<BusinessSettings> = {
  whatsappNumber: '525584507458',
  heroBadgeText: 'Abierto ahora · Entrega en ~30 min',
  heroStats: [
    { value: '500+', label: 'Pedidos diarios' },
    { value: '4.9★', label: 'Calificación' },
    { value: '30min', label: 'Tiempo promedio' },
  ],
};

function HeroSection({ featuredProduct, onOrderFeatured }: HeroProps = {}) {
  const [siteSettings, setSiteSettings] = useState<Partial<BusinessSettings>>(DEFAULT_SETTINGS);
  const { isOpen: storeOpen, closedMessage, heroTitle, heroSubtitle, fetchSettings } = useStoreSettings();

  useEffect(() => {
    AdminStore.getSettings()
      .then(s => setSiteSettings(s))
      .catch(() => { /* ignore, fallback to defaults */ });
    fetchSettings();
  }, [fetchSettings]);

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '28vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 'clamp(80px, 10vh, 110px) 1.5rem 1.5rem',
      }}
    >
      {/* Subtle atmosphere */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(255,69,0,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ textAlign: 'center', maxWidth: '640px', position: 'relative', zIndex: 2 }}>
        {/* Store open/closed pill */}
        <div
          suppressHydrationWarning
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: storeOpen ? 'rgba(255,69,0,0.06)' : 'rgba(239,68,68,0.08)',
            border: storeOpen ? '1px solid rgba(255,69,0,0.12)' : '1px solid rgba(239,68,68,0.15)',
            borderRadius: '50px',
            padding: '0.35rem 1rem',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-body)',
            color: storeOpen ? 'var(--accent)' : 'var(--status-danger)',
            fontWeight: 600,
            marginBottom: '1rem',
            letterSpacing: '0.04em',
          }}
        >
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
            background: storeOpen ? 'var(--accent)' : 'var(--status-danger)',
            boxShadow: storeOpen ? '0 0 5px var(--accent)' : '0 0 5px var(--status-danger)',
            animation: storeOpen ? 'heroPulse 2s ease-in-out infinite' : 'none',
          }} />
          <span suppressHydrationWarning>
            {storeOpen
              ? (siteSettings.heroBadgeText ?? 'Abierto ahora · Entrega en ~30 min')
              : (closedMessage || '🔴 Cerrado por ahora')}
          </span>
        </div>

        {/* Dynamic headline — can later be controlled by chat */}
        <h1
          data-hero-headline
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 6vw, 4.5rem)',
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: '0.03em',
            marginBottom: '0.6rem',
            color: '#FFFFFF',
          }}
        >
          {heroTitle ? (
            <span style={{ whiteSpace: 'pre-line' }}>{heroTitle}</span>
          ) : (
            <>
              <span style={{ display: 'block' }}>TU ANTOJO</span>
              <span className="fire-text" style={{ display: 'block' }}>DE EMERGENCIA</span>
            </>
          )}
        </h1>

        {heroSubtitle && (
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.3)',
            maxWidth: '400px',
            margin: '0 auto 0',
            lineHeight: 1.6,
          }}>
            {heroSubtitle}
          </p>
        )}
      </div>
    </section>
  );
}

const Hero = memo(HeroSection);

export default Hero;

/* ── Fixed Ticker Bar ─────────────────────────────────────────────────────── */
export const TickerBar = memo(function TickerBar() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!ready) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 90,
      background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-gradient) 50%, var(--accent) 100%)',
      backgroundSize: '200% 100%',
      animation: 'moveGradient 4s linear infinite',
      borderTop: '1px solid rgba(255,255,255,0.15)',
      boxShadow: '0 -4px 20px rgba(255,69,0,0.35)',
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      <div className="ticker-track" style={{ display: 'flex', alignItems: 'center', width: 'max-content' }}>
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0.45rem 0' }}>
            {['Alitas BBQ', 'Boneless Picante', 'Papas Loaded', 'Combo 911', 'Entrega Rapida', 'Sabor Extremo'].map((item) => (
              <span key={item} style={{
                display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-body)',
                fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em',
                color: 'var(--text-primary)', textTransform: 'uppercase', padding: '0 2rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}>
                {item}
                <span style={{ marginLeft: '2rem', opacity: 0.6, fontSize: '0.55rem' }}>◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
