'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, MessageCircle, Siren } from 'lucide-react';
import { buildWaLink } from '@/utils/whatsapp';

interface NavbarProps {
  cartCount?: number;
  onCartOpen?: () => void;
  minimal?: boolean;
}

const NAV_LINKS = [
  { label: 'Menú',          href: '#menu' },
  { label: 'Salsas',        href: '#salsas' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Zona',          href: '#zona' },
];

export default function Navbar({ cartCount = 0, onCartOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prevCount = useRef(cartCount);
  const [badgeKey, setBadgeKey] = useState(0);

  useEffect(() => {
    if (cartCount !== prevCount.current && cartCount > 0) {
      const id = requestAnimationFrame(() => setBadgeKey(k => k + 1));
      return () => cancelAnimationFrame(id);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  const onScroll = useCallback(() => {
    let ticking = false;
    return () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 80);
          ticking = false;
        });
        ticking = true;
      }
    };
  }, []);

  useEffect(() => {
    const handler = onScroll();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [onScroll]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Main Navbar */}
      <motion.nav
        id="navbar"
        className={`fixed z-40 left-1/2 -translate-x-1/2 flex items-center justify-between ${
          scrolled
            ? 'top-0 w-full max-w-full h-[70px] bg-black/90 backdrop-blur-xl border-b border-[#2a2a2a] rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
            : 'top-[16px] w-[calc(100%-40px)] max-w-[1200px] h-[70px] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden'
        }`}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24, mass: 0.8 }}
      >
        {/* ── Traveling beam: wide glow + sharp core ─── */}
        {!scrolled && (
          <div className="beam-track absolute top-0 bottom-0 pointer-events-none" style={{ zIndex: 1 }}>
            {/* Wide ambient glow */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                width: '180px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: `linear-gradient(90deg,
                  transparent 0%,
                  rgba(255,90,0,0.03) 20%,
                  rgba(255,60,0,0.08) 40%,
                  rgba(255,0,128,0.15) 50%,
                  rgba(138,43,226,0.08) 60%,
                  rgba(138,43,226,0.03) 80%,
                  transparent 100%
                )`,
                filter: 'blur(10px)',
              }}
            />
            {/* Sharp bright core */}
            <div
              className="absolute top-[3px] bottom-[3px]"
              style={{
                width: '2px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: `linear-gradient(180deg,
                  transparent 0%,
                  rgba(255,140,0,0.5) 15%,
                  #FF6B00 30%,
                  #FF8C00 50%,
                  #FF1493 70%,
                  rgba(138,43,226,0.5) 85%,
                  transparent 100%
                )`,
                boxShadow: `
                  0 0 8px 2px rgba(255,90,0,0.65),
                  0 0 16px 4px rgba(255,0,128,0.35),
                  0 0 28px 6px rgba(138,43,226,0.2)
                `,
                borderRadius: '1px',
              }}
            />
          </div>
        )}

        {/* ── Content wrapper (covers beam interior) ─── */}
        <div
          className={`relative z-10 w-full h-full flex items-center ${
            scrolled
              ? ''
              : 'bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[24px]'
          }`}
        >
          {/* ── Bottom flames ─── */}
          {!scrolled && (
            <div
              className="flame-container absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none"
              style={{ height: '24px', zIndex: 1 }}
            >
              {/* Warm underglow */}
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{
                  height: '16px',
                  background: 'linear-gradient(to top, rgba(255,69,0,0.15) 0%, rgba(255,140,0,0.06) 40%, transparent 100%)',
                  borderRadius: '0 0 23px 23px',
                }}
              />
              {/* Individual flames */}
              {[
                { l: '5%',  w: 7,  h: 14, d: 0.18, s: 1.0, del: '0s' },
                { l: '16%', w: 6,  h: 11, d: 0.14, s: 0.85, del: '0.07s' },
                { l: '27%', w: 8,  h: 16, d: 0.22, s: 1.1, del: '0.03s' },
                { l: '38%', w: 5,  h: 10, d: 0.16, s: 0.8, del: '0.12s' },
                { l: '48%', w: 9,  h: 18, d: 0.24, s: 1.15, del: '0s' },
                { l: '58%', w: 6,  h: 12, d: 0.15, s: 0.9, del: '0.09s' },
                { l: '69%', w: 7,  h: 15, d: 0.19, s: 1.05, del: '0.04s' },
                { l: '80%', w: 5,  h: 10, d: 0.13, s: 0.8, del: '0.1s' },
                { l: '91%', w: 8,  h: 14, d: 0.2, s: 1.0, del: '0.06s' },
              ].map((f, i) => (
                <div
                  key={`flame-${i}`}
                  className="flame absolute"
                  style={{
                    left: f.l,
                    bottom: '-4px',
                    width: `${f.w}px`,
                    height: `${f.h}px`,
                    background: 'linear-gradient(to top, #FF4500 0%, #FF6B00 25%, #FF8C00 50%, #FFA500 75%, rgba(255,200,0,0.3) 95%, transparent 100%)',
                    borderRadius: '45% 45% 45% 45% / 60% 60% 40% 40%',
                    transformOrigin: 'bottom center',
                    animationDuration: `${f.d}s`,
                    animationDelay: f.del,
                    opacity: f.s,
                    filter: 'blur(0.3px)',
                  }}
                />
              ))}
              {/* Embers */}
              {[
                { l: '12%', d: 1.2, del: '0.1s', y: 16 },
                { l: '32%', d: 1.5, del: '0.4s', y: 18 },
                { l: '52%', d: 1.0, del: '0.7s', y: 14 },
                { l: '72%', d: 1.3, del: '0.2s', y: 17 },
                { l: '88%', d: 1.4, del: '0.5s', y: 15 },
              ].map((e, i) => (
                <div
                  key={`ember-${i}`}
                  className="ember absolute"
                  style={{
                    left: e.l,
                    bottom: '0px',
                    width: '2px',
                    height: '2px',
                    background: '#FFD700',
                    borderRadius: '50%',
                    boxShadow: '0 0 4px 1px rgba(255,140,0,0.8), 0 0 8px 2px rgba(255,69,0,0.4)',
                    animationDuration: `${e.d}s`,
                    animationDelay: e.del,
                    '--rise': `${e.y}px`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          <div className="relative z-[2] w-full max-w-[1400px] mx-auto px-6 sm:px-10 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 no-underline group shrink-0">
              <div
                className="font-black text-[1.3rem] tracking-[-1px] text-white uppercase flex items-center gap-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                SNACKS
                <span style={{ color: 'var(--color-primary)' }} className="flex items-center gap-0.5">
                  911
                  <Siren size={18} strokeWidth={2.5} style={{ color: 'var(--color-primary)' }} />
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="relative text-[0.82rem] font-bold uppercase tracking-[1.5px] opacity-50 hover:opacity-100 transition-all duration-200 no-underline group/link"
                  style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
                >
                  {label}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[var(--color-primary)] transition-all duration-300 ease-out group-hover/link:w-full rounded-full" />
                </a>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Cart Icon */}
              {onCartOpen && (
                <motion.button
                  className="relative cursor-pointer flex items-center justify-center w-10 h-10 bg-white/5 rounded-full border border-white/10"
                  onClick={onCartOpen}
                  aria-label="Abrir carrito"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <ShoppingCart size={20} strokeWidth={1.8} className="text-white/80" />
                  {cartCount > 0 && (
                    <motion.span
                      key={badgeKey}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                      className="absolute -top-1 -right-1 text-black text-[0.65rem] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-black px-1 shadow-[0_0_10px_rgba(255,60,0,0.6)]"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </motion.button>
              )}

              {/* Primary CTA — Desktop only */}
              <motion.a
                href={buildWaLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-2 btn btn-primary btn-sm"
                style={{ fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: '0.3px' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
              >
                <MessageCircle size={16} strokeWidth={2} />
                Pedir ahora
              </motion.a>

              {/* Mobile Hamburger */}
              <motion.button
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10"
                aria-label="Abrir menú"
                onClick={() => setMobileMenuOpen(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Menu size={20} strokeWidth={1.8} className="text-white/80" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-[80%] max-w-[320px] h-full bg-[#0a0a0a]/95 backdrop-blur-2xl border-l border-[#2a2a2a] p-8 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
            >
              <motion.button
                className="self-end flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menú"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} strokeWidth={2} />
              </motion.button>

              <div className="flex flex-col gap-6 mt-4">
                {NAV_LINKS.map(({ label, href }, i) => (
                  <motion.a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
                    className="text-white text-2xl font-black uppercase tracking-tighter no-underline hover:text-[var(--color-primary)] transition-colors"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {label}
                  </motion.a>
                ))}
              </div>

              <div className="mt-auto">
                <motion.a
                  href={buildWaLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
                  className="flex items-center justify-center gap-2 w-full text-center btn btn-primary btn-lg"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <MessageCircle size={18} strokeWidth={2} />
                  HACER MI PEDIDO
                </motion.a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
        @keyframes beam-sweep {
          0%   { left: 2%; }
          100% { left: 98%; }
        }
        .beam-track {
          animation: beam-sweep 5.5s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
          width: 0;
        }
        @keyframes flame-flicker {
          0%   { transform: scaleY(0.6) scaleX(0.8); opacity: 0.6; }
          30%  { transform: scaleY(1.3) scaleX(1.05); opacity: 0.95; }
          55%  { transform: scaleY(0.7) scaleX(0.9); opacity: 0.7; }
          75%  { transform: scaleY(1.1) scaleX(1.0); opacity: 0.9; }
          100% { transform: scaleY(0.5) scaleX(0.75); opacity: 0.55; }
        }
        .flame {
          animation: flame-flicker var(--f-dur, 0.2s) ease-in-out infinite;
          animation-delay: var(--f-del, 0s);
        }
        @keyframes ember-rise {
          0%   { transform: translateY(0) scale(1); opacity: 0.9; }
          40%  { opacity: 0.7; }
          80%  { opacity: 0.25; }
          100% { transform: translateY(calc(-1 * var(--rise, 16px))) scale(0.15); opacity: 0; }
        }
        .ember {
          animation: ember-rise var(--e-dur, 1.5s) ease-out infinite;
          animation-delay: var(--e-del, 0s);
        }
        @media (prefers-reduced-motion: reduce) {
          .beam-track {
            animation: none;
            opacity: 0.35;
            left: 50%;
          }
          .flame {
            animation: none !important;
            transform: scaleY(0.8);
            opacity: 0.4;
          }
          .ember {
            animation: none !important;
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
