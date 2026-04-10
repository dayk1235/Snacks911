'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;       // 1 → 0
  decay: number;      // life units lost per frame
  colorIdx: number;
  turbPhase: number;
  turbFreq: number;
  turbAmp: number;
}

interface TrailSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface GlowOrb {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

/* ─── Palette ─────────────────────────────────────────────────────────────── */
// Fire ramp: core → edge → tip
const EMBER_COLORS = [
  '#ffffff',   // 0 — white core (hottest)
  '#FFE566',   // 1 — yellow
  '#FFB800',   // 2 — brand gold
  '#FF8C00',   // 3 — amber
  '#FF6A00',   // 4 — orange-mid
  '#FF4500',   // 5 — brand orange (common)
  '#CC2200',   // 6 — deep red
];

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function FireCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const isLowEnd = prefersReducedMotion || isCoarsePointer || window.innerWidth < 768;

    /* ── Resize ─────────────────────────────────────────────────────────── */
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    if (prefersReducedMotion) {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(255,69,0,0.04)');
      gradient.addColorStop(0.55, 'rgba(255,120,0,0.08)');
      gradient.addColorStop(1, 'rgba(255,69,0,0.14)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    /* ── State ──────────────────────────────────────────────────────────── */
    const mouse = {
      x: canvas.width / 2,
      y: canvas.height * 0.8,
      tx: canvas.width / 2,
      ty: canvas.height * 0.8,
      active: false,
    };
    let scrollY  = 0;
    let time     = 0;
    let isDocumentVisible = !document.hidden;
    let isInView = true;

    /* ── Listeners ──────────────────────────────────────────────────────── */
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx     = e.clientX - r.left;
      mouse.ty     = e.clientY - r.top;
      mouse.active = true;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    const onVisibilityChange = () => {
      isDocumentVisible = !document.hidden;
      if (isDocumentVisible && isInView && !running) {
        raf = requestAnimationFrame(draw);
      }
    };

    if (!isCoarsePointer) {
      window.addEventListener('mousemove', onMove);
    }
    window.addEventListener('scroll',    onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    /* ── Glow orbs (GSAP animates plain objects) ────────────────────────── */
    const orbs: GlowOrb[] = [
      { x: canvas.width * 0.25, y: canvas.height * 0.75, r: canvas.width * 0.45, alpha: 0.10 },
      { x: canvas.width * 0.75, y: canvas.height * 0.60, r: canvas.width * 0.38, alpha: 0.07 },
      { x: canvas.width * 0.50, y: canvas.height * 0.90, r: canvas.width * 0.55, alpha: 0.12 },
    ];

    const animateOrb = (orb: GlowOrb) => {
      gsap.to(orb, {
        x:        Math.random() * canvas.width,
        y:        canvas.height * 0.4 + Math.random() * canvas.height * 0.55,
        r:        canvas.width * (0.3 + Math.random() * 0.35),
        alpha:    0.04 + Math.random() * 0.1,
        duration: 5 + Math.random() * 6,
        ease:     'sine.inOut',
        onComplete: () => animateOrb(orb),
      });
    };
    orbs.forEach(animateOrb);

    /* ── Ember factory ──────────────────────────────────────────────────── */
    const TARGET_COUNT = isLowEnd ? 28 : 72;

    const mkEmber = (
      spawnX?: number,
      spawnY?: number,
      fast?: boolean,
    ): Ember => ({
      x:          spawnX ?? Math.random() * canvas.width,
      y:          spawnY ?? canvas.height + Math.random() * 30,
      vx:         (Math.random() - 0.5) * 0.7,
      vy:         -(fast ? Math.random() * 3 + 2 : Math.random() * 1.6 + 0.6),
      size:        Math.random() * 3 + 0.8,
      life:        1,
      decay:       1 / (isLowEnd ? 110 : 160 + Math.random() * 120),
      colorIdx:    Math.floor(Math.random() * EMBER_COLORS.length),
      turbPhase:   Math.random() * Math.PI * 2,
      turbFreq:    Math.random() * 0.03 + 0.008,
      turbAmp:     Math.random() * 18 + 6,
    });

    /* Initialise at varied heights so the canvas fills instantly */
    const embers: Ember[] = Array.from({ length: TARGET_COUNT }, () => {
      const e = mkEmber(Math.random() * canvas.width, Math.random() * canvas.height);
      e.life = Math.random();  // stagger starting life
      return e;
    });

    /* ── Trail sparks (cursor) ──────────────────────────────────────────── */
    const trails: TrailSpark[] = [];
    let lastTrailX = mouse.x;
    let lastTrailY = mouse.y;

    /* ─────────────────────────────────────────────────────────────────────
       DRAW LOOP
    ───────────────────────────────────────────────────────────────────── */
    let raf = 0;
    let running = false;

    const draw = () => {
      if (!isDocumentVisible || !isInView) {
        running = false;
        return;
      }

      running = true;
      time++;
      const w = canvas.width;
      const h = canvas.height;

      /* Smooth mouse lerp */
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      /* Scroll intensity — embers speed up slightly as user scrolls */
      const scrollFactor = 1 + scrollY * 0.0003;

      ctx.clearRect(0, 0, w, h);

      /* ── 1. Ambient glow orbs ─────────────────────────────────────────── */
      const ORB_COLORS: [string, string][] = [
        ['255,69,0',  '180,20,0'],
        ['255,184,0', '200,80,0'],
        ['255,69,0',  '100,0,0'],
      ];
      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        const [c1, c2] = ORB_COLORS[i];
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0,   `rgba(${c1},${o.alpha})`);
        g.addColorStop(0.55,`rgba(${c2},${o.alpha * 0.45})`);
        g.addColorStop(1,   'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      /* ── 2. Fire-pool at bottom ──────────────────────────────────────── */
      const poolGrad = ctx.createRadialGradient(
        mouse.active ? mouse.x : w / 2, h,  0,
        mouse.active ? mouse.x : w / 2, h, h * 0.55,
      );
      poolGrad.addColorStop(0,    'rgba(255,120,0,0.18)');
      poolGrad.addColorStop(0.3,  'rgba(255,69,0,0.10)');
      poolGrad.addColorStop(0.65, 'rgba(180,20,0,0.04)');
      poolGrad.addColorStop(1,    'transparent');
      ctx.fillStyle = poolGrad;
      ctx.fillRect(0, 0, w, h);

      /* ── 3. Cursor aura ──────────────────────────────────────────────── */
      if (mouse.active) {
        const cg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
        cg.addColorStop(0,   'rgba(255,100,0,0.09)');
        cg.addColorStop(0.5, 'rgba(255,69,0,0.04)');
        cg.addColorStop(1,   'transparent');
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, w, h);
      }

      /* ── 4. Liquid BBQ waves ─────────────────────────────────────────── */
      const waveBaseY = h * 0.78;
      for (let wi = 0; wi < (isLowEnd ? 2 : 3); wi++) {
        const wFreq  = 0.006 + wi * 0.003;
        const wAmp   = 18    + wi * 10;
        const wSpeed = 0.006 + wi * 0.004;
        const wAlpha = 0.07  - wi * 0.018;

        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const tilt = mouse.active ? (mouse.x - w / 2) / w * 20 : 0;
          const y = waveBaseY
            + wAmp * Math.sin(x * wFreq + time * wSpeed + wi * 2.1)
            + wAmp * 0.4 * Math.sin(x * wFreq * 2.3 - time * wSpeed * 0.7)
            + tilt * (x / w - 0.5);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const wg = ctx.createLinearGradient(0, waveBaseY - wAmp, 0, h);
        wg.addColorStop(0,   `rgba(255,80,0,${wAlpha})`);
        wg.addColorStop(0.45,`rgba(180,30,0,${wAlpha * 0.6})`);
        wg.addColorStop(1,   `rgba(60,0,0,${wAlpha * 0.3})`);
        ctx.fillStyle = wg;
        ctx.fill();
      }

      /* ── 5. Rising embers ────────────────────────────────────────────── */
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life -= e.decay * scrollFactor;

        if (e.life <= 0) { embers[i] = mkEmber(); continue; }

        /* Turbulence */
        const turb = Math.sin(time * e.turbFreq + e.turbPhase) * e.turbAmp;
        e.x += e.vx + turb * 0.012;
        e.y += e.vy * scrollFactor;

        /* Cursor attract (subtle) */
        if (mouse.active) {
          const dx = mouse.x - e.x;
          const dy = mouse.y - e.y;
          const d  = Math.hypot(dx, dy);
          if (d < 200 && d > 0) {
            const f = (200 - d) / 200;
            e.vx += (dx / d) * f * 0.01;
            e.vy += (dy / d) * f * 0.008;
          }
        }
        e.vx *= 0.988;

        const sz    = e.size * (0.25 + e.life * 0.75);
        const alpha = e.life * (isLowEnd ? 0.7 : 0.8);
        const col   = EMBER_COLORS[e.colorIdx];

        ctx.save();
        ctx.globalAlpha = alpha;
        if (!isLowEnd && sz > 1.5) {
          ctx.shadowBlur  = sz * 5;
          ctx.shadowColor = col;
        }
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(e.x, e.y, Math.max(0.3, sz), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* ── 6. Cursor trail sparks ──────────────────────────────────────── */
      if (mouse.active) {
        const dx = mouse.x - lastTrailX;
        const dy = mouse.y - lastTrailY;
        const spd = Math.hypot(dx, dy);

        if (spd > 3) {
          const count = Math.min(Math.ceil(spd / 7), 7);
          for (let k = 0; k < count; k++) {
            trails.push({
              x:    mouse.x + (Math.random() - 0.5) * 8,
              y:    mouse.y + (Math.random() - 0.5) * 8,
              vx:   dx * 0.04 + (Math.random() - 0.5) * 1.5,
              vy:   dy * 0.04 - Math.random() * 1.2,
              size: Math.random() * 3 + 1,
              life: 1,
            });
          }
          lastTrailX = mouse.x;
          lastTrailY = mouse.y;
        }
      }

      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        t.life -= 0.05;
        if (t.life <= 0 || t.size < 0.2) { trails.splice(i, 1); continue; }
        t.x  += t.vx;
        t.y  += t.vy;
        t.vx *= 0.92;
        t.vy *= 0.92;
        t.size *= 0.955;

        const tCol = Math.random() > 0.5 ? '#FF4500' : '#FFB800';
        ctx.save();
        ctx.globalAlpha  = t.life * 0.85;
        ctx.shadowBlur   = 10;
        ctx.shadowColor  = tCol;
        ctx.fillStyle    = tCol;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* ── 7. Edge vignette ────────────────────────────────────────────── */
      const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.12, w / 2, h / 2, h);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(8,8,8,0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (!running && isDocumentVisible && isInView) {
        raf = requestAnimationFrame(draw);
      }
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        isInView = entry.isIntersecting;
        if (isInView && isDocumentVisible && !running) {
          raf = requestAnimationFrame(draw);
        }
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      if (!isCoarsePointer) {
        window.removeEventListener('mousemove', onMove);
      }
      window.removeEventListener('scroll',    onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      ro.disconnect();
      io.disconnect();
      orbs.forEach(o => gsap.killTweensOf(o));
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width:  '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
