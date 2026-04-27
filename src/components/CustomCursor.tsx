'use client';

import { useEffect, useRef, useCallback } from 'react';

// ─── Particle system on canvas ───────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  hue: number; // 0-60 → rojo a amarillo
}

function createParticle(x: number, y: number): Particle {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -(Math.random() * 2 + 1),       // sube
    life: 1,
    maxLife: Math.random() * 20 + 15,   // frames
    size: Math.random() * 3 + 1.5,
    hue: Math.random() * 50,            // naranja-amarillo-rojo
  };
}

// ─── Flame SVG cursor ────────────────────────────────────────────────────────
function FlameSVG({ big }: { big: boolean }) {
  return (
    <svg
      width={big ? 44 : 34}
      height={big ? 56 : 44}
      viewBox="0 0 34 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'block',
        filter: `drop-shadow(0 0 ${big ? 10 : 6}px rgba(255,120,0,0.9))`,
        transition: 'width 0.15s ease, height 0.15s ease, filter 0.15s ease',
        animation: 'flameDance 0.4s ease-in-out infinite alternate',
      }}
    >
      {/* Llama exterior — roja */}
      <path
        d="M17 2
           C17 2 24 10 24 17
           C24 17 28 13 27 9
           C30 13 32 18 32 22
           C32 32 25 40 17 40
           C9 40 2 32 2 22
           C2 16 6 10 10 7
           C10 12 12 15 12 15
           C12 15 10 8 17 2Z"
        fill="url(#flameOuter)"
      />
      {/* Llama media — naranja */}
      <path
        d="M17 8
           C17 8 22 14 22 19
           C22 19 25 16 24 13
           C27 16 28 20 28 23
           C28 31 23 38 17 38
           C11 38 6 31 6 23
           C6 18 9 13 12 11
           C12 15 14 17 14 17
           C14 17 13 11 17 8Z"
        fill="url(#flameMid)"
        opacity="0.9"
      />
      {/* Llama interior — amarilla */}
      <path
        d="M17 14
           C17 14 20 18 20 21
           C20 21 22 19 21 17
           C23 19 24 22 24 24
           C24 30 21 36 17 36
           C13 36 10 30 10 24
           C10 21 12 18 14 16
           C14 19 16 20 16 20
           C16 20 15 16 17 14Z"
        fill="url(#flameInner)"
        opacity="0.85"
      />
      {/* Brillo central */}
      <ellipse cx="17" cy="28" rx="4" ry="6" fill="#FFE066" opacity="0.4" />

      <defs>
        <radialGradient id="flameOuter" cx="50%" cy="75%" r="55%">
          <stop offset="0%" stopColor="#FF2200" />
          <stop offset="100%" stopColor="#FF6600" stopOpacity="0.7" />
        </radialGradient>
        <radialGradient id="flameMid" cx="50%" cy="75%" r="55%">
          <stop offset="0%" stopColor="#FF6600" />
          <stop offset="100%" stopColor="#FFAA00" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="flameInner" cx="50%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FF8800" stopOpacity="0.5" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomCursor() {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const flameRef    = useRef<HTMLDivElement>(null);
  const dotRef      = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const mouse       = useRef({ x: -300, y: -300 });
  const hovered     = useRef(false);
  const particles   = useRef<Particle[]>([]);
  const visible     = useRef(false);
  const frameRef    = useRef(0);

  const tick = useCallback(() => {
    frameRef.current++;
    const m = mouse.current;

    // ── Mueve la llama al mouse ──
    const fl = flameRef.current;
    if (fl) {
      // Hotspot: punta inferior de la llama (~centro-abajo)
      fl.style.transform = `translate3d(${m.x - 17}px, ${m.y - 40}px, 0)`;
    }

    // ── Punto de mira exacto en la posición del click ──
    const dot = dotRef.current;
    if (dot) {
      dot.style.transform = `translate3d(${m.x - 4}px, ${m.y - 4}px, 0)`;
    }

    // ── Partículas cada 2 frames ──
    if (frameRef.current % 2 === 0 && visible.current) {
      particles.current.push(createParticle(m.x, m.y - 10));
      // Máximo 80 partículas
      if (particles.current.length > 80) particles.current.shift();
    }

    // ── Canvas: dibuja partículas ──
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.current = particles.current.filter(p => {
          p.life -= 1;
          if (p.life <= 0) return false;

          p.x += p.vx;
          p.y += p.vy;
          p.vy *= 0.96; // fricción
          p.size *= 0.95;

          const alpha = p.life / p.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha * 0.85;
          ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
          ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          return true;
        });
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      wrapperRef.current?.remove();
      return;
    }

    // Resize canvas
    const resizeCanvas = () => {
      const c = canvasRef.current;
      if (c) { c.width = window.innerWidth; c.height = window.innerHeight; }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    document.documentElement.style.cursor = 'none';

    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    mouse.current = { ...center };
    rafRef.current = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (!visible.current) {
        visible.current = true;
        if (wrapperRef.current) wrapperRef.current.style.opacity = '1';
      }
    };

    const onOver = (e: MouseEvent) => {
      if ((e.target as Element).closest('a,button,input,textarea,select,[role="button"]')) {
        hovered.current = true;
        if (flameRef.current) flameRef.current.dataset.big = 'true';
      }
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element).closest('a,button,input,textarea,select,[role="button"]')) {
        hovered.current = false;
        if (flameRef.current) delete flameRef.current.dataset.big;
      }
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout',  onOut,  { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resizeCanvas);
      document.documentElement.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout',  onOut);
    };
  }, [tick]);

  return (
    <>
      <style>{`
        @keyframes flameDance {
          from { transform: scaleX(1)    scaleY(1)    rotate(-2deg); }
          to   { transform: scaleX(0.92) scaleY(1.05) rotate(2deg);  }
        }
        @keyframes dotPulse {
          from { transform: scale(1);   opacity: 1; }
          to   { transform: scale(1.4); opacity: 0.7; }
        }
      `}</style>

      <div
        ref={wrapperRef}
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          zIndex: 99999, opacity: 0, transition: 'opacity 0.3s ease',
        }}
      >
        {/* Canvas de partículas de brasa */}
        <canvas
          ref={canvasRef}
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
        />

        {/* Punto de mira — exactamente donde registra el click */}
        <div
          ref={dotRef}
          style={{
            position: 'fixed',
            width: '8px', height: '8px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff 0%, #FFD700 40%, #FF6600 100%)',
            boxShadow: '0 0 6px 2px rgba(255,150,0,0.8), 0 0 12px 4px rgba(255,80,0,0.4)',
            willChange: 'transform',
            animation: 'dotPulse 0.8s ease-in-out infinite alternate',
            zIndex: 2,
          }}
        />

        {/* Llama SVG — sigue el mouse */}
        <div ref={flameRef} style={{ position: 'fixed', willChange: 'transform', pointerEvents: 'none', zIndex: 1 }}>
          <FlameSVG big={hovered.current} />
        </div>
      </div>
    </>
  );
}
