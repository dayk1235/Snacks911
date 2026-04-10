'use client';

import { memo, useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import FireCanvas from './FireCanvas';
import { AdminStore } from '@/lib/adminStore';
import type { BusinessSettings } from '@/lib/adminTypes';

gsap.registerPlugin(SplitText);

const DEFAULT_SETTINGS: Partial<BusinessSettings> = {
  whatsappNumber: '5215551234567',
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

function HeroSection() {
  const [siteSettings, setSiteSettings] = useState<Partial<BusinessSettings>>(DEFAULT_SETTINGS);
  const containerRef = useRef<HTMLElement>(null);
  const badgeRef     = useRef<HTMLDivElement>(null);
  const dotRef       = useRef<HTMLSpanElement>(null);
  const headlineRef  = useRef<HTMLHeadingElement>(null);
  const line1Ref     = useRef<HTMLSpanElement>(null);
  const line2Ref     = useRef<HTMLSpanElement>(null);
  const subtitleRef  = useRef<HTMLParagraphElement>(null);
  const ctasRef      = useRef<HTMLDivElement>(null);
  const statsRef     = useRef<HTMLDivElement>(null);
  const arrowRef     = useRef<HTMLDivElement>(null);
  const orb1Ref      = useRef<HTMLDivElement>(null);
  const orb2Ref      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AdminStore.getSettings()
      .then(s => setSiteSettings(s))
      .catch(() => { /* ignore, fallback to defaults */ });
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Badge entrance
      tl.from(badgeRef.current, { opacity: 0, y: 16, duration: 0.45 });

      // SplitText on line 1: "TU ANTOJO" — char by char reveal
      if (line1Ref.current) {
        const split1 = new SplitText(line1Ref.current, { type: 'chars' });
        tl.from(
          split1.chars,
          {
            opacity: 0,
            y: 40,
            rotationX: -60,
            stagger: 0.035,
            duration: 0.6,
            ease: 'back.out(1.5)',
            transformOrigin: 'top center',
          },
          '-=0.1'
        );
      }

      // Line 2: fire gradient block
      tl.from(
        line2Ref.current,
        { opacity: 0, y: 30, duration: 0.6, ease: 'power4.out' },
        '-=0.35'
      );

      // Subtitle, CTAs, Stats
      tl.from(subtitleRef.current, { opacity: 0, y: 14, duration: 0.5 }, '-=0.3')
        .from(
          ctasRef.current ? Array.from(ctasRef.current.children) : [],
          { opacity: 0, y: 14, duration: 0.4, stagger: 0.08 },
          '-=0.25'
        )
        .from(
          statsRef.current ? Array.from(statsRef.current.children) : [],
          { opacity: 0, y: 8, duration: 0.35, stagger: 0.08 },
          '-=0.15'
        );

      // Pulsing live dot
      gsap.to(dotRef.current, {
        opacity: 0.2, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut',
      });

      // Orb breathe — subtle
      gsap.to(orb1Ref.current, { scale: 1.15, opacity: 0.45, duration: 5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to(orb2Ref.current, { scale: 1.1,  opacity: 0.35, duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.5 });

      // Scroll arrow
      gsap.to(arrowRef.current, { y: 6, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCtaEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
    if (e.currentTarget.id === 'hero-cta-menu') {
      gsap.to(e.currentTarget, { boxShadow: '0 0 24px rgba(255,69,0,0.6), 0 0 48px rgba(255,69,0,0.2)', duration: 0.25 });
    }
  };
  const handleCtaLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      boxShadow: e.currentTarget.id === 'hero-cta-menu' ? '0 0 16px rgba(255,69,0,0.25)' : 'none',
      duration: 0.22, ease: 'power2.out',
    });
  };

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
      <div ref={orb1Ref} style={{ position: 'absolute', top: '18%', left: '8%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,69,0,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(35px)', pointerEvents: 'none' }} />
      <div ref={orb2Ref} style={{ position: 'absolute', bottom: '22%', right: '8%', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* ── Main content ──── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, padding: 'clamp(96px, 14vh, 130px) 1.5rem 2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '860px', width: '100%' }}>
          {/* Live pill */}
          <div
            ref={badgeRef}
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
            <span ref={dotRef} style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#FF4500', flexShrink: 0 }} />
            {siteSettings.heroBadgeText ?? 'Abierto ahora · Entrega en ~30 min'}
          </div>

          {/* Headline — Bebas Neue display font */}
          <h1
            ref={headlineRef}
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
            <span ref={line1Ref} style={{ color: '#FFFFFF', display: 'block' }}>TU ANTOJO</span>
            <span ref={line2Ref} className="fire-text" style={{ display: 'block' }}>
              DE EMERGENCIA
            </span>
          </h1>

          {/* Subtitle — Inter body font */}
          <p
            ref={subtitleRef}
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

          {/* CTAs */}
          <div ref={ctasRef} style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
            <a
              id="hero-cta-menu" href="#menu"
              onMouseEnter={handleCtaEnter} onMouseLeave={handleCtaLeave}
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
              }}
            >
              🍗 Ver Menú
            </a>
            <a
              id="hero-cta-whatsapp"
              href={`https://wa.me/${siteSettings.whatsappNumber ?? '5215551234567'}`} target="_blank" rel="noopener noreferrer"
              onMouseEnter={handleCtaEnter} onMouseLeave={handleCtaLeave}
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.7)', padding: '1rem 2.5rem',
                borderRadius: '14px', fontWeight: 600,
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              📱 WhatsApp
            </a>
          </div>

          {/* Delivery apps strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.6rem', flexWrap: 'wrap',
            marginBottom: '3rem',
          }}>
            <span style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)',
              fontFamily: 'var(--font-body)', fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginRight: '0.25rem',
            }}>
              También en
            </span>
            {(siteSettings.deliveryApps ?? DEFAULT_SETTINGS.deliveryApps ?? []).filter(a => a.enabled).map(app => (
              <a
                key={app.name}
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background   = `${app.color}18`;
                  el.style.borderColor  = `${app.color}55`;
                  el.style.color        = '#fff';
                  el.style.transform    = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background   = 'rgba(255,255,255,0.04)';
                  el.style.borderColor  = 'rgba(255,255,255,0.09)';
                  el.style.color        = 'rgba(255,255,255,0.5)';
                  el.style.transform    = 'translateY(0)';
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.4rem 1rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.78rem', fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.22s ease',
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{app.icon}</span>
                {app.name}
              </a>
            ))}
          </div>


          <div ref={statsRef} style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
          <div ref={arrowRef} style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1rem', userSelect: 'none' }}>↓</div>
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
            {['🍗 Alitas BBQ', '🔥 Boneless Picante', '🍟 Papas Loaded', '🚨 Combo 911', '⚡ Entrega Rápida', '🌶️ Sabor Extremo'].map((item) => (
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
