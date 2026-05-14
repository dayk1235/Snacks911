'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  cartCount: number;
  onCartOpen: () => void;
  minimal?: boolean;
}

export default function Navbar({ cartCount, onCartOpen, minimal = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav 
        id="navbar" 
        className={`fixed z-[1500] left-1/2 -translate-x-1/2 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.2,1,0.3,1)] ${
          scrolled 
            ? 'top-0 w-full max-w-full h-[70px] bg-[#040404]/85 backdrop-blur-xl border-b border-white/10 rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
            : 'top-5 w-[calc(100%-40px)] max-w-[1200px] h-[70px] bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div className="w-full max-w-[1400px] mx-auto px-8 sm:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline group shrink-0 ml-2">
            <div className="font-mono font-black text-[1.3rem] tracking-[-1px] text-white uppercase">
              SNACKS <span className="text-[var(--accent)]">911</span>
            </div>
          </Link>

          {/* Desktop Links - Centered */}
          <div className="hidden md:flex gap-[40px] items-center absolute left-1/2 -translate-x-1/2">
            {['Inicio', 'Combos', 'Menú', 'Estado'].map((item) => (
              <Link 
                key={item}
                href={item === 'Menú' ? '/menu' : `/#${item.toLowerCase()}`} 
                className="text-[0.85rem] font-bold uppercase tracking-[1.5px] text-white opacity-50 hover:opacity-100 hover:text-[var(--accent)] transition-all no-underline"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-[25px] shrink-0 mr-2">
            <div 
              className="relative cursor-pointer hover:scale-110 transition-transform flex items-center justify-center w-12 h-12 bg-white/5 rounded-full border border-white/10" 
              onClick={onCartOpen}
            >
              <span className="text-2xl">🛒</span>
              <span className="absolute -top-1 -right-1 bg-[var(--accent)] text-black text-[0.7rem] w-[20px] h-[20px] rounded-full flex items-center justify-center font-black shadow-[0_0_15px_rgba(255,90,0,0.6)]">
                {cartCount}
              </span>
            </div>
            
            <button 
              className="md:hidden text-white text-2xl p-1 leading-none hover:text-[var(--accent)] transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[2000] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-[80%] max-w-[300px] h-full bg-[#050505]/95 backdrop-blur-2xl border-l border-white/10 p-10 flex flex-col gap-8 shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
            >
              <button 
                className="self-end text-white/40 hover:text-white text-2xl"
                onClick={() => setMobileMenuOpen(false)}
              >
                ✕
              </button>
              
              <div className="flex flex-col gap-8 mt-4">
                {['Inicio', 'Combos', 'Menú', 'Estado'].map((item) => (
                  <Link 
                    key={item}
                    href={item === 'Menú' ? '/menu' : `/#${item.toLowerCase()}`} 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-white text-2xl font-black uppercase tracking-tighter hover:text-[var(--accent)] transition-colors"
                  >
                    {item}
                  </Link>
                ))}
              </div>
              
              <div className="mt-auto pt-10 border-t border-white/5 flex flex-col items-center">
                <div className="text-[0.6rem] text-white/20 font-black uppercase tracking-[0.3em]">Snacks 911 Dispatch</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes flicker {
          0%, 19.9%, 22%, 62.9%, 64%, 64.9%, 70%, 100% { opacity: 1; }
          20%, 21.9%, 63%, 63.9%, 65%, 69.9% { opacity: 0.8; filter: brightness(1.3); }
        }
      `}</style>
    </>
  );
}
