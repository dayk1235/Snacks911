'use client';

import { useRef, useEffect, useState } from 'react';

interface NavbarProps {
  cartCount: number;
  onCartOpen: () => void;
}

export default function Navbar({ cartCount, onCartOpen }: NavbarProps) {
  const badgeRef  = useRef<HTMLSpanElement>(null);
  const prevCount = useRef(0);

  const [menuOpen,  setMenuOpen]  = useState(false);
  const [mounted,  setMounted]    = useState(false);
  // 'entering' → play slide-down; 'visible' → show; 'hidden' → scroll-hide
  const [navPhase, setNavPhase]   = useState<'entering' | 'visible' | 'hidden'>('entering');

  /* ── Hydration fix ── */
  useEffect(() => { setMounted(true); }, []);

  /* ── Entrance: switch to transition mode after anim completes ── */
  useEffect(() => {
    const t = setTimeout(() => setNavPhase('visible'), 650);
    return () => clearTimeout(t);
  }, []);

  /* ── Smart scroll hide/show ── */
  useEffect(() => {
    let lastScroll = 0;
    let ticking    = false;
    const THRESHOLD = 80;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const curr = window.scrollY;
        if (curr < THRESHOLD || curr < lastScroll) {
          setNavPhase('visible');
        } else {
          setNavPhase('hidden');
        }
        lastScroll = Math.max(0, curr);
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Badge pop via CSS animation reset trick ── */
  useEffect(() => {
    if (cartCount > 0 && badgeRef.current && cartCount !== prevCount.current) {
      const badge = badgeRef.current;
      badge.style.animation = 'none';
      void badge.offsetWidth; // force reflow
      badge.style.animation = 'badgePop 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  const navLinks = ['Menú', 'Combos', 'Contacto'];

  /* nav style based on phase */
  const navStyle: React.CSSProperties = navPhase === 'entering'
    ? { animation: 'navSlideDown 0.6s cubic-bezier(0.22,1,0.36,1) forwards' }
    : {
        transform: navPhase === 'hidden' ? 'translateY(-90px)' : 'translateY(0)',
        opacity:   navPhase === 'hidden' ? 0 : 1,
        transition: 'transform 0.35s ease, opacity 0.35s ease',
      };

  return (
    <nav
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
        ...navStyle,
      }}
    >
      {/* ── Main row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}>
          <svg
            width="248"
            height="72"
            viewBox="0 0 900 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Snacks 911"
            style={{ display: 'block', width: 'clamp(140px, 22vw, 248px)', height: 'auto', overflow: 'visible' }}
          >
            {/* 🚨 Siren — CSS keyframe animation */}
            <g style={{ willChange: 'filter', transformBox: 'fill-box', transformOrigin: 'center', animation: 'sirenFlash 1.8s ease-in-out infinite' }}>
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

            <text x="160" y="170" fontFamily="Arial, Helvetica, sans-serif" fontSize="92" fontWeight="900" fill="#F5F5F5" letterSpacing="-2">SNACKS</text>
            <text x="535" y="172" fontFamily="Arial, Helvetica, sans-serif" fontSize="102" fontWeight="900" fill="#FFC400">911</text>
            <line x1="165" y1="210" x2="275" y2="210" stroke="white" strokeWidth="5" strokeLinecap="round"/>
            <line x1="625" y1="210" x2="735" y2="210" stroke="white" strokeWidth="5" strokeLinecap="round"/>
            <text x="450" y="220" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="30" fontWeight="700" fill="white" letterSpacing="2">URGENCIA DE ANTOJO</text>
          </svg>
        </div>

        {/* ── Desktop nav ── */}
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
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#666'; }}
            >
              {link}
            </a>
          ))}

          {/* Cart button */}
          <button
            id="cart-button"
            onClick={() => onCartOpen()}
            style={{
              fontFamily: 'var(--font-body)', position: 'relative',
              background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none', borderRadius: '12px', padding: '0.55rem 1.25rem',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              boxShadow: '0 0 16px rgba(255,69,0,0.2)', letterSpacing: '0.02em',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(255,69,0,0.35)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(255,69,0,0.2)'; }}
          >
            Carrito
            {mounted && cartCount > 0 && (
              <span
                ref={badgeRef}
                suppressHydrationWarning
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

        {/* ── Mobile: Cart icon + Hamburger ── */}
        <div className="show-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onCartOpen}
            style={{
              position: 'relative', background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none', borderRadius: '10px', padding: '0.5rem 0.75rem',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {mounted && cartCount > 0 && (
              <span suppressHydrationWarning style={{
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

      {/* ── Mobile dropdown ── */}
      {menuOpen && (
        <div
          className="show-mobile"
          style={{
            display: 'flex', flexDirection: 'column', gap: '0.25rem',
            padding: '1rem 0 0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            marginTop: '0.75rem',
            animation: 'navSlideDown 0.28s cubic-bezier(0.22,1,0.36,1) forwards',
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
