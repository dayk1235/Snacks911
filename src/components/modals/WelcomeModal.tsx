'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { track } from '@/lib/analytics';

/**
 * WelcomeModal — shows ONCE to first-time visitors.
 * Captures WhatsApp number in exchange for 10% OFF.
 */
export default function WelcomeModal({
  onClaim,
}: {
  onClaim: (phone: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState('');
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    // Don't show if already claimed or dismissed
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('snacks911_welcome')) return;
    // Show after 1.5s delay
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const handleSubmit = () => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return;
    track('welcome_offer_claimed', { phone: clean });
    localStorage.setItem('snacks911_welcome', JSON.stringify({ phone: clean, ts: Date.now() }));
    setClaimed(true);
    onClaim(clean);
    setTimeout(() => setShow(false), 2000);
  };

  const handleDismiss = () => {
    localStorage.setItem('snacks911_welcome', 'dismissed');
    setShow(false);
  };

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'welcomeFadeIn 0.3s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card-premium"
        style={{
          width: '100%', maxWidth: '400px',
          padding: '2.25rem 2rem',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Glow accent */}
        <div style={{
          position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '80px',
          background: 'radial-gradient(ellipse, rgba(255,69,0,0.15), transparent)',
          pointerEvents: 'none',
        }} />

        {claimed ? (
          <div style={{ animation: 'welcomeSlideUp 0.4s ease' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: 800, color: '#22c55e' }}>
              ¡Listo! Tu código: EMERGENCIA10
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>
              Menciónalo al pedir por WhatsApp
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚨</div>
            <h3 style={{
              margin: '0 0 0.4rem', fontSize: '1.4rem', fontWeight: 800, color: '#fff',
              fontFamily: 'var(--font-display)', letterSpacing: '0.03em',
            }}>
              PRIMER PEDIDO:
              <span style={{ color: '#FF4500' }}> 10% OFF</span>
            </h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#777', lineHeight: 1.5 }}>
              Déjanos tu WhatsApp y te mandamos tu código de descuento.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="tel"
                placeholder="Tu WhatsApp (55 1234 5678)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,69,0,0.4)'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
              <Button
                onClick={handleSubmit}
                variant="primary"
                fullWidth
                disabled={phone.replace(/\D/g, '').length < 10}
                style={{
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  background: phone.replace(/\D/g, '').length < 10 ? 'rgba(255,69,0,0.3)' : undefined,
                }}
              >
                Quiero mi 10% OFF →
              </Button>
            </div>

            <Button
              onClick={handleDismiss}
              variant="ghost"
              fullWidth
              style={{ marginTop: '1.25rem', color: '#444', fontSize: '0.78rem' }}
            >
              Ahora no, gracias
            </Button>
          </>
        )}
      </div>
      <style>{`
        @keyframes welcomeFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes welcomeSlideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
