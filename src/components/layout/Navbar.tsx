'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { buildWaLink } from '@/utils/whatsapp';
import { Button } from '@/components/ui/Button';

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

export default function Navbar({ cartCount = 0, onCartOpen, minimal = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // rAF throttle — evita re-renders excesivos en scroll
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

  return (
    <>
      {/* Top ticker bar */}
      <div className="fixed top-0 left-0 w-full h-[32px] z-[2000] flex items-center overflow-hidden"
        style={{ background: 'var(--color-primary)' }}>
        <div className="flex whitespace-nowrap animate-[ticker_20s_linear_infinite] items-center">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="text-black font-black text-[0.65rem] uppercase tracking-[0.2em] px-8">
              🔥 PEDIDOS ACTIVOS • CALIENTE AHORA • ENTREGA RÁPIDA ⚡
            </span>
          ))}
        </div>
      </div>

      <nav
        id="navbar"
        className={`fixed z-[1500] left-1/2 -translate-x-1/2 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.2,1,0.3,1)] ${
          scrolled
            ? 'top-[32px] w-full max-w-full h-[70px] bg-black/90 backdrop-blur-xl border-b border-[#2a2a2a] rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
            : 'cyber-glow-medium top-[42px] w-[calc(100%-40px)] max-w-[1200px] h-[70px] bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div className="w-full max-w-[1400px] mx-auto px-8 sm:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline group shrink-0">
            <div
              className="font-black text-[1.3rem] tracking-[-1px] text-white uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              SNACKS <span style={{ color: 'var(--color-primary)' }}>911 🚨</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex gap-[32px] items-center absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="text-[0.85rem] font-bold uppercase tracking-[1.5px] opacity-50 hover:opacity-100 transition-all no-underline"
                style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Cart icon — kept for backward compat with page.tsx */}
            {onCartOpen && (
              <div
                className="relative cursor-pointer hover:scale-110 transition-transform flex items-center justify-center w-10 h-10 bg-white/5 rounded-full border border-white/10"
                onClick={onCartOpen}
              >
                <span className="text-xl">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-black text-[0.65rem] w-[18px] h-[18px] rounded-full flex items-center justify-center font-black shadow-[0_0_10px_rgba(255,60,0,0.6)]"
                    style={{ background: 'var(--color-primary)' }}>
                    {cartCount}
                  </span>
                )}
              </div>
            )}

            {/* Primary CTA */}
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
              📲 Pedir ahora
            </motion.a>

            {/* Mobile hamburger */}
            <motion.button
              className="md:hidden text-white text-2xl p-1 leading-none"
              style={{ color: 'var(--color-muted)' }}
              onClick={() => setMobileMenuOpen(true)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              ☰
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[2000] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-[80%] max-w-[300px] h-full bg-[#0a0a0a]/95 backdrop-blur-2xl border-l border-[#2a2a2a] p-10 flex flex-col gap-8 shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
            >
              <Button
                variant="ghost"
                size="sm"
                className="self-end"
                onClick={() => setMobileMenuOpen(false)}
              >
                ✕ Cerrar
              </Button>

              <div className="flex flex-col gap-6 mt-2">
                {NAV_LINKS.map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-white text-2xl font-black uppercase tracking-tighter transition-colors no-underline"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {label}
                  </a>
                ))}
              </div>

              <div className="mt-auto">
                <motion.a
                  href={buildWaLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center btn btn-primary btn-lg"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
                >
                  📲 HACER MI PEDIDO
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
        @keyframes cyber-glow-medium {
          0% {
            border-color: rgba(255, 90, 0, 0.5);
            box-shadow: 0 0 20px rgba(255, 90, 0, 0.2), inset 0 0 10px rgba(255, 90, 0, 0.1);
          }
          33% {
            border-color: rgba(255, 0, 128, 0.5);
            box-shadow: 0 0 30px rgba(255, 0, 128, 0.3), inset 0 0 15px rgba(255, 0, 128, 0.15);
          }
          66% {
            border-color: rgba(138, 43, 226, 0.5);
            box-shadow: 0 0 30px rgba(138, 43, 226, 0.3), inset 0 0 15px rgba(138, 43, 226, 0.15);
          }
          100% {
            border-color: rgba(255, 90, 0, 0.5);
            box-shadow: 0 0 20px rgba(255, 90, 0, 0.2), inset 0 0 10px rgba(255, 90, 0, 0.1);
          }
        }
        .cyber-glow-medium {
          border-width: 1px;
          border-style: solid;
          animation: cyber-glow-medium 4s linear infinite;
        }
      `}</style>
    </>
  );
}
