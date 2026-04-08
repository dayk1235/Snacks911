'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface NavbarProps {
  cartCount: number;
  onCartOpen: () => void;
}

export default function Navbar({ cartCount, onCartOpen }: NavbarProps) {
  const navRef     = useRef<HTMLElement>(null);
  const logoRef    = useRef<HTMLDivElement>(null);
  const sirenRef   = useRef<HTMLSpanElement>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const badgeRef   = useRef<HTMLSpanElement>(null);
  const prevCount  = useRef(0);

  /* ── Entrance ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, { y: -80, opacity: 0, duration: 0.6, ease: 'power3.out' });
    });
    return () => ctx.revert();
  }, []);

  /* ── Smart scroll ─────────────────────────────────────────────────────── */
  useEffect(() => {
    let lastScroll = 0;
    let ticking = false;
    const THRESHOLD = 80;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const curr = window.scrollY;
        if (curr < THRESHOLD) {
          gsap.to(navRef.current, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
        } else if (curr > lastScroll) {
          gsap.to(navRef.current, { y: -90, opacity: 0, duration: 0.35, ease: 'power2.inOut', overwrite: 'auto' });
        } else {
          gsap.to(navRef.current, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
        }
        lastScroll = Math.max(0, curr);
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── 🚨 Siren animation on the emoji icon ─────────────────────────────── */
  useEffect(() => {
    if (!sirenRef.current) return;

    // Realistic double-flash siren: flash → off → flash → long pause
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
    tl
      .to(sirenRef.current, {
        filter: 'brightness(1.5) drop-shadow(0 0 10px rgba(255,69,0,1)) drop-shadow(0 0 22px rgba(255,69,0,0.6))',
        duration: 0.1,
        ease: 'power2.in',
      })
      .to(sirenRef.current, {
        filter: 'brightness(1) drop-shadow(0 0 0px transparent)',
        duration: 0.28,
        ease: 'power2.out',
      })
      .to(sirenRef.current, {
        filter: 'brightness(1.4) drop-shadow(0 0 8px rgba(255,184,0,0.9)) drop-shadow(0 0 18px rgba(255,100,0,0.5))',
        duration: 0.1,
        ease: 'power2.in',
      })
      .to(sirenRef.current, {
        filter: 'brightness(1) drop-shadow(0 0 0px transparent)',
        duration: 0.42,
        ease: 'power2.out',
      });

    // Subtle overall logo breathe
    gsap.to(logoRef.current, {
      scale: 1.022,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    return () => { tl.kill(); };
  }, []);

  /* ── Badge pop ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (cartCount > 0 && badgeRef.current) {
      gsap.fromTo(
        badgeRef.current,
        { scale: prevCount.current === 0 ? 0 : 0.8, opacity: prevCount.current === 0 ? 0 : 1 },
        { scale: 1, opacity: 1, duration: 0.38, ease: 'back.out(1.7)' }
      );
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  return (
    <nav
      ref={navRef}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.9rem 2rem',
        background: 'rgba(6,6,6,0.9)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderBottom: '1px solid rgba(255,100,0,0.1)',
      }}
    >
      {/* ── Logo: siren + Bebas Neue wordmark ───────────────────────────── */}
      <div
        ref={logoRef}
        style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'default' }}
        onMouseEnter={() => gsap.to(logoRef.current, { scale: 1.04, duration: 0.2, ease: 'power2.out' })}
        onMouseLeave={() => gsap.to(logoRef.current, { scale: 1,    duration: 0.2, ease: 'power2.out' })}
      >
        {/* Siren — GSAP double-flash target */}
        <span
          ref={sirenRef}
          style={{ fontSize: '1.9rem', lineHeight: 1, display: 'block', willChange: 'filter' }}
        >
          🚨
        </span>

        {/* Bebas Neue wordmark — single bold line */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.18em' }}>
          <span
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '2rem',
              letterSpacing: '0.06em',
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            SNACKS
          </span>
          <span
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '2rem',
              letterSpacing: '0.04em',
              lineHeight: 1,
              background: 'linear-gradient(90deg, #FF4500 0%, #FFB800 55%, #FF6A00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            911
          </span>
        </div>
      </div>

      {/* ── Nav links + cart ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {['Menú', 'Combos', 'Contacto'].map((link) => (
          <a
            key={link}
            href={link === 'Menú' || link === 'Combos' ? '#menu' : '#footer'}
            className="nav-link"
            style={{
              fontFamily: 'var(--font-body)',
              color: '#666',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              position: 'relative',
            }}
            onMouseEnter={(e) => gsap.to(e.currentTarget, { color: '#ffffff', duration: 0.2 })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { color: '#666666', duration: 0.2 })}
          >
            {link}
          </a>
        ))}

        {/* Cart */}
        <button
          id="cart-button"
          ref={cartBtnRef}
          onClick={() => {
            gsap.fromTo(cartBtnRef.current, { scale: 0.93 }, { scale: 1, duration: 0.28, ease: 'elastic.out(1, 0.5)' });
            onCartOpen();
          }}
          onMouseEnter={() => gsap.to(cartBtnRef.current, { scale: 1.06, duration: 0.18, ease: 'power2.out' })}
          onMouseLeave={() => gsap.to(cartBtnRef.current, { scale: 1,    duration: 0.18, ease: 'power2.out' })}
          style={{
            fontFamily: 'var(--font-body)',
            position: 'relative',
            background: 'linear-gradient(135deg, #FF4500, #FF6500)',
            border: 'none',
            borderRadius: '12px',
            padding: '0.55rem 1.25rem',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 0 16px rgba(255,69,0,0.2)',
            letterSpacing: '0.02em',
          }}
        >
          🛒 Carrito
          {cartCount > 0 && (
            <span
              ref={badgeRef}
              style={{
                position: 'absolute',
                top: '-9px', right: '-9px',
                background: '#FFB800',
                color: '#000',
                borderRadius: '50%',
                width: '22px', height: '22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 900,
                boxShadow: '0 0 12px rgba(255,184,0,0.6)',
              }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
