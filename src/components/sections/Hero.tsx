'use client';

import { memo, useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { AdminStore } from '@/lib/adminStore';
import type { BusinessSettings } from '@/lib/adminTypes';
import { useStoreSettings } from '@/lib/storeSettingsStore';

const FireCanvas = dynamic(() => import('../effects/FireCanvas'), { ssr: false });


import type { Product } from '@/data/products';
import { products, getProductImage } from '@/data/products';

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
  const containerRef = useRef<HTMLElement>(null);

  // Store settings from Zustand (fetched globally or on mount)
  const { isOpen: storeOpen, closedMessage, heroTitle, heroSubtitle, fetchSettings } = useStoreSettings();

  const combos = products.filter(p => p.category === 'combos');
  const topCombo = combos.find(p => p.badges?.some(b => b.includes('Más pedido'))) ?? combos[0];

  useEffect(() => {
    AdminStore.getSettings()
      .then(s => setSiteSettings(s))
      .catch(() => { /* ignore, fallback to defaults */ });

    fetchSettings();
  }, [fetchSettings]);

  return (
    <section
      ref={containerRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Background layers — reduced blur for cleaner look */}
      <FireCanvas />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/images/hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.12 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, rgba(255,69,0,0.08) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,8,8,0.45) 0%, rgba(8,8,8,0.6) 60%, #080808 100%)' }} />

      {/* Glow orbs — reduced intensity */}
      <div className="hero-orb-1" />
      <div className="hero-orb-2" />

      {/* ── Main content ──── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, padding: 'clamp(96px, 14vh, 130px) 1.5rem 2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '860px', width: '100%' }}>
          {/* Live pill — shows open/closed status from DB */}
          <div
            suppressHydrationWarning
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: storeOpen ? 'rgba(255,69,0,0.08)' : 'rgba(239,68,68,0.1)',
              border: storeOpen ? '1px solid var(--border-subtle)' : '1px solid var(--status-danger)',
              borderRadius: '50px',
              padding: '0.45rem 1.25rem',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-body)',
              color: storeOpen ? 'var(--accent)' : 'var(--status-danger)',
              fontWeight: 600,
              marginBottom: '2rem',
              letterSpacing: '0.05em',
            }}
          >
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
              background: storeOpen ? 'var(--accent)' : 'var(--status-danger)',
              boxShadow: storeOpen ? '0 0 6px var(--accent)' : '0 0 6px var(--status-danger)',
              animation: storeOpen ? 'heroPulse 2s ease-in-out infinite' : 'none',
            }} />
            <span suppressHydrationWarning>
              {storeOpen
                ? (siteSettings.heroBadgeText ?? 'Abierto ahora · Entrega en ~30 min')
                : '🔴 Cerrado por ahora'}
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
            {heroTitle ? (
              <span className="fire-text" style={{ display: 'block', whiteSpace: 'pre-line' }}>{heroTitle}</span>
            ) : (
              <>
                <span style={{ color: '#FFFFFF', display: 'block' }}>TU ANTOJO</span>
                <span className="fire-text" style={{ display: 'block' }}>
                  DE EMERGENCIA
                </span>
              </>
            )}
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
              whiteSpace: 'pre-line'
            }}
          >
            {heroSubtitle || "Alitas, Boneless y Papas que te van a dejar sin palabras.\nSolo cuando el antojo no puede esperar."}
          </p>

          {/* Featured Combo Card */}
          <div style={{ marginBottom: '1.5rem' }}>
            {featuredProduct && onOrderFeatured ? (
              <div className="card-premium" style={{
                maxWidth: '380px', margin: '0 auto',
                padding: '1.1rem',
                border: '1.5px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
              }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '12px',
                    overflow: 'hidden', flexShrink: 0, background: '#1a1a1a',
                  }}>
                    <Image
                      src={getProductImage(featuredProduct)}
                      alt={featuredProduct.name}
                      width={72}
                      height={72}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      priority
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {featuredProduct && (() => {
                      const isBest = featuredProduct.popular || featuredProduct.badges?.some(b => b.includes('vendido') || b.includes('pedido'));
                      const savings = featuredProduct.originalPrice ? featuredProduct.originalPrice - featuredProduct.price : 0;
                      
                      let label = isBest ? "⭐ Más pedido" : savings > 0 ? `💰 Ahorra $${savings}` : null;
                      if (!label) return null;

                      return (
                        <span style={{
                          fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 700,
                          letterSpacing: '0.15em', textTransform: 'uppercase',
                        }}>
                          {label}
                        </span>
                      );
                    })()}
                    <h3 style={{
                      fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-gold)',
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
                      fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)',
                      display: 'block', lineHeight: 1,
                    }}>
                      ${featuredProduct.price}
                    </span>
                  </div>
                </div>
                <Button
                  id="hero-cta-order"
                  onClick={storeOpen ? onOrderFeatured : undefined}
                  disabled={!storeOpen}
                  title={storeOpen ? '' : closedMessage || 'Estamos cerrados'}
                  variant={storeOpen ? 'primary' : 'secondary'}
                  fullWidth
                >
                  {storeOpen ? '🔥 Pedir ahora' : '🔴 Cerrado por ahora'}
                </Button>
              </div>
            ) : (
              /* Fallback CTAs — closed state shows banner */
              !storeOpen ? (
                <div style={{
                  maxWidth: '400px', margin: '0 auto',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid var(--status-danger)',
                  borderRadius: '16px', padding: '1.25rem 1.5rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔴</div>
                  <p style={{ color: 'var(--status-danger)', fontWeight: 700, fontSize: '1rem', margin: '0 0 0.4rem' }}>Estamos cerrados</p>
                  <p style={{ color: '#888', fontSize: '0.82rem', margin: 0 }}>{closedMessage || '¡Vuelve pronto!'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    id="hero-cta-menu" href="#menu"
                    className="glow-btn"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent), var(--accent-gradient))',
                      color: 'var(--text-primary)', padding: '1rem 2.5rem',
                      borderRadius: '12px', fontWeight: 700,
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.95rem', textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      boxShadow: '0 0 16px rgba(255,69,0,0.25)', letterSpacing: '0.02em',
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
              )
            )}
          </div>

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
                    <Button
                      key={combo.id}
                      onClick={() => {
                        if (onOrderFeatured && combo === topCombo) {
                          onOrderFeatured();
                        }
                      }}
                      variant={isTop ? 'primary' : 'secondary'}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '50px',
                        fontSize: '0.72rem',
                      }}
                    >
                      {badge}
                    </Button>
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
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
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
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                >
                  Ver menu completo →
                </a>
              </div>
            )}


          <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {(siteSettings.heroStats ?? DEFAULT_SETTINGS.heroStats ?? []).map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: 'var(--accent)' }}>
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
          <div className="hero-arrow-bounce">↓</div>
        </div>
      </div>
    </section>
  );
}

const Hero = memo(HeroSection);

export default Hero;

/* ── Fixed Ticker Bar — lives above all gsap-panels ─────────────────────── */
export const TickerBar = memo(function TickerBar() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 90, // below navbar (100) but above all panels
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
