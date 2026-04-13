'use client';

import { useEffect, useRef, useCallback } from 'react';

export default function CustomCursor() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mouse = useRef({ x: -100, y: -100 });
  const hoverRef = useRef(false);
  const trail = useRef({ x: -100, y: -100 });

  const tick = useCallback(() => {
    const t = trail.current;
    const m = mouse.current;
    const scale = hoverRef.current ? 1.6 : 1;

    t.x += (m.x - t.x) * 0.15;
    t.y += (m.y - t.y) * 0.15;

    const el = trailRef.current;
    if (el) {
      el.style.transform = `translate3d(${t.x - 14}px, ${t.y - 14}px, 0) scale(${scale})`;
    }
    const main = mainRef.current;
    if (main) {
      main.style.transform = `translate3d(${m.x - 8}px, ${m.y - 8}px, 0) scale(${hoverRef.current ? 1.3 : 1})`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    // Early bail for touch devices — no cursor, no RAF, no listeners
    if (window.matchMedia('(pointer: coarse)').matches) {
      wrapperRef.current?.remove();
      return;
    }

    document.documentElement.style.cursor = 'none';

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    mouse.current = { x: cx, y: cy };
    trail.current = { x: cx, y: cy };

    rafRef.current = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    const onOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('a, button, input, textarea, select, [role="button"]')) {
        hoverRef.current = true;
      }
    };
    const onOut = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('a, button, input, textarea, select, [role="button"]')) {
        hoverRef.current = false;
      }
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.documentElement.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, [tick]);

  return (
    <div ref={wrapperRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
      <div
        ref={trailRef}
        className="custom-cursor-el"
        style={{
          position: 'fixed',
          width: '28px', height: '28px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,69,0,0.2) 0%, transparent 70%)',
          willChange: 'transform',
        }}
      />
      <div
        ref={mainRef}
        className="custom-cursor-el"
        style={{
          position: 'fixed',
          width: '16px', height: '16px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF4500, #FF6500)',
          boxShadow: '0 0 8px rgba(255,69,0,0.5)',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
