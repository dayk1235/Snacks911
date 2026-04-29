'use client';

import { useState, useEffect, useRef } from 'react';

export default function DecisionLock() {
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (closed || show) return;

      // Si hay scroll, reiniciamos el timer de 6 segundos
      if (timerRef.current) clearTimeout(timerRef.current);
      
      timerRef.current = setTimeout(() => {
        setShow(true);
      }, 6000);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [closed, show]);

  const handlePick = (val: string) => {
    setShow(false);
    setClosed(true);
    // Abrir el chat con el producto pre-seleccionado
    window.dispatchEvent(new CustomEvent('open-snacks-chat', { detail: { product: val } }));
  };

  if (!show || closed) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        width: '320px', background: '#111', border: '1px solid #FF4500',
        borderRadius: '24px', padding: '2rem', textAlign: 'center',
        boxShadow: '0 0 40px rgba(255, 69, 0, 0.4)',
        animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 800 }}>
          🔥 ¿Qué se te antoja?
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Combo Mixto 911', value: 'combo_mixto' },
            { label: 'Boneless Power 911', value: 'boneless_power' },
            { label: 'Alitas Fuego 911', value: 'alitas_fuego' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => handlePick(opt.value)}
              style={{
                background: 'linear-gradient(135deg, #222, #111)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', padding: '1rem', color: '#fff',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#FF4500';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button 
          onClick={() => { setShow(false); setClosed(true); }}
          style={{
            marginTop: '1.5rem', background: 'none', border: 'none',
            color: '#666', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline'
          }}
        >
          Solo estoy viendo
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { 
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
