'use client';

import { memo } from 'react';
import Image from 'next/image';
import StatusBadge from '@/components/StatusBadge';
import { buildWaLink } from '@/utils/whatsapp';

const stats = [
  { icon: '🔥', value: '+120', label: 'pedidos esta semana' },
  { icon: '⚡', value: '28 min', label: 'entrega promedio' },
  { icon: '🚨', value: 'Diario', label: 'el combo más pedido se agota' },
];

function HeroSection({ children }: { children?: React.ReactNode }) {
  return (
    <section
      id="hero"
      className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-6 pt-[76px] overflow-hidden"
    >
      {/* Background image */}
      <Image
        src="/images/hero.webp"
        alt=""
        fill
        className="object-cover"
        style={{ opacity: 0.25 }}
        priority
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#0a0a0a]" />
      {/* Ambient glow orbs */}
      <div className="hero-orb-1 pointer-events-none" />
      <div className="hero-orb-2 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl w-full">
        <StatusBadge />

        <h1
          className="m-0 uppercase leading-[0.95]"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            color: 'var(--color-text)',
          }}
        >
          TU ANTOJO LLEGA EN{' '}
          <span style={{ color: 'var(--color-primary)' }}>30 MINUTOS</span>
        </h1>

        <p
          className="m-0 text-[1.05rem] leading-relaxed"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
        >
          Alitas, boneless y snacks con salsas 100% caseras.
          <br />
          Iztapalapa y zonas cercanas.
        </p>

        {/* FOMO stats */}
        <div className="flex flex-wrap justify-center gap-4 mt-1">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
            >
              <span>{s.icon}</span>
              <strong style={{ color: 'var(--color-accent)' }}>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Primary CTA */}
        <a
          href={buildWaLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-white font-black px-8 py-4 rounded-full shadow-xl
            hover:scale-105 active:scale-95 transition-all duration-200"
          style={{
            background: 'var(--color-primary)',
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            letterSpacing: '0.05em',
            boxShadow: '0 0 40px rgba(255,60,0,0.35)',
          }}
        >
          📲 HACER MI PEDIDO
        </a>

        <p className="m-0 text-[0.8rem]" style={{ color: 'var(--color-muted)' }}>
          Sin apps. Sin comisiones. Directo por WhatsApp.
        </p>

        {/* Optional chatbot slot — kept for backward compat */}
        {children && (
          <div className="w-full max-w-[640px] mt-4">{children}</div>
        )}
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hero-arrow-bounce text-[1.5rem]">
        ↓
      </div>
    </section>
  );
}

const Hero = memo(HeroSection);
export default Hero;

// TickerBar — kept as named export so page.tsx doesn't break
export const TickerBar = memo(function TickerBar() {
  const items = ['Alitas BBQ', 'Boneless Picante', 'Papas Loaded', 'Combo 911', 'Entrega Rápida', 'Salsas Caseras', 'Snacks 911 🚨'];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] backdrop-blur-md py-3 border-t overflow-hidden pointer-events-none"
      style={{ background: 'rgba(0,0,0,0.85)', borderColor: 'var(--color-border)' }}>
      <div className="ticker-track flex whitespace-nowrap">
        {[0, 1, 2].map((copy) => (
          <div key={copy} className="flex items-center px-4">
            {items.map((item) => (
              <span
                key={`${copy}-${item}`}
                className="flex items-center text-[0.7rem] font-black tracking-[0.2em] uppercase px-12"
                style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
              >
                {item}
                <span className="ml-24 opacity-20 text-white">★</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
