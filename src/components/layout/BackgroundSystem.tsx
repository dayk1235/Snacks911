'use client';

import { useEffect, useState } from 'react';

export default function BackgroundSystem() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // PERF FIX: throttled mousemove via requestAnimationFrame — was calling setState on every pixel-move (60-120 calls/sec)
    let rafId: number | null = null; // PERF FIX

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return; // PERF FIX: skip if a frame is already pending
      rafId = requestAnimationFrame(() => { // PERF FIX: batch updates to 1 per frame (~16ms)
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        setMousePos({ x, y });
        document.documentElement.style.setProperty('--mouse-x', x.toString());
        document.documentElement.style.setProperty('--mouse-y', y.toString());
        rafId = null;
      });
    };

    // Observer for section entrances
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once visible, we can stop observing
          observer.unobserve(entry.target);
        }
      });
    }, { 
      threshold: 0.05,
      rootMargin: '0px 0px -50px 0px' // Trigger slightly before it enters fully
    });

    // Find and observe all sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      // Add the reveal class if not already present
      if (!section.classList.contains('visible')) {
        section.classList.add('reveal-on-scroll');
      }
      observer.observe(section);
    });

    // Safety fallback: If something didn't reveal after 2 seconds, force it
    const timeout = setTimeout(() => {
      document.querySelectorAll('.reveal-on-scroll:not(.visible)').forEach(s => {
        s.classList.add('visible');
      });
    }, 2000);

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId); // PERF FIX: cancel pending frame on unmount
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      {/* Dynamic Gradients */}
      <div 
        className="fixed inset-0 pointer-events-none z-[-2]"
        style={{
          background: `
            radial-gradient(circle at calc(50% + (${mousePos.x} * 15%)) calc(50% + (${mousePos.y} * 15%)), oklch(15% 0.06 45 / 0.15) 0%, transparent 60%),
            radial-gradient(circle at 10% 10%, oklch(15% 0.05 255 / 0.05) 0%, transparent 40%)
          `
        }}
      />
      
      {/* Noise Layer */}
      <div 
        className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </>
  );
}
