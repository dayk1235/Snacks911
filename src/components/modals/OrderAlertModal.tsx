'use client';

import { useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { startOrderLoop, stopOrderLoop } from '@/lib/sound';

export interface PendingOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  items: { productName: string; quantity: number; price: number }[];
  createdAt: string;
}

interface OrderAlertModalProps {
  order: PendingOrder;
  onAccept: () => void;
}

export default function OrderAlertModal({ order, onAccept }: OrderAlertModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.cursor;
    document.body.style.setProperty('cursor', 'auto', 'important');

    // Start looping alert sound immediately
    startOrderLoop();

    return () => {
      document.body.style.removeProperty('cursor');
      stopOrderLoop();
    };
  }, []);

  const handleAccept = () => {
    stopOrderLoop();
    onAccept();
  };

  const timeAgo = (() => {
    const diff = Date.now() - new Date(order.createdAt).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return 'Hace segundos';
    const mins = Math.floor(secs / 60);
    return `Hace ${mins}m`;
  })();

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'orderAlertFadeIn 0.3s ease',
      }}
    >
      {/* Block overlay — catches all clicks */}
      <div style={{ position: 'absolute', inset: 0 }} />

      <div
        className="card-premium"
        style={{
          position: 'relative',
          width: '100%', maxWidth: '420px',
          padding: '2rem',
          border: '2px solid #FF4500',
          animation: 'orderAlertSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(255, 69, 0, 0.3), 0 30px 80px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Pulse ring */}
        <div style={{
          position: 'absolute', inset: '-4px',
          border: '2px solid rgba(255,69,0,0.3)', borderRadius: '22px',
          animation: 'orderAlertPulse 1.5s ease-in-out infinite',
        }} />

        {/* Alert icon */}
        <div style={{ marginBottom: '1rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'orderAlertShake 0.6s ease-in-out infinite' }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>

        <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.3rem', fontWeight: 900, color: '#FF4500', letterSpacing: '0.03em' }}>
          NUEVO PEDIDO
        </h2>
        <span style={{ fontSize: '0.72rem', color: '#555', letterSpacing: '0.08em' }}>
          {timeAgo}
        </span>

        {/* Order summary */}
        <div style={{
          marginTop: '1.25rem', padding: '1rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            {order.customerName || 'Sin nombre'}
            {order.customerPhone && (
              <span style={{ fontWeight: 400, color: '#666', marginLeft: '0.5rem' }}>
                · {order.customerPhone}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#aaa' }}>
                <span>{item.quantity}x {item.productName}</span>
                <span style={{ color: '#888' }}>${item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '0.75rem', paddingTop: '0.6rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between',
            fontSize: '1rem', fontWeight: 800, color: '#FF4500',
          }}>
            <span>Total</span>
            <span>${order.total}</span>
          </div>
        </div>

        {/* Accept button */}
        <Button
          onClick={handleAccept}
          variant="primary"
          fullWidth
          autoFocus
          style={{
            marginTop: '1.25rem',
            padding: '0.9rem',
            fontSize: '1rem',
          }}
        >
          ACEPTAR PEDIDO
        </Button>

        <style>{`
          @keyframes orderAlertFadeIn {
            from { opacity: 0; } to { opacity: 1; }
          }
          @keyframes orderAlertSlideIn {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes orderAlertPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.3; transform: scale(1.02); }
          }
          @keyframes orderAlertShake {
            0%, 100% { transform: rotate(0); }
            15%      { transform: rotate(-8deg); }
            30%      { transform: rotate(8deg); }
            45%      { transform: rotate(-5deg); }
            60%      { transform: rotate(5deg); }
            75%      { transform: rotate(-2deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
