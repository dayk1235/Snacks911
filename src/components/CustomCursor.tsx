'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Custom cursor with snappy feel.
 * - Dot: instant (no lag)
 * - Ring: fast lerp via gsap.quickSetter (smooth but responsive)
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    document.documentElement.style.cursor = 'none';

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let visible = false;
    let raf: number;

    // gsap.quickSetter caches references for zero-overhead per-frame updates
    const setDotX = gsap.quickSetter(dotRef.current!, 'x', 'px');
    const setDotY = gsap.quickSetter(dotRef.current!, 'y', 'px');
    const setRingX = gsap.quickSetter(ringRef.current!, 'x', 'px');
    const setRingY = gsap.quickSetter(ringRef.current!, 'y', 'px');

    const show = () => {
      if (visible) return;
      visible = true;
      gsap.to(wrapperRef.current, { opacity: 1, duration: 0.25 });
    };

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // Dot is instant
      setDotX(mouseX);
      setDotY(mouseY);
      show();
    };

    // Ring follows with lerp 0.22 — noticeably snappier than 0.12
    const loop = () => {
      ringX += (mouseX - ringX) * 0.22;
      ringY += (mouseY - ringY) * 0.22;
      setRingX(ringX);
      setRingY(ringY);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Hover: ring expands + gold glow, dot shrinks
    const onEnter = (e: MouseEvent) => {
      if (!(e.target as Element).closest('a, button, [data-cursor-hover]')) return;
      gsap.to(ringRef.current, {
        scale: 2.2,
        borderColor: 'rgba(255,184,0,0.85)',
        boxShadow: '0 0 22px rgba(255,184,0,0.5)',
        duration: 0.28,
        ease: 'power2.out',
      });
      gsap.to(dotRef.current, { scale: 0.3, backgroundColor: '#FFB800', duration: 0.28 });
    };

    const onLeave = (e: MouseEvent) => {
      if (!(e.target as Element).closest('a, button, [data-cursor-hover]')) return;
      gsap.to(ringRef.current, {
        scale: 1,
        borderColor: 'rgba(255,69,0,0.55)',
        boxShadow: '0 0 10px rgba(255,69,0,0.25)',
        duration: 0.28,
        ease: 'power2.out',
      });
      gsap.to(dotRef.current, { scale: 1, backgroundColor: '#FF4500', duration: 0.28 });
    };

    // Click: elastic ring pulse
    const onClick = () => {
      gsap.fromTo(
        ringRef.current,
        { scale: 0.75 },
        { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' }
      );
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onEnter);
    document.addEventListener('mouseout', onLeave);
    document.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onEnter);
      document.removeEventListener('mouseout', onLeave);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div ref={wrapperRef} style={{ opacity: 0, pointerEvents: 'none' }}>
      {/* Inner dot — instant */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: '-3.5px',
          left: '-3.5px',
          width: '7px',
          height: '7px',
          backgroundColor: '#FF4500',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 0 8px rgba(255,69,0,0.9)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Outer ring — lagged */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: '-19px',
          left: '-19px',
          width: '38px',
          height: '38px',
          border: '1.5px solid rgba(255,69,0,0.55)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99998,
          boxShadow: '0 0 10px rgba(255,69,0,0.25)',
        }}
      />
    </div>
  );
}
