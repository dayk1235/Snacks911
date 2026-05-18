'use client';

import { memo, useState, useEffect, useRef } from 'react'; // PERF FIX: added useState/useEffect/useRef
import Image from 'next/image';
import { useGSAP } from '@/lib/gsap'; // ScrambleText effect
import StatusBadge from '@/components/StatusBadge';
import { buildWaLink } from '@/utils/whatsapp';
import { useChatStore } from '@/stores/chatStore';
import { Button } from '@/components/ui/Button';

const stats = [
  { icon: '🔥', value: '+120', label: 'pedidos esta semana', counterEnd: 120, counterPrefix: '+', counterSuffix: '', selector: 'stat-pedidos' },
  { icon: '⚡', value: '28 min', label: 'entrega promedio', counterEnd: 28, counterPrefix: '', counterSuffix: ' min', selector: 'stat-minutos' },
  { icon: '🚨', value: 'Diario', label: 'el combo más pedido se agota', selector: 'stat-diario' },
];

function HeroSection({ children }: { children?: React.ReactNode }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const waBtnRef = useRef<HTMLAnchorElement>(null);
  const targetText = 'TU ANTOJO LLEGA EN 30 MINUTOS';

  // ── Hero entrance timeline: overlay → scramble title → subtitle → stats → CTAs ──
  useGSAP((gsap) => {
    const el = titleRef.current;
    if (!el) return;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return; // Accessibility: skip animation if user prefers reduced motion

    const originalHTML = el.innerHTML; // preserve colored span for "30 MINUTOS"
    el.textContent = targetText; // flatten for scramble

    const hasScramble = (gsap as Record<string, unknown>)._hasScrambleText as boolean;
    const SplitText = (gsap as Record<string, unknown>)._SplitText as { new (el: Element, opts: { type: string }): { words: Element[] } } | null;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    let manualInterval: ReturnType<typeof setInterval> | null = null; // cleanup ref for manual scramble

    // ── 1. Overlay fade in (0 → 0.4s) ─────────────────────────────────────
    tl.fromTo('.hero-overlay', { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'none' }, 0);

    // ── 2. Title scramble (text content, runs 1.2s) ────────────────────────
    if (hasScramble) {
      tl.to(el, {
        duration: 1.2,
        scrambleText: {
          text: targetText,
          chars: '!@#$%911🚨🔥⚡',
          revealDelay: 0.3,
          speed: 0.4,
          newClass: 'scramble-active',
        },
        ease: 'none',
        onComplete: () => { el.innerHTML = originalHTML; },
      }, 0);
    } else {
      // Manual scramble fallback (setInterval, runs independently)
      const SCRAMBLE_CHARS = '!@#$%911🚨🔥⚡';
      const targetChars = [...targetText];
      let revealedCount = 0;
      const revealDelayMs = 300;
      const revealIntervalMs = 38;
      const startTs = Date.now();
      let delayPhase = true;

      manualInterval = setInterval(() => {
        const elapsed = Date.now() - startTs;
        if (delayPhase && elapsed < revealDelayMs) {
          let out = '';
          for (let i = 0; i < targetChars.length; i++) {
            out += targetChars[i] === ' ' ? ' ' : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          }
          el.textContent = out;
          return;
        }
        delayPhase = false;
        const targetRevealed = Math.floor((elapsed - revealDelayMs) / revealIntervalMs);
        if (revealedCount < targetRevealed && revealedCount < targetChars.length) {
          revealedCount = Math.min(revealedCount + (Math.random() > 0.5 ? 2 : 1), targetChars.length);
        }
        let out = '';
        for (let i = 0; i < targetChars.length; i++) {
          if (i < revealedCount) { out += targetChars[i]; }
          else { out += targetChars[i] === ' ' ? ' ' : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]; }
        }
        el.textContent = out;
        if (revealedCount >= targetChars.length) {
          clearInterval(manualInterval!);
          manualInterval = null;
          requestAnimationFrame(() => { el.innerHTML = originalHTML; });
        }
      }, 33);
    }

    // ── 3. Title entrance — y:80 → 0, opacity 0 → 1 (0.7s) ──────────────
    if (SplitText) {
      const words = new SplitText(el, { type: 'words' });
      tl.from(words.words, {
        y: 80, autoAlpha: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out',
      }, '>-=0.05');
    } else {
      tl.from(el, {
        y: 80, autoAlpha: 0, duration: 0.7, ease: 'power3.out',
      }, '>-=0.05');
    }

    // ── 4. Subtitle — y:30 → 0 (starts at t=0.3) ─────────────────────────
    tl.from('.hero-subtitle', {
      y: 30, autoAlpha: 0, duration: 0.5, ease: 'power2.out',
    }, 0.3);

    // ── 5. Stat badges — entrance handled by counter ScrollTrigger below ──
    // ── 6. CTAs — stagger y:20 → 0, scale:0.95 → 1 (starts at t=0.7) ────
    tl.from('.hero-cta', {
      y: 20, autoAlpha: 0, scale: 0.95, duration: 0.4, stagger: 0.08, ease: 'power2.out',
    }, 0.7);

    // Cleanup: cancel manual scramble on timeline interrupt/complete
    if (!hasScramble && manualInterval) {
      tl.eventCallback('onInterrupt', () => {
        if (manualInterval) { clearInterval(manualInterval); manualInterval = null; }
      });
    }

    // Return cleanup for useGSAP (handles unmount via ctx.revert + manual interval)
    return () => {
      if (manualInterval) { clearInterval(manualInterval); manualInterval = null; }
    };
  }, [], titleRef);

  // ── Animated stat counters (ScrollTrigger — fires once when hero is 75% visible) ──
  useGSAP((gsap, ST) => {
    if (!ST) return; // ScrollTrigger must be available

    const sectionEl = document.querySelector('#hero');
    if (!sectionEl) return;

    // Check reduced motion
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return;

    const counterStats = stats.filter(s => 'counterEnd' in s);

    counterStats.forEach((s) => {
      const el = document.querySelector(`[data-stat-counter="${s.selector}"]`);
      if (!el) return;

      const obj = { val: 0 };

      ST.create({
        trigger: sectionEl as Element,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          const c = s as typeof s & { counterEnd: number; counterPrefix: string; counterSuffix: string };
          // Reset to 0 before animating up (SSR gave us the final value)
          el.textContent = `${c.counterPrefix}0${c.counterSuffix}`;

          gsap.to(obj, {
            val: c.counterEnd,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = `${c.counterPrefix}${Math.round(obj.val)}${c.counterSuffix}`;
            },
          });
        },
      });
    });

    // Stat icon bounce + entrance stagger
    ST.create({
      trigger: sectionEl as Element,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        // Icons bounce in
        gsap.from('.stat-icon', {
          scale: 0,
          duration: 0.4,
          ease: 'back.out(2)',
          stagger: 0.15,
        });

        // Stat cards entrance
        gsap.from('.hero-stat', {
          y: 30,
          autoAlpha: 0,
          duration: 0.5,
          stagger: 0.15,
          ease: 'power2.out',
        });
      },
    });
  }, []);

  // ── CTA WhatsApp pulse — subtle infinite scale after hero entrance ──────
  useGSAP((gsap) => {
    const btn = waBtnRef.current;
    if (!btn) return;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return;

    // Pulse tween — starts paused, plays after 1.5s delay
    const pulse = gsap.to(btn, {
      scale: 1.04,
      duration: 0.9,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    const timerId = setTimeout(() => pulse.play(), 1500);

    // Smart pause on hover
    const onEnter = () => {
      pulse.pause();
      gsap.to(btn, { scale: 1.06, duration: 0.2, overwrite: true });
    };
    const onLeave = () => {
      gsap.to(btn, { scale: 1, duration: 0.2, overwrite: true, onComplete: () => pulse.play() });
    };
    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);

    return () => {
      clearTimeout(timerId);
      btn.removeEventListener('mouseenter', onEnter);
      btn.removeEventListener('mouseleave', onLeave);
      pulse.kill();
    };
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-6 pt-[76px] overflow-hidden"
    >
      {/* PERF FIX: added sizes, loading, quality — was missing sizes causing browser to load largest variant */}
      {/* Background image */}
      <Image
        src="/images/hero.webp"
        alt=""
        fill
        className="object-cover"
        style={{ opacity: 0.25 }}
        priority
        loading="eager" // PERF FIX: explicit eager for above-the-fold LCP
        sizes="100vw" // PERF FIX: critical for responsive image selection, was missing
        quality={75} // PERF FIX: 75 is enough for bg at opacity 0.25, saves ~40% bytes
      />
      {/* Gradient overlay */}
      <div className="hero-overlay absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#0a0a0a]" />
      {/* Ambient glow orbs */}
      <div className="hero-orb-1 pointer-events-none" />
      <div className="hero-orb-2 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl w-full">
        <StatusBadge />

        <h1
          ref={titleRef}
          className="hero-title m-0 uppercase leading-[0.95]"
          data-scramble-text={targetText}
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
          className="hero-subtitle m-0 text-[1.05rem] leading-relaxed"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
        >
          Alitas, boneless y snacks con salsas 100% caseras.
          <br />
          Iztapalapa y zonas cercanas.
        </p>

        {/* FOMO stats */}
        <div className="stats-section flex flex-wrap justify-center gap-4 mt-1">
          {stats.map((s) => (
            <div
              key={s.label}
              className="hero-stat flex items-center gap-2 text-sm"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
            >
              <span className="stat-icon">{s.icon}</span>
              {'counterEnd' in s ? (
                <strong
                  className="stat-counter"
                  style={{ color: 'var(--color-accent)' }}
                  data-stat-counter={s.selector}
                  aria-live="polite"
                >
                  {s.counterPrefix}{s.counterEnd}{s.counterSuffix}
                </strong>
              ) : (
                <strong className="stat-counter" style={{ color: 'var(--color-accent)' }}>
                  {s.value}
                </strong>
              )}
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-2 w-full">
          <Button
            variant="primary"
            size="lg"
            glow
            className="hero-cta w-full sm:w-auto"
            onClick={() => useChatStore.getState().open()}
          >
            🤖 PEDIR CON IA
          </Button>

          <a
            ref={waBtnRef}
            href={buildWaLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-cta cta-whatsapp-btn w-full sm:w-auto btn btn-outline btn-lg"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            📲 WhatsApp directo
          </a>
        </div>

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

// ── TickerBar — 3-row GSAP marquee with alternate directions + hover pause ──
export const TickerBar = memo(function TickerBar() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const r1Ref = useRef<HTMLDivElement>(null); // row 1: left, 25s
  const r2Ref = useRef<HTMLDivElement>(null); // row 2: right, 25s
  const r3Ref = useRef<HTMLDivElement>(null); // row 3: left slower, 35s

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const items = ['Alitas BBQ', 'Boneless Picante', 'Papas Loaded', 'Combo 911', 'Entrega Rápida', 'Salsas Caseras', 'Snacks 911 🚨'];

  // ── GSAP marquee animations (only run after client mount + refs attached) ──
  useGSAP((gsap) => {
    const r1 = r1Ref.current;
    const r2 = r2Ref.current;
    const r3 = r3Ref.current;
    const container = containerRef.current;
    if (!r1 || !r2 || !r3 || !container) return;

    // Row 1 — left, 25s per cycle
    gsap.set(r1, { xPercent: 0 });
    const t1 = gsap.to(r1, {
      xPercent: -50,
      duration: 25,
      ease: 'none',
      repeat: -1,
      force3D: true,
    });

    // Row 2 — right, 25s per cycle (starts shifted left → animates to 0)
    gsap.set(r2, { xPercent: -50 });
    const t2 = gsap.to(r2, {
      xPercent: 0,
      duration: 25,
      ease: 'none',
      repeat: -1,
      force3D: true,
    });

    // Row 3 — left slower, 35s per cycle
    gsap.set(r3, { xPercent: 0 });
    const t3 = gsap.to(r3, {
      xPercent: -50,
      duration: 35,
      ease: 'none',
      repeat: -1,
      force3D: true,
    });

    // ── Hover pause ──────────────────────────────────────────────────────
    const onEnter = () => { t1.pause(); t2.pause(); t3.pause(); };
    const onLeave = () => { t1.play(); t2.play(); t3.play(); };
    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);

    return () => {
      container.removeEventListener('mouseenter', onEnter);
      container.removeEventListener('mouseleave', onLeave);
      // GSAP tweens auto-killed by gsap.context() cleanup in useGSAP
    };
  }, [mounted]); // re-run when mounted flips to true → refs are attached

  if (!mounted) return null;

  // Render helper — 2 copies for seamless GSAP xPercent loop
  const rowContent = (copyOffset: number) => (
    <div key={`copy-${copyOffset}`} className="flex items-center px-4">
      {items.map((item) => (
        <span
          key={`${copyOffset}-${item}`}
          className="flex items-center text-[0.85rem] font-black tracking-[0.2em] uppercase px-12"
          style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
        >
          {item}
          <span className="ml-24 opacity-20 text-white">★</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-[100] border-t"
      style={{ background: '#0a0a0a', borderColor: 'var(--color-border)' }}
    >
      {/* Row 1 — left, 25s ——————————————————————————————————————————————— */}
      <div className="marquee-row py-1">
        <div ref={r1Ref} className="marquee-track-inner pointer-events-none">
          {rowContent(0)}
          {rowContent(1)}
        </div>
      </div>
      {/* Row 2 — right, 25s —————————————————————————————————————————————— */}
      <div className="marquee-row py-1">
        <div ref={r2Ref} className="marquee-track-inner pointer-events-none">
          {rowContent(10)}
          {rowContent(11)}
        </div>
      </div>
      {/* Row 3 — left slower, 35s ———————————————————————————————————————— */}
      <div className="marquee-row py-1">
        <div ref={r3Ref} className="marquee-track-inner pointer-events-none">
          {rowContent(20)}
          {rowContent(21)}
        </div>
      </div>
    </div>
  );
});
