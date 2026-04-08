'use client';

import { useEffect, useRef } from 'react';

interface BaseParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  color: string;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number; // 1 → 0
  color: string;
}

const BRAND_COLORS = [
  '#FF4500', // orange
  '#FFB800', // gold
  '#FF6A00', // orange-mid
  '#ffffff',  // white
];

const pickColor = (): string => {
  const r = Math.random();
  if (r < 0.25) return BRAND_COLORS[0];
  if (r < 0.42) return BRAND_COLORS[1];
  if (r < 0.55) return BRAND_COLORS[2];
  return BRAND_COLORS[3];
};

/**
 * Dual-layer particle system:
 * 1. Base field    — ambient floating particles + mouse attraction
 * 2. Trail layer   — short-lived sparks that emit when cursor moves fast
 */
export default function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const mouse = { x: -500, y: -500, active: false, vx: 0, vy: 0 };
    let lastEmitX = -500;
    let lastEmitY = -500;

    // Base particle count scales with screen area
    const COUNT = Math.min(120, Math.floor((canvas.width * canvas.height) / 9000));
    const base: BaseParticle[] = Array.from({ length: COUNT }, () => {
      const op = Math.random() * 0.3 + 0.08;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        size: Math.random() * 2 + 0.5,
        opacity: op,
        baseOpacity: op,
        color: pickColor(),
      };
    });

    const trails: TrailParticle[] = [];

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      const dx = nx - mouse.x;
      const dy = ny - mouse.y;
      const speed = Math.hypot(dx, dy);

      mouse.vx = dx;
      mouse.vy = dy;
      mouse.x = nx;
      mouse.y = ny;
      mouse.active = true;

      // Spawn trail sparks proportional to speed
      if (speed > 4) {
        const count = Math.min(Math.ceil(speed / 6), 8);
        for (let i = 0; i < count; i++) {
          const t = i / count;
          trails.push({
            x: lastEmitX + dx * t + (Math.random() - 0.5) * 6,
            y: lastEmitY + dy * t + (Math.random() - 0.5) * 6,
            vx: dx * 0.04 + (Math.random() - 0.5) * 1.2,
            vy: dy * 0.04 + (Math.random() - 0.5) * 1.2,
            size: Math.random() * 2.5 + 0.8,
            life: 1,
            color: Math.random() > 0.45 ? '#FF4500' : '#FFB800',
          });
        }
        lastEmitX = nx;
        lastEmitY = ny;
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    const ATTRACT_R = 200;
    const CONNECT_D = 100;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Base particles ──────────────────────────────────────────────────
      for (const p of base) {
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < ATTRACT_R && dist > 0) {
            const force = (ATTRACT_R - dist) / ATTRACT_R;
            p.vx += (dx / dist) * force * 0.018;
            p.vy += (dy / dist) * force * 0.018;
            p.opacity = Math.min(p.baseOpacity + force * 0.55, 0.9);
          } else {
            p.opacity += (p.baseOpacity - p.opacity) * 0.04;
          }
        }

        p.vx *= 0.98;
        p.vy *= 0.98;

        // Restore random drift when nearly stopped
        if (Math.abs(p.vx) < 0.015) p.vx += (Math.random() - 0.5) * 0.04;
        if (Math.abs(p.vy) < 0.015) p.vy += (Math.random() - 0.5) * 0.04;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -10) p.x = canvas.width + 10;
        else if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        else if (p.y > canvas.height + 10) p.y = -10;

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Connection lines between nearby base particles ──────────────────
      for (let i = 0; i < base.length; i++) {
        for (let j = i + 1; j < base.length; j++) {
          const dx = base[i].x - base[j].x;
          const dy = base[i].y - base[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < CONNECT_D) {
            const a = (1 - dist / CONNECT_D) * 0.1;
            ctx.globalAlpha = a;
            ctx.strokeStyle = '#FF4500';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(base[i].x, base[i].y);
            ctx.lineTo(base[j].x, base[j].y);
            ctx.stroke();
          }
        }
      }

      // ── Trail sparks ────────────────────────────────────────────────────
      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        t.life -= 0.045;

        if (t.life <= 0 || t.size < 0.15) {
          trails.splice(i, 1);
          continue;
        }

        t.vx *= 0.93;
        t.vy *= 0.93;
        t.x += t.vx;
        t.y += t.vy;
        t.size *= 0.96;

        const glow = t.life * 0.75;
        ctx.globalAlpha = glow;
        ctx.shadowBlur = 8;
        ctx.shadowColor = t.color;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
}
