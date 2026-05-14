'use client';

import { memo, useEffect, useState } from 'react';
import { AdminStore } from '@/lib/adminStore';
import type { BusinessSettings } from '@/lib/adminTypes';
import { useStoreSettings } from '@/lib/storeSettingsStore';
import type { Product } from '@/data/products';
import Image from 'next/image';

interface HeroProps {
  featuredProduct?: Product;
  onOrderFeatured?: () => void;
}

const DEFAULT_SETTINGS: Partial<BusinessSettings> = {
  whatsappNumber: '525584507458',
  heroBadgeText: 'Abierto ahora · Entrega en ~30 min',
};

function HeroSection({ featuredProduct, onOrderFeatured, children }: HeroProps & { children?: React.ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<Partial<BusinessSettings>>(DEFAULT_SETTINGS);
  const { isOpen: storeOpen, heroSubtitle, fetchSettings } = useStoreSettings();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    AdminStore.getSettings()
      .then(s => setSiteSettings(s))
      .catch(() => { /* ignore */ });
    fetchSettings();

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [fetchSettings]);

  return (
    <section id="hero" className="hero min-h-screen flex items-center relative overflow-hidden px-6 bg-[#050505]">
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 z-[5] pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.8)_100%)]"></div>

      {/* Dynamic Background Parallax */}
      <div 
        className="hero-glow absolute w-[100vw] h-[100vw] top-[-10%] right-[-10%] z-[0] transition-transform duration-700 ease-out opacity-20"
        style={{ 
          background: 'radial-gradient(circle, var(--glow) 0%, transparent 70%)',
          transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)` 
        }}
      ></div>

      {/* Heat Particles Effect */}
      <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i}
            className="absolute w-1 h-1 bg-[var(--accent)] rounded-full animate-[heat_4s_infinite_ease-in-out] opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              transform: `scale(${Math.random() * 2})`
            }}
          />
        ))}
      </div>
      
      <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-10 relative z-10">
        <div 
          className="hero-content lg:col-span-5 transition-transform duration-300 ease-out flex flex-col items-center lg:items-start text-center lg:text-left"
          style={{ transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)` }}
        >
          {/* Urgency Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6 animate-[fadeInUp_0.8s_ease_both] opacity-50">
            <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
            <span className="text-[0.6rem] font-bold tracking-widest text-white uppercase">🔥 EN COCINA AHORA MISMO</span>
          </div>
          
          <h1 className="hero-title text-[clamp(2.5rem,8vw,6rem)] font-black leading-[0.9] uppercase tracking-[-0.04em] m-0 opacity-70">
            <span className="block animate-[fadeInUp_0.8s_cubic-bezier(0.2,1,0.3,1)_both]">
              EL ANTOJO
            </span>
            <span className="block fire-text drop-shadow-[0_0_30px_rgba(255,90,0,0.2)] animate-[fadeInUp_0.8s_cubic-bezier(0.2,1,0.3,1)_0.2s_both]">
              NO ESPERA
            </span>
          </h1>

          <p className="text-[var(--muted)] max-w-[400px] my-6 text-base sm:text-lg leading-relaxed animate-[fadeInUp_0.8s_cubic-bezier(0.2,1,0.3,1)_0.4s_both] opacity-60">
            {heroSubtitle || "Tu rescate calórico de alta velocidad. Despacho inmediato para hambres críticas."}
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 animate-[fadeInUp_0.8s_cubic-bezier(0.2,1,0.3,1)_0.6s_both] scale-90 origin-left">
            <button 
              className="btn btn-primary min-w-[160px] sm:min-w-[180px]"
              onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}
            >
              🔥 VER MENÚ
            </button>
          </div>

          {/* Micro-copy */}
          <div className="flex items-center gap-6 mt-14 opacity-30 text-[0.6rem] font-bold tracking-[0.1em] uppercase animate-[fadeInUp_0.8s_ease_1s_both]">
            <span>Entrega rápida</span>
            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
            <span>Caliente</span>
            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
            <span>Sin esperas</span>
          </div>
        </div>

        {/* ChatBot Main Interaction Area */}
        <div className="lg:col-span-7 flex justify-center items-center relative z-20">
          <div className="w-full max-w-[640px] transform translate-y-[-20px]">
            {children}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.1; }
          50% { transform: translateY(-40px) scale(1.5); opacity: 0.3; }
        }
      `}</style>
    </section>
  );
}

const Hero = memo(HeroSection);
export default Hero;

export const TickerBar = memo(function TickerBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black/80 backdrop-blur-md py-4 border-t border-white/10 overflow-hidden pointer-events-none">
      <div className="ticker-track flex whitespace-nowrap animate-[ticker_40s_linear_infinite]">
        {[0, 1, 2].map((copy) => (
          <div key={copy} className="flex items-center px-4">
            {['Alitas BBQ', 'Boneless Picante', 'Papas Loaded', 'Combo 911', 'Entrega Rapida', 'Sabor Extremo', 'Snacks 911 Dispatch'].map((item) => (
              <span key={item} className="flex items-center text-[0.7rem] font-black tracking-[0.2em] text-[var(--accent)] uppercase px-12">
                {item}
                <span className="ml-24 opacity-20 text-white">★</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </div>
  );
});
