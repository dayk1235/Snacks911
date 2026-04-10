'use client';

import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

interface NavbarProps {
  cartCount: number;
  onCartOpen: () => void;
}

export default function Navbar({ cartCount, onCartOpen }: NavbarProps) {
  const navRef      = useRef<HTMLElement>(null);
  const logoRef     = useRef<HTMLDivElement>(null);
  const sirenRef    = useRef<SVGGElement>(null);
  const cartBtnRef  = useRef<HTMLButtonElement>(null);
  const badgeRef    = useRef<HTMLSpanElement>(null);
  const prevCount   = useRef(0);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  /* ── Entrance ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, { y: -80, opacity: 0, duration: 0.6, ease: 'power3.out' });
    });
    return () => ctx.revert();
  }, []);

  /* ── Smart scroll ──────────────────────────────────────────────────────── */
  useEffect(() => {
    let lastScroll = 0;
    let ticking = false;
    const THRESHOLD = 80;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (!navRef.current) { ticking = false; return; }
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

  /* ── 🚨 Siren animation ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!sirenRef.current) return;
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
    tl
      .to(sirenRef.current, {
        filter: 'brightness(1.5) drop-shadow(0 0 10px rgba(255,69,0,1)) drop-shadow(0 0 22px rgba(255,69,0,0.6))',
        duration: 0.1, ease: 'power2.in',
      })
      .to(sirenRef.current, {
        filter: 'brightness(1) drop-shadow(0 0 0px transparent)',
        duration: 0.28, ease: 'power2.out',
      })
      .to(sirenRef.current, {
        filter: 'brightness(1.4) drop-shadow(0 0 8px rgba(255,184,0,0.9)) drop-shadow(0 0 18px rgba(255,100,0,0.5))',
        duration: 0.1, ease: 'power2.in',
      })
      .to(sirenRef.current, {
        filter: 'brightness(1) drop-shadow(0 0 0px transparent)',
        duration: 0.42, ease: 'power2.out',
      });

    gsap.to(logoRef.current, {
      scale: 1.022, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });

    return () => { tl.kill(); };
  }, []);

  /* ── Badge pop ──────────────────────────────────────────────────────────── */
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

  /* ── Mobile menu animation ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!mobileMenuRef.current) return;
    if (menuOpen) {
      gsap.fromTo(mobileMenuRef.current,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' }
      );
    } else {
      gsap.to(mobileMenuRef.current, { opacity: 0, y: -8, duration: 0.2, ease: 'power2.in' });
    }
  }, [menuOpen]);

  const navLinks = ['Menú', 'Combos', 'Contacto'];

  return (
    <nav
      ref={navRef}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        padding: '0.9rem 2rem',
        background: 'rgba(6,6,6,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,100,0,0.12)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Logo */}
        <div
          ref={logoRef}
          style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}
          onMouseEnter={() => gsap.to(logoRef.current, { scale: 1.04, duration: 0.2, ease: 'power2.out' })}
          onMouseLeave={() => gsap.to(logoRef.current, { scale: 1,    duration: 0.2, ease: 'power2.out' })}
        >
          <svg
            width="248"
            height="72"
            viewBox="0 0 900 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Snacks 911"
            style={{ display: 'block', width: 'clamp(180px, 22vw, 248px)', height: 'auto', overflow: 'visible' }}
          >
            <g ref={sirenRef} style={{ willChange: 'filter', transformBox: 'fill-box', transformOrigin: 'center' }}>
              <g transform="translate(430 28)">
                <rect x="12" y="58" width="76" height="18" rx="9" fill="#2F2F2F"/>
                <path d="M28 20C28 8.9543 36.9543 0 48 0H52C63.0457 0 72 8.95431 72 20V58H24L28 20Z" fill="#E53935"/>
                <path d="M48 12C52 12 55 9 55 5" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                <path d="M48 12V42" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                <path d="M8 34L-10 24" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                <path d="M4 48L-18 48" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                <path d="M92 34L110 24" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                <path d="M96 48L118 48" stroke="white" strokeWidth="6" strokeLinecap="round"/>
              </g>
            </g>

            <text
              x="160"
              y="170"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="92"
              fontWeight="900"
              fill="#F5F5F5"
              letterSpacing="-2"
            >
              SNACKS
            </text>

            <text
              x="535"
              y="172"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="102"
              fontWeight="900"
              fill="#FFC400"
            >
              911
            </text>

            <line x1="165" y1="210" x2="275" y2="210" stroke="white" strokeWidth="5" strokeLinecap="round"/>
            <line x1="625" y1="210" x2="735" y2="210" stroke="white" strokeWidth="5" strokeLinecap="round"/>

            <text
              x="450"
              y="220"
              textAnchor="middle"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="30"
              fontWeight="700"
              fill="white"
              letterSpacing="2"
            >
              URGENCIA DE ANTOJO
            </text>
          </svg>
        </div>

        {/* ── Desktop nav ────────────────────────────────────────────────── */}
        <div className="hide-mobile" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {navLinks.map((link) => (
            <a
              key={link}
              href={link === 'Menú' || link === 'Combos' ? '#menu' : '#contact'}
              className="nav-link"
              style={{
                fontFamily: 'var(--font-body)', color: '#666',
                textDecoration: 'none', fontSize: '0.85rem',
                fontWeight: 500, letterSpacing: '0.04em', position: 'relative',
              }}
              onMouseEnter={(e) => gsap.to(e.currentTarget, { color: '#ffffff', duration: 0.2 })}
              onMouseLeave={(e) => gsap.to(e.currentTarget, { color: '#666666', duration: 0.2 })}
            >
              {link}
            </a>
          ))}

          {/* Cart button */}
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
              fontFamily: 'var(--font-body)', position: 'relative',
              background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none', borderRadius: '12px', padding: '0.55rem 1.25rem',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              boxShadow: '0 0 16px rgba(255,69,0,0.2)', letterSpacing: '0.02em',
            }}
          >
            🛒 Carrito
            {cartCount > 0 && (
              <span
                ref={badgeRef}
                style={{
                  position: 'absolute', top: '-9px', right: '-9px',
                  background: '#FFB800', color: '#000',
                  borderRadius: '50%', width: '22px', height: '22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 900, boxShadow: '0 0 12px rgba(255,184,0,0.6)',
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Mobile: Cart icon + Hamburger ──────────────────────────────── */}
        <div className="show-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Mini cart */}
          <button
            onClick={onCartOpen}
            style={{
              position: 'relative', background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none', borderRadius: '10px', padding: '0.5rem 0.75rem',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            🛒
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: '-7px', right: '-7px',
                background: '#FFB800', color: '#000', borderRadius: '50%',
                width: '18px', height: '18px', fontSize: '0.6rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cartCount}
              </span>
            )}
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '0.5rem 0.7rem',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              gap: '4px', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {[0,1,2].map((i) => (
              <span key={i} style={{
                width: '20px', height: '2px',
                background: menuOpen && i === 1 ? 'transparent' : (menuOpen ? '#FF4500' : '#ccc'),
                borderRadius: '2px',
                transition: 'all 0.2s ease',
                transform: menuOpen
                  ? i === 0 ? 'rotate(45deg) translate(4px, 4px)'
                  : i === 2 ? 'rotate(-45deg) translate(4px, -4px)'
                  : 'none'
                  : 'none',
                display: 'block',
              }} />
            ))}
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown menu ───────────────────────────────────────────── */}
      {menuOpen && (
        <div
          ref={mobileMenuRef}
          className="show-mobile"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: '1rem 0 0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            marginTop: '0.75rem',
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link}
              href={link === 'Menú' || link === 'Combos' ? '#menu' : '#contact'}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block', padding: '0.75rem 0.5rem',
                color: '#ccc', textDecoration: 'none',
                fontWeight: 600, fontSize: '1.05rem',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {link}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
