'use client';

import { memo, useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { AdminStore } from '@/lib/adminStore';
import type { BusinessSettings } from '@/lib/adminTypes';

const FireCanvas = dynamic(() => import('./FireCanvas'), { ssr: false });


import type { Product } from '@/data/products';
import { products } from '@/data/products';

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
  deliveryApps: [
    { name: 'Uber Eats', href: 'https://ubereats.com',  icon: '🟢', color: '#06C167', enabled: true },
    { name: 'Rappi',     href: 'https://rappi.com',      icon: '🟠', color: '#FF441A', enabled: true },
    { name: 'DiDi Food', href: 'https://didiglobal.com', icon: '🟡', color: '#FF6E20', enabled: true },
  ],
};

function HeroSection({ featuredProduct, onOrderFeatured }: HeroProps = {}) {
  const [siteSettings, setSiteSettings] = useState<Partial<BusinessSettings>>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  const combos = products.filter(p => p.category === 'combos');
  const topCombo = combos.find(p => p.badges?.some(b => b.includes('Más pedido'))) ?? combos[0];

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    AdminStore.getSettings()
      .then(s => setSiteSettings(s))
      .catch(() => { /* ignore, fallback to defaults */ });
  }, []);


  return (
    <section
      ref={containerRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#080808',
      }}
    >
      {/* Background layers — reduced blur for cleaner look */}
      <FireCanvas />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/images/hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.12 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, rgba(255,69,0,0.08) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,8,8,0.45) 0%, rgba(8,8,8,0.6) 60%, #080808 100%)' }} />

      {/* Glow orbs — reduced intensity */}
      <div style={{ position: 'absolute', top: '18%', left: '8%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,69,0,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(35px)', pointerEvents: 'none', animation: 'heroOrb1 5s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '22%', right: '8%', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none', animation: 'heroOrb2 6s ease-in-out 1.5s infinite' }} />

      {/* ── Main content ──── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, padding: 'clamp(96px, 14vh, 130px) 1.5rem 2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '860px', width: '100%' }}>
          {/* Live pill — single stable element, dynamic props applied post-mount only */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,69,0,0.08)',
              border: '1px solid rgba(255,69,0,0.22)',
              borderRadius: '50px',
              padding: '0.45rem 1.25rem',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-body)',
              color: '#FF7040',
              fontWeight: 600,
              marginBottom: '2rem',
              letterSpacing: '0.05em',
            }}
          >
            <span style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#FF4500',
              flexShrink: 0,
              animation: 'heroDotBlink 1.4s ease-in-out infinite',
            }} />
            <span suppressHydrationWarning>
              {mounted
                ? (siteSettings.heroBadgeText ?? 'Abierto ahora · Entrega en ~30 min')
                : 'Abierto ahora · Entrega en ~30 min'}
            </span>
          </div>

          {/* Headline — Bebas Neue display font */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.5rem, 10vw, 8rem)',
              fontWeight: 400,  /* Bebas Neue only has 400 weight */
              lineHeight: 0.92,
              letterSpacing: '0.04em',
              marginBottom: '1.5rem',
              perspective: '800px',
            }}
          >
            <span style={{ color: '#FFFFFF', display: 'block' }}>TU ANTOJO</span>
            <span className="fire-text" style={{ display: 'block' }}>
              DE EMERGENCIA
            </span>
          </h1>

          {/* Subtitle — Inter body font */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.45)',
              maxWidth: '460px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Alitas, Boneless y Papas que te van a dejar sin palabras.
            <br />
            Solo cuando el antojo no puede esperar.
          </p>

          {/* Featured Combo Card */}
          <div style={{ marginBottom: '1.5rem' }}>
            {featuredProduct && onOrderFeatured ? (
              <div style={{
                maxWidth: '380px', margin: '0 auto',
                background: 'rgba(20,20,20,0.88)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1.5px solid rgba(255,69,0,0.25)',
                borderRadius: '18px',
                padding: '1.1rem',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 30px rgba(255,69,0,0.08)',
              }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '12px',
                    overflow: 'hidden', flexShrink: 0, background: '#1a1a1a',
                  }}>
                    <Image
                      src={featuredProduct.image}
                      alt={featuredProduct.name}
                      width={72}
                      height={72}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      priority
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.6rem', color: '#FF4500', fontWeight: 700,
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                    }}>
                      Mas pedido
                    </span>
                    <h3 style={{
                      fontSize: '1.05rem', fontWeight: 800, color: '#FFB800',
                      margin: '0.15rem 0 0', lineHeight: 1.2,
                      fontFamily: 'var(--font-body)',
                    }}>
                      {featuredProduct.name}
                    </h3>
                    <p style={{
                      fontSize: '0.7rem', color: '#666', margin: '0.15rem 0 0',
                      lineHeight: 1.35,
                    }}>
                      {featuredProduct.description}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '1.5rem', fontWeight: 900, color: '#FF4500',
                      display: 'block', lineHeight: 1,
                    }}>
                      ${featuredProduct.price}
                    </span>
                  </div>
                </div>
                <button
                  id="hero-cta-order"
                  onClick={onOrderFeatured}
                  style={{
                    width: '100%', padding: '0.8rem',
                    background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                    border: 'none', borderRadius: '12px',
                    color: '#fff', fontWeight: 800, fontSize: '0.92rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    boxShadow: '0 4px 16px rgba(255,69,0,0.3)',
                    letterSpacing: '0.02em',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  Pedir Combo 🔥
                </button>
              </div>
            ) : (
              /* Fallback: original CTAs when no featured product */
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  id="hero-cta-menu" href="#menu"
                  className="glow-btn"
                  style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                    color: '#fff', padding: '1rem 2.5rem',
                    borderRadius: '14px', fontWeight: 700,
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.95rem', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: '0 0 16px rgba(255,69,0,0.25)',
                    letterSpacing: '0.02em',
                    transition: 'transform 0.18s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  Ver Menu
                </a>
                <a
                  id="hero-cta-whatsapp"
                  href={`https://wa.me/${(siteSettings.whatsappNumber || '525584507458').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.7)', padding: '1rem 2.5rem',
                    borderRadius: '14px', fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.95rem', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(8px)',
                    transition: 'transform 0.18s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  WhatsApp
                </a>
              </div>
            )}

            {/* Fast decision buttons */}
            {combos.length > 0 && featuredProduct && (
              <div style={{
                maxWidth: '460px',
                margin: '0 auto 1.5rem',
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}>
                {combos.slice(0, 3).map(combo => {
                  const isTop = combo.badges?.some(b => b.includes('Más pedido'));
                  const badge = isTop ? '🔥 Más vendido' : combo.badges?.[0] ?? '⚡ Combo';
                  return (
                    <button
                      key={combo.id}
                      onClick={() => {
                        // Add to cart and open it
                        if (onOrderFeatured && combo === topCombo) {
                          onOrderFeatured();
                        }
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: isTop
                          ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                          : 'rgba(255,255,255,0.06)',
                        border: isTop ? 'none' : '1px solid rgba(255,69,0,0.2)',
                        borderRadius: '50px',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        transition: 'all 0.2s',
                        boxShadow: isTop ? '0 0 16px rgba(255,69,0,0.25)' : 'none',
                      }}
                    >
                      {badge}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Secondary link */}
            {!featuredProduct && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <a
                  href="/menu"
                  style={{
                    color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
                    fontSize: '0.82rem', fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF4500'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  O explora el menu completo →
                </a>
              </div>
            )}
            {featuredProduct && (
              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <a
                  href="/menu"
                  style={{
                    color: 'rgba(255,255,255,0.3)', textDecoration: 'none',
                    fontSize: '0.78rem', fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF4500'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}
                >
                  Ver menu completo →
                </a>
              </div>
            )}
          </div>


          <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {(siteSettings.heroStats ?? DEFAULT_SETTINGS.heroStats ?? []).map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FF4500' }}>
                  {stat.value}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: only scroll arrow (ticker moved to fixed TickerBar) ── */}
      <div style={{ position: 'relative', zIndex: 20, flexShrink: 0, paddingBottom: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '0.5rem' }}>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1rem', userSelect: 'none', animation: 'heroArrowBounce 1.8s ease-in-out infinite' }}>↓</div>
        </div>
      </div>
    </section>
  );
}

const Hero = memo(HeroSection);

export default Hero;

/* ── Fixed Ticker Bar — lives above all gsap-panels ─────────────────────── */
export const TickerBar = memo(function TickerBar() {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 90, // below navbar (100) but above all panels
      background: '#FF4500',
      borderTop: '1px solid rgba(255,255,255,0.15)',
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
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.95)', textTransform: 'uppercase', padding: '0 2rem',
              }}>
                {item}
                <span style={{ marginLeft: '2rem', opacity: 0.35, fontSize: '0.55rem' }}>◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
