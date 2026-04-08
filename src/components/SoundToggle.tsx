'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { initAudio, toggleSound, isSoundEnabled, playHover, playClick } from '@/lib/sound';

/**
 * Sound toggle button + global sound event listeners.
 * Must be user-gesture initiated (browser AudioContext policy).
 */
export default function SoundToggle() {
  const [on, setOn] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  // Global hover/click listeners for sound feedback
  useEffect(() => {
    if (!on) return;

    const hoverHandler = (e: MouseEvent) => {
      if ((e.target as Element).closest('a, button')) playHover();
    };
    const clickHandler = () => playClick();

    document.addEventListener('mouseover', hoverHandler);
    document.addEventListener('click', clickHandler);

    return () => {
      document.removeEventListener('mouseover', hoverHandler);
      document.removeEventListener('click', clickHandler);
    };
  }, [on]);

  const handleToggle = () => {
    initAudio();
    const next = toggleSound();
    setOn(next);

    // Button burst animation
    gsap.fromTo(
      btnRef.current,
      { scale: 0.88 },
      { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
    );

    // Label fade
    gsap.fromTo(
      labelRef.current,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  };

  return (
    <button
      ref={btnRef}
      id="sound-toggle"
      onClick={handleToggle}
      onMouseEnter={() =>
        gsap.to(btnRef.current, { scale: 1.1, duration: 0.18, ease: 'power2.out' })
      }
      onMouseLeave={() =>
        gsap.to(btnRef.current, { scale: 1, duration: 0.18, ease: 'power2.out' })
      }
      title={on ? 'Desactivar sonido' : 'Activar sonido'}
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 500,
        background: on ? 'rgba(255,69,0,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${on ? 'rgba(255,69,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '50px',
        padding: '0.45rem 0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{on ? '🔊' : '🔇'}</span>
      <span
        ref={labelRef}
        style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: on ? '#FF7040' : '#555',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          transition: 'color 0.3s',
        }}
      >
        {on ? 'SFX ON' : 'SFX OFF'}
      </span>
    </button>
  );
}
