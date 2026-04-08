'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { CartItem } from '@/types';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, delta: number) => void;
  total: number;
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, total }: CartProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const prevItemsLength = useRef(0);

  const initialized = useRef(false);

  // Initialize + animate on isOpen change
  useEffect(() => {
    if (!drawerRef.current || !backdropRef.current) return;

    if (!initialized.current) {
      // First run: set to hidden without animation
      gsap.set(drawerRef.current, { xPercent: 100 });
      gsap.set(backdropRef.current, { opacity: 0, pointerEvents: 'none' });
      initialized.current = true;
      return;
    }

    if (isOpen) {
      gsap.set(backdropRef.current, { pointerEvents: 'auto' });
      gsap.to(backdropRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(drawerRef.current, { xPercent: 0, duration: 0.5, ease: 'power4.out' });
    } else {
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => { gsap.set(backdropRef.current, { pointerEvents: 'none' }); },
      });
      gsap.to(drawerRef.current, { xPercent: 100, duration: 0.4, ease: 'power3.in' });
    }
  }, [isOpen]);

  // Animate new item entering the list
  useEffect(() => {
    if (items.length > prevItemsLength.current && itemsRef.current) {
      const children = Array.from(itemsRef.current.children);
      const last = children[children.length - 1];
      if (last) {
        gsap.from(last, { x: 40, opacity: 0, duration: 0.35, ease: 'power3.out' });
      }
    }
    prevItemsLength.current = items.length;
  }, [items.length]);

  const handleWhatsApp = () => {
    const lines = items
      .map((item) => `• ${item.name} x${item.quantity} — $${item.price * item.quantity}`)
      .join('\n');
    const message = `🚨 *PEDIDO SNACKS 911*\n\n${lines}\n\n💰 *Total: $${total}*\n\n¡Quiero hacer este pedido!`;
    window.open(`https://wa.me/1234567890?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      {/* Backdrop — always in DOM, controlled by GSAP */}
      <div
        ref={backdropRef}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
        }}
      />

      {/* Drawer — always in DOM, controlled by GSAP */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '92vw',
          background: '#111',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>🛒 Tu Pedido</h2>
          <button
            onClick={onClose}
            onMouseEnter={(e) =>
              gsap.to(e.currentTarget, { scale: 1.12, rotate: 90, duration: 0.2 })
            }
            onMouseLeave={(e) =>
              gsap.to(e.currentTarget, { scale: 1, rotate: 0, duration: 0.2 })
            }
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', paddingTop: '5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                Tu carrito está vacío.
                <br />
                ¡Agrega algo rico!
              </p>
            </div>
          ) : (
            <div ref={itemsRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '0.85rem',
                    background: '#1a1a1a',
                    borderRadius: '14px',
                    padding: '0.85rem',
                    alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#222',
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}
                    >
                      {item.name}
                    </div>
                    <div style={{ color: '#FF4500', fontWeight: 900, fontSize: '1rem' }}>
                      ${item.price * item.quantity}
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      flexShrink: 0,
                    }}
                  >
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      onMouseEnter={(e) =>
                        gsap.to(e.currentTarget, { scale: 1.15, duration: 0.15 })
                      }
                      onMouseLeave={(e) =>
                        gsap.to(e.currentTarget, { scale: 1, duration: 0.15 })
                      }
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontWeight: 700,
                        minWidth: '18px',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      onMouseEnter={(e) =>
                        gsap.to(e.currentTarget, { scale: 1.15, duration: 0.15 })
                      }
                      onMouseLeave={(e) =>
                        gsap.to(e.currentTarget, { scale: 1, duration: 0.15 })
                      }
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        background: '#FF4500',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <span style={{ color: '#777', fontSize: '0.9rem' }}>Total</span>
              <span style={{ fontWeight: 900, color: '#FF4500', fontSize: '1.5rem' }}>
                ${total}
              </span>
            </div>
            <button
              id="checkout-whatsapp"
              onClick={handleWhatsApp}
              onMouseEnter={(e) =>
                gsap.to(e.currentTarget, { scale: 1.03, duration: 0.18, ease: 'power2.out' })
              }
              onMouseLeave={(e) =>
                gsap.to(e.currentTarget, { scale: 1, duration: 0.18, ease: 'power2.out' })
              }
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                border: 'none',
                borderRadius: '14px',
                padding: '1rem',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              📱 Pedir por WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
}
