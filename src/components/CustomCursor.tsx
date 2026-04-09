'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom cursor – chicken-wing themed 🍗
 * Uses pure CSS transform for 60fps fluidity.
 * - Main wing follows mouse instantly via translate3d (GPU-accelerated)
 * - Slight rotation based on movement direction
 * - Scale-up on hover over interactive elements
 */
export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  // Track movement direction for tilt
  const lastPos = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>(0);
  const trailX = useRef(0);
  const trailY = useRef(0);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const isHovering = useRef(false);

  const updateTrail = useCallback(() => {
    // Lerp with high speed factor for snappy follow
    trailX.current += (mouseX.current - trailX.current) * 0.35;
    trailY.current += (mouseY.current - trailY.current) * 0.35;

    if (trailRef.current) {
      trailRef.current.style.transform =
        `translate3d(${trailX.current}px, ${trailY.current}px, 0) scale(${isHovering.current ? 1.6 : 1})`;
    }

    rafId.current = requestAnimationFrame(updateTrail);
  }, []);

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    document.documentElement.style.cursor = 'none';

    const cursor = cursorRef.current!;
    let visible = false;

    const show = () => {
      if (visible) return;
      visible = true;
      cursor.parentElement!.style.opacity = '1';
    };

    const onMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;

      // Calculate tilt from movement delta
      const dx = x - lastPos.current.x;
      const dy = y - lastPos.current.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      // Clamp rotation for a natural feel
      const rotation = Math.max(-35, Math.min(35, angle * 0.3));

      mouseX.current = x;
      mouseY.current = y;

      // Instant move via translate3d (GPU composited)
      cursor.style.transform =
        `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${isHovering.current ? 1.3 : 1})`;

      lastPos.current = { x, y };
      show();
    };

    const onEnter = (e: MouseEvent) => {
      if (!(e.target as Element).closest('a, button, [data-cursor-hover], input, textarea, select')) return;
      isHovering.current = true;
      cursor.style.filter = 'drop-shadow(0 0 12px rgba(255,184,0,0.8)) brightness(1.2)';
    };

    const onLeave = (e: MouseEvent) => {
      if (!(e.target as Element).closest('a, button, [data-cursor-hover], input, textarea, select')) return;
      isHovering.current = false;
      cursor.style.filter = 'drop-shadow(0 0 6px rgba(255,69,0,0.5))';
    };

    const onClick = () => {
      cursor.style.transition = 'transform 0.08s ease-out';
      cursor.style.transform =
        `translate3d(${mouseX.current}px, ${mouseY.current}px, 0) rotate(0deg) scale(0.7)`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cursor.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
          cursor.style.transform =
            `translate3d(${mouseX.current}px, ${mouseY.current}px, 0) rotate(0deg) scale(1)`;
          setTimeout(() => {
            cursor.style.transition = 'filter 0.2s ease';
          }, 160);
        });
      });
    };

    // Start trail loop
    trailX.current = window.innerWidth / 2;
    trailY.current = window.innerHeight / 2;
    rafId.current = requestAnimationFrame(updateTrail);

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onEnter, { passive: true });
    document.addEventListener('mouseout', onLeave, { passive: true });
    document.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(rafId.current);
      document.documentElement.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onEnter);
      document.removeEventListener('mouseout', onLeave);
      document.removeEventListener('click', onClick);
    };
  }, [updateTrail]);

  return (
    <div style={{ opacity: 0, pointerEvents: 'none' }}>
      {/* Glow trail */}
      <div
        ref={trailRef}
        style={{
          position: 'fixed',
          top: '-14px',
          left: '-14px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,69,0,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 99998,
          willChange: 'transform',
          transition: 'transform 0.08s linear',
        }}
      />

      {/* Main wing cursor */}
      <div
        ref={cursorRef}
        style={{
          position: 'fixed',
          top: '-16px',
          left: '-4px',
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform, filter',
          transition: 'filter 0.2s ease',
          filter: 'drop-shadow(0 0 6px rgba(255,69,0,0.5))',
          fontSize: '0px',
          lineHeight: 0,
        }}
      >
        {/* SVG Chicken Wing / Drumstick cursor */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          {/* Bone stick */}
          <rect
            x="38" y="40" width="6" height="22" rx="3"
            fill="#F5E6D0"
            stroke="#D4C4A8"
            strokeWidth="1"
            transform="rotate(-15, 41, 51)"
          />
          <circle cx="39" cy="58" r="4" fill="#F5E6D0" stroke="#D4C4A8" strokeWidth="1" transform="rotate(-15, 41, 51)" />

          {/* Main wing meat */}
          <ellipse
            cx="28" cy="26" rx="22" ry="18"
            fill="url(#wingGradient)"
            stroke="#B8420A"
            strokeWidth="1.5"
          />

          {/* Wing detail – crispy texture lines */}
          <path d="M14 20 Q20 18, 26 21" stroke="#E85D1A" strokeWidth="1.2" fill="none" opacity="0.6" />
          <path d="M18 28 Q26 26, 34 29" stroke="#E85D1A" strokeWidth="1" fill="none" opacity="0.5" />
          <path d="M12 25 Q18 23, 24 26" stroke="#D44A0A" strokeWidth="0.8" fill="none" opacity="0.4" />

          {/* Sauce glaze highlight */}
          <ellipse cx="22" cy="22" rx="8" ry="5" fill="url(#sauceHighlight)" opacity="0.7" />
          <ellipse cx="32" cy="28" rx="5" ry="3" fill="url(#sauceHighlight2)" opacity="0.5" />

          {/* Hot steam lines */}
          <path d="M16 10 Q14 6, 16 2" stroke="#FF6B35" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="d" values="M16 10 Q14 6, 16 2;M16 10 Q18 6, 16 2;M16 10 Q14 6, 16 2" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M26 8 Q24 4, 26 0" stroke="#FFB800" strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="d" values="M26 8 Q24 4, 26 0;M26 8 Q28 4, 26 0;M26 8 Q24 4, 26 0" dur="2.2s" repeatCount="indefinite" />
          </path>

          <defs>
            <linearGradient id="wingGradient" x1="8" y1="12" x2="48" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="40%" stopColor="#E8501A" />
              <stop offset="70%" stopColor="#D44A0A" />
              <stop offset="100%" stopColor="#B53A06" />
            </linearGradient>
            <radialGradient id="sauceHighlight" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#FF9F60" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sauceHighlight2" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#FFB800" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
