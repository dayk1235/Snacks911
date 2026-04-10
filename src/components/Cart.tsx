'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import { AdminStore } from '@/lib/adminStore';
import type { CartItem } from '@/types';
import type { AdminProduct } from '@/lib/adminTypes';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, delta: number) => void;
  total: number;
  onClearCart: () => void;
  onAddExtra?: (extra: AdminProduct) => void;
}

/* ── Order Confirm Modal ──────────────────────────────────────────────────── */
function OrderConfirmModal({
  waUrl,
  onConfirm,
  onRetry,
  onCancel,
}: {
  waUrl: string;
  onConfirm: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  // Restore native cursor while this modal is open
  useEffect(() => {
    const prev = document.body.style.cursor;
    document.body.style.cssText += '; cursor: auto !important';
    // Also stamp a flag on html so globals.css can react
    document.documentElement.setAttribute('data-cursor-restore', 'true');
    return () => {
      document.body.style.cursor = prev;
      document.documentElement.removeAttribute('data-cursor-restore');
    };
  }, []);

  return (
    <div
      data-order-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'cartFadeIn 0.25s ease',
        cursor: 'default',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(14,14,14,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          padding: '2rem',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
          animation: 'cartSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center',
          cursor: 'default',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>📱</div>

        <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
          ¿Se envió tu pedido?
        </h3>
        <p style={{ margin: '0 0 1.75rem', fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>
          Confirma si pudiste enviar el mensaje por WhatsApp.
          Si algo falló, puedes reintentarlo.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Confirm */}
          <button
            onClick={onConfirm}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg,#1EB854,#15a347)';
              (e.currentTarget as HTMLElement).style.boxShadow  = '0 8px 24px rgba(30,184,84,0.35)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg,#25D366,#1EB854)';
              (e.currentTarget as HTMLElement).style.boxShadow  = '0 4px 16px rgba(37,211,102,0.25)';
            }}
            style={{
              background: 'linear-gradient(135deg,#25D366,#1EB854)',
              border: 'none', borderRadius: '14px',
              padding: '0.85rem', color: '#fff',
              fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(37,211,102,0.25)',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            ✅ Sí, pedido enviado — vaciar carrito
          </button>

          {/* Retry */}
          <button
            onClick={onRetry}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background   = 'rgba(255,69,0,0.14)';
              (e.currentTarget as HTMLElement).style.borderColor  = 'rgba(255,69,0,0.4)';
              (e.currentTarget as HTMLElement).style.color        = '#FF5500';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background   = 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLElement).style.borderColor  = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLElement).style.color        = '#aaa';
            }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '0.8rem', color: '#aaa',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            🔄 No llegó — reintentar WhatsApp
          </button>

          {/* Cancel */}
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none',
              color: '#444', fontSize: '0.8rem',
              cursor: 'pointer', padding: '0.25rem',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#777'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#444'; }}
          >
            Volver al carrito
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cartFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes cartSlideUp { from { opacity:0; transform:translateY(20px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        /* Restore cursor inside this modal regardless of global rules */
        [data-order-modal="true"],
        [data-order-modal="true"] * { cursor: default !important; }
        /* Also restore when html has data-cursor-restore attr */
        html[data-cursor-restore="true"] body *  { cursor: default !important; }
        html[data-cursor-restore="true"] .custom-cursor-el { display: none !important; }
      `}</style>
    </div>
  );
}

/* ── Compact Extra Row (inside cart) ─────────────────────────────────────── */
function CartExtras({
  items,
  onAddExtra,
}: {
  items: CartItem[];
  onAddExtra: (extra: AdminProduct) => void;
}) {
  const [allExtras, setAllExtras] = useState<AdminProduct[]>([]);
  const [added, setAdded]         = useState<Set<string>>(new Set());

  useEffect(() => {
    AdminStore.getProducts().then(all => {
      setAllExtras(all.filter(p => p.category === 'extras' && p.available));
    });
  }, []);

  // Filter: show extra if no restriction (empty applicableProductIds)
  // OR if at least one cart item ID matches the extra's applicable list
  const cartItemIds = items.map(i => i.id.toString());
  const extras = allExtras.filter(extra => {
    const ids = extra.applicableProductIds ?? [];
    if (ids.length === 0) return true;           // no restriction → show always
    return ids.some(id => cartItemIds.includes(id)); // show if cart has a matching product
  });

  if (extras.length === 0) return null;

  const handleAdd = (extra: AdminProduct) => {
    onAddExtra(extra);
    setAdded(prev => new Set(prev).add(extra.id));
    // Reset after 1.5s so they can add again
    setTimeout(() => setAdded(prev => {
      const next = new Set(prev);
      next.delete(extra.id);
      return next;
    }), 1500);
  };

  return (
    <div style={{
      padding: '1rem 1.25rem',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <p style={{
        fontSize: '0.7rem', color: '#FF4500', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        margin: '0 0 0.75rem',
      }}>
        🍋 ¿Le agregas algo?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {extras.map(extra => {
          const isAdded = added.has(extra.id);
          return (
            <div
              key={extra.id}
              style={{
                display: 'flex', alignItems: 'center',
                gap: '0.75rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '10px',
                background: isAdded ? 'rgba(255,69,0,0.08)' : 'rgba(255,255,255,0.03)',
                border: isAdded ? '1px solid rgba(255,69,0,0.25)' : '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Name + price */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ccc' }}>{extra.name}</div>
                <div style={{ fontSize: '0.7rem', color: extra.price === 0 ? '#22c55e' : '#888', fontWeight: 600 }}>
                  {extra.price === 0 ? '¡Gratis!' : `+$${extra.price}`}
                </div>
              </div>

              {/* Add button */}
              <button
                onClick={() => handleAdd(extra)}
                disabled={isAdded}
                onMouseEnter={e => {
                  if (!isAdded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.15)';
                }}
                onMouseLeave={e => {
                  if (!isAdded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                }}
                style={{
                  width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                  background: isAdded ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                  border: isAdded ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  color: isAdded ? '#22c55e' : '#fff',
                  fontSize: isAdded ? '0.75rem' : '1rem',
                  fontWeight: 700,
                  cursor: isAdded ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  lineHeight: 1,
                }}
              >
                {isAdded ? '✓' : '+'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Cart ────────────────────────────────────────────────────────────── */
export default function Cart({ isOpen, onClose, items, onUpdateQuantity, total, onClearCart, onAddExtra }: CartProps) {
  const drawerRef       = useRef<HTMLDivElement>(null);
  const backdropRef     = useRef<HTMLDivElement>(null);
  const itemsRef        = useRef<HTMLDivElement>(null);
  const prevItemsLength = useRef(0);
  const initialized     = useRef(false);

  const [whatsappNumber, setWhatsappNumber] = useState('525584507458');
  const [showConfirm, setShowConfirm]       = useState(false);
  const [waUrl, setWaUrl]                   = useState('');

  /* ── Load WhatsApp number ──────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      AdminStore.getSettings().then(s => {
        if (s?.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      AdminStore.getSettings().then(s => {
        if (s?.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
      });
    }
  }, [isOpen]);

  /* ── Drawer animation ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!drawerRef.current || !backdropRef.current) return;

    if (!initialized.current) {
      gsap.set(drawerRef.current, { xPercent: 100 });
      gsap.set(backdropRef.current, { opacity: 0, pointerEvents: 'none' });
      initialized.current = true;
      return;
    }

    if (isOpen) {
      gsap.set(backdropRef.current, { pointerEvents: 'auto' });
      gsap.to(backdropRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(drawerRef.current,   { xPercent: 0, duration: 0.5, ease: 'power4.out' });
    } else {
      gsap.to(backdropRef.current, {
        opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => { gsap.set(backdropRef.current, { pointerEvents: 'none' }); },
      });
      gsap.to(drawerRef.current, { xPercent: 100, duration: 0.4, ease: 'power3.in' });
    }
  }, [isOpen]);

  /* ── Animate new item ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (items.length > prevItemsLength.current && itemsRef.current) {
      const children = Array.from(itemsRef.current.children);
      const last = children[children.length - 1];
      if (last) gsap.from(last, { x: 40, opacity: 0, duration: 0.35, ease: 'power3.out' });
    }
    prevItemsLength.current = items.length;
  }, [items.length]);

  /* ── Build WhatsApp URL ────────────────────────────────────────────────── */
  const buildWaUrl = useCallback(() => {
    const mainItems  = items.filter(i => !i.isStandaloneExtra);
    const extraItems = items.filter(i => i.isStandaloneExtra);

    // Build product lines with their chosen extras
    const productLines = mainItems.map(i => {
      let line = `• ${i.name} x${i.quantity} — $${i.price * i.quantity}`;
      if (i.linkedExtras && i.linkedExtras.length > 0) {
        line += `\n   ↳ Con extras: ${i.linkedExtras.join(', ')}`;
      }
      return line;
    });

    // Build standalone extras block
    const extraLines = extraItems.map(i =>
      `  + ${i.name} x${i.quantity} — $${i.price * i.quantity}`
    );

    let message = `🚨 *PEDIDO SNACKS 911*\n\n`;

    if (productLines.length > 0) {
      message += `*🍗 Productos:*\n${productLines.join('\n')}\n`;
    }

    if (extraLines.length > 0) {
      message += `\n*🍋 Extras adicionales:*\n${extraLines.join('\n')}\n`;
    }

    message += `\n💰 *Total: $${total}*\n\n¡Quiero hacer este pedido!`;

    const cleanNum = (whatsappNumber || '525584507458').replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
  }, [items, total, whatsappNumber]);

  const handleWhatsApp = () => {
    const url = buildWaUrl();
    setWaUrl(url);
    window.open(url, '_blank');
    setTimeout(() => setShowConfirm(true), 1200);
  };

  const handleConfirm = () => { setShowConfirm(false); onClearCart(); onClose(); };
  const handleRetry   = () => {
    window.open(waUrl, '_blank');
    setShowConfirm(false);
    setTimeout(() => setShowConfirm(true), 1500);
  };
  const handleCancel  = () => setShowConfirm(false);

  /* ── Handle extra added from cart ─────────────────────────────────────── */
  const handleAddExtra = (extra: AdminProduct) => {
    if (onAddExtra) {
      onAddExtra(extra);
    } else {
      // Fallback: convert AdminProduct → CartItem-compatible and add via parent callback
      // This is handled in page.tsx
    }
  };

  return (
    <>
      {showConfirm && (
        <OrderConfirmModal
          waUrl={waUrl}
          onConfirm={handleConfirm}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      )}

      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
                  position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(420px, 100vw)',
          background: 'rgba(14,14,14,0.95)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderLeft: '1px solid rgba(255,255,255,0.09)',
          zIndex: 300,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>🛒 Tu Pedido</h2>
          <button
            onClick={onClose}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.12, rotate: 90, duration: 0.2 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, rotate: 0, duration: 0.2 })}
            style={{
              background: 'rgba(255,255,255,0.07)', border: 'none',
              borderRadius: '8px', width: '36px', height: '36px',
              cursor: 'pointer', color: '#fff', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', padding: '5rem 1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                Tu carrito está vacío.<br />¡Agrega algo rico!
              </p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div ref={itemsRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
                {items.map(item => {
                  const isExtra = item.isStandaloneExtra;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', gap: '0.75rem',
                        background: isExtra
                          ? 'rgba(255,69,0,0.06)'
                          : 'rgba(255,255,255,0.04)',
                        borderRadius: '14px',
                        padding: isExtra ? '0.65rem 0.85rem' : '0.85rem',
                        alignItems: 'flex-start',
                        border: isExtra
                          ? '1px solid rgba(255,69,0,0.18)'
                          : '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        width: isExtra ? '40px' : '52px',
                        height: isExtra ? '40px' : '52px',
                        borderRadius: isExtra ? '8px' : '10px',
                        overflow: 'hidden', flexShrink: 0,
                        background: '#222',
                        border: isExtra ? '1px solid rgba(255,69,0,0.2)' : 'none',
                      }}>
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          flexWrap: 'wrap',
                        }}>
                          {isExtra && (
                            <span style={{
                              fontSize: '0.6rem', fontWeight: 700,
                              letterSpacing: '0.1em', textTransform: 'uppercase',
                              color: '#FF5500', padding: '0.15rem 0.45rem',
                              background: 'rgba(255,69,0,0.12)',
                              border: '1px solid rgba(255,69,0,0.2)',
                              borderRadius: '4px',
                            }}>Extra</span>
                          )}
                          <span style={{
                            fontWeight: 700,
                            fontSize: isExtra ? '0.82rem' : '0.9rem',
                            color: isExtra ? '#bbb' : '#fff',
                            lineHeight: 1.3,
                          }}>
                            {item.name}
                          </span>
                        </div>

                        {/* Extras description tags */}
                        {!isExtra && item.linkedExtras && item.linkedExtras.length > 0 && (
                          <div style={{
                            display: 'flex', flexWrap: 'wrap',
                            gap: '0.3rem', marginTop: '0.35rem',
                          }}>
                            {item.linkedExtras.map(name => (
                              <span key={name} style={{
                                fontSize: '0.65rem', fontWeight: 600,
                                padding: '0.15rem 0.5rem',
                                background: 'rgba(255,184,0,0.08)',
                                border: '1px solid rgba(255,184,0,0.18)',
                                borderRadius: '20px', color: '#F59E0B',
                              }}>+ {name}</span>
                            ))}
                          </div>
                        )}

                        <div style={{
                          color: '#FF4500', fontWeight: 900,
                          fontSize: isExtra ? '0.88rem' : '1rem',
                          marginTop: '0.3rem',
                        }}>${item.price * item.quantity}</div>
                      </div>

                      {/* Quantity controls */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: '0.35rem', flexShrink: 0, alignSelf: 'center',
                      }}>
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.15, duration: 0.15 })}
                          onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.15 })}
                          style={{
                            width: '26px', height: '26px', borderRadius: '7px',
                            background: 'rgba(255,255,255,0.08)', border: 'none',
                            color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >−</button>
                        <span style={{
                          fontWeight: 700, minWidth: '16px',
                          textAlign: 'center', fontSize: '0.85rem',
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.15, duration: 0.15 })}
                          onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.15 })}
                          style={{
                            width: '26px', height: '26px', borderRadius: '7px',
                            background: '#FF4500', border: 'none',
                            color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extras upsell strip */}
              <CartExtras items={items} onAddExtra={handleAddExtra} />
            </>
          )}
        </div>

        {/* Footer checkout */}
        {items.length > 0 && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: '#777', fontSize: '0.9rem' }}>Total</span>
              <span style={{ fontWeight: 900, color: '#FF4500', fontSize: '1.5rem' }}>${total}</span>
            </div>
            <button
              id="checkout-whatsapp"
              onClick={handleWhatsApp}
              onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.03, duration: 0.18, ease: 'power2.out' })}
              onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.18, ease: 'power2.out' })}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg,#25D366,#128C7E)',
                border: 'none', borderRadius: '14px',
                padding: '1rem', color: '#fff',
                fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(37,211,102,0.2)',
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
