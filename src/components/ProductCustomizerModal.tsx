'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import type { Product } from '@/data/products';
import type { AdminProduct } from '@/lib/adminTypes';
import { AdminStore } from '@/lib/adminStore';

// ─── Complementos incluidos por categoría ─────────────────────────────────────
const INCLUDED: Record<string, { id: string; label: string; emoji: string }[]> = {
  alitas: [
    { id: 'inc-aderezo', label: 'Aderezo Ranch', emoji: '🥛' },
    { id: 'inc-limones', label: 'Limones',        emoji: '🍋' },
    { id: 'inc-serv',    label: 'Servilletas',    emoji: '🧻' },
  ],
  boneless: [
    { id: 'inc-aderezo', label: 'Aderezo Ranch', emoji: '🥛' },
    { id: 'inc-limones', label: 'Limones',        emoji: '🍋' },
    { id: 'inc-serv',    label: 'Servilletas',    emoji: '🧻' },
  ],
  papas: [
    { id: 'inc-catsup', label: 'Catsup',       emoji: '🍅' },
    { id: 'inc-serv',   label: 'Servilletas',  emoji: '🧻' },
  ],
  combos: [
    { id: 'inc-aderezo', label: 'Aderezo Ranch', emoji: '🥛' },
    { id: 'inc-limones', label: 'Limones',        emoji: '🍋' },
    { id: 'inc-catsup',  label: 'Catsup',         emoji: '🍅' },
    { id: 'inc-serv',    label: 'Servilletas',    emoji: '🧻' },
  ],
};

interface Props {
  product: Product | null;
  onClose: () => void;
  /** Called when the user finishes both steps and confirms */
  onConfirm: (product: Product, includedSelected: string[], extras: AdminProduct[]) => void;
}

export default function ProductCustomizerModal({ product, onClose, onConfirm }: Props) {
  const overlayRef  = useRef<HTMLDivElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const step2Ref    = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [extras, setExtras] = useState<AdminProduct[]>([]);
  const [selectedIncluded, setSelectedIncluded] = useState<Set<string>>(new Set());
  const [selectedExtras, setSelectedExtras]     = useState<Set<string>>(new Set());

  // Load extras + reset state whenever product changes
  useEffect(() => {
    if (!product) return;
    AdminStore.getProducts().then(all => {
      setExtras(all.filter(p => p.category === 'extras' && p.available));
    });
    const included = INCLUDED[product.category] ?? [];
    setSelectedIncluded(new Set(included.map(i => i.id)));
    setSelectedExtras(new Set());
    setStep(1);
  }, [product]);

  // Entrance animation for the card
  useEffect(() => {
    if (!product) return;
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 48, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'back.out(1.5)' }
    );
  }, [product]);

  if (!product) return null;

  const included = INCLUDED[product.category] ?? [];

  const toggleIncluded = (id: string) => {
    setSelectedIncluded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Animate transition to step 2
  const goToStep2 = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      x: -30, opacity: 0, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        setStep(2);
        gsap.fromTo(cardRef.current,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, ease: 'back.out(1.4)' }
        );
      },
    });
  };

  // Animate back to step 1
  const goToStep1 = () => {
    gsap.to(cardRef.current, {
      x: 30, opacity: 0, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        setStep(1);
        gsap.fromTo(cardRef.current,
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, ease: 'back.out(1.4)' }
        );
      },
    });
  };

  const handleClose = () => {
    gsap.to(cardRef.current, { opacity: 0, y: 30, scale: 0.95, duration: 0.22, ease: 'power2.in' });
    gsap.to(overlayRef.current, {
      opacity: 0, duration: 0.22, delay: 0.1, ease: 'power2.in',
      onComplete: onClose,
    });
  };

  const handleConfirm = () => {
    const chosenExtras = extras.filter(e => selectedExtras.has(e.id));
    gsap.to(cardRef.current, {
      scale: 1.03, opacity: 0, y: -20, duration: 0.25, ease: 'power2.in',
      onComplete: () => onConfirm(product, Array.from(selectedIncluded), chosenExtras),
    });
  };

  const extraTotal = extras.filter(e => selectedExtras.has(e.id)).reduce((s, e) => s + e.price, 0);

  // ── Step indicator ───────────────────────────────────────────────────────
  const StepDots = () => (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 0 0' }}>
      {[1, 2].map(n => (
        <div key={n} style={{
          width: n === step ? '20px' : '6px', height: '6px',
          borderRadius: '3px',
          background: n === step ? '#FF4500' : 'rgba(255,255,255,0.15)',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  );

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        ref={cardRef}
        style={{
          width: '100%', maxWidth: '520px',
          background: '#111',
          border: '1px solid rgba(255,69,0,0.18)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255,69,0,0.06)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Product hero (always visible) ── */}
        <div style={{ position: 'relative', height: '190px', background: '#1a1a1a', flexShrink: 0 }}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            loading="eager"
            sizes="(max-width: 600px) 100vw, 520px"
            style={{ objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(17,17,17,0.96) 0%, rgba(17,17,17,0.25) 50%, transparent 100%)',
          }} />

          {/* Close */}
          <button onClick={handleClose} style={{
            position: 'absolute', top: '12px', right: '12px', zIndex: 10,
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', fontSize: '1rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>

          {/* Back button (step 2 only) */}
          {step === 2 && (
            <button onClick={goToStep1} style={{
              position: 'absolute', top: '12px', left: '12px', zIndex: 10,
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px', padding: '0.35rem 0.85rem',
              color: '#aaa', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            }}>
              ← Volver
            </button>
          )}

          <div style={{ position: 'absolute', bottom: '14px', left: '18px', right: '18px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 400,
              color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.15rem',
            }}>
              {product.name}
            </h2>
            <p style={{ color: '#777', fontSize: '0.8rem', margin: 0 }}>{product.description}</p>
          </div>
        </div>

        {/* Step dots */}
        <StepDots />

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 0.5rem' }}>

          {/* ═══ STEP 1: Complementos incluidos ════════════════════════════ */}
          {step === 1 && (
            <div>
              <div style={{
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#FF4500', marginBottom: '1rem',
              }}>
                🎁 Complementos incluidos
              </div>
              {included.length === 0 ? (
                <p style={{ color: '#555', fontSize: '0.85rem' }}>Este producto no incluye complementos.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {included.map(item => {
                    const on = selectedIncluded.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleIncluded(item.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.85rem',
                          padding: '0.8rem 1rem', borderRadius: '14px',
                          textAlign: 'left', cursor: 'pointer', width: '100%',
                          background: on ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                          border: on ? '1px solid rgba(34,197,94,0.28)' : '1px solid rgba(255,255,255,0.07)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Toggle circle */}
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: on ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                          border: on ? '2px solid rgba(34,197,94,0.6)' : '2px solid rgba(255,255,255,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', transition: 'all 0.15s ease',
                          color: on ? '#22c55e' : 'transparent',
                        }}>
                          ✓
                        </div>
                        <span style={{ fontSize: '1.1rem' }}>{item.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '0.88rem', fontWeight: 700,
                            color: on ? '#86efac' : '#777',
                            transition: 'color 0.15s',
                          }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600, marginTop: '1px' }}>
                            Incluido gratis
                          </div>
                        </div>
                        {/* Desmarcado badge */}
                        {!on && (
                          <span style={{
                            fontSize: '0.65rem', color: '#555', fontWeight: 600,
                            background: 'rgba(255,255,255,0.06)', borderRadius: '20px',
                            padding: '0.2rem 0.55rem',
                          }}>No quiero</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Extras opcionales ══════════════════════════════════ */}
          {step === 2 && (
            <div ref={step2Ref}>
              <div style={{
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#888', marginBottom: '1rem',
              }}>
                🍋 Extras opcionales — ¿algo más?
              </div>
              {extras.length === 0 ? (
                <p style={{ color: '#555', fontSize: '0.85rem' }}>No hay extras disponibles por ahora.</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
                  gap: '0.6rem',
                }}>
                  {extras.map(extra => {
                    const on = selectedExtras.has(extra.id);
                    return (
                      <button
                        key={extra.id}
                        onClick={() => toggleExtra(extra.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.75rem 0.9rem', borderRadius: '14px',
                          textAlign: 'left', cursor: 'pointer',
                          background: on ? 'rgba(255,69,0,0.12)' : 'rgba(255,255,255,0.04)',
                          border: on ? '1px solid rgba(255,69,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                          transition: 'all 0.15s ease',
                          boxShadow: on ? '0 4px 16px rgba(255,69,0,0.12)' : 'none',
                        }}
                      >
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                          background: on ? 'linear-gradient(135deg, #FF4500, #FF6500)' : 'rgba(255,255,255,0.06)',
                          border: on ? 'none' : '1px solid rgba(255,255,255,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', color: '#fff', transition: 'all 0.15s ease',
                        }}>
                          {on ? '✓' : ''}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.8rem', fontWeight: 700,
                            color: on ? '#fff' : '#aaa', transition: 'color 0.15s',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {extra.name}
                          </div>
                          <div style={{
                            fontSize: '0.7rem', fontWeight: 600, marginTop: '1px',
                            color: extra.price === 0 ? '#22c55e' : '#FF6A00',
                          }}>
                            {extra.price === 0 ? '¡Gratis!' : `+$${extra.price}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0e0e0e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', flexShrink: 0,
        }}>
          {/* Price */}
          <div>
            <div style={{ fontSize: '0.65rem', color: '#555', fontWeight: 600 }}>Total</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FF4500', lineHeight: 1 }}>
              ${product.price + extraTotal}
            </div>
            {extraTotal > 0 && (
              <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '2px' }}>
                Base ${product.price} + extras ${extraTotal}
              </div>
            )}
          </div>

          {/* CTA */}
          {step === 1 ? (
            <button
              onClick={goToStep2}
              style={{
                flex: 1, maxWidth: '240px',
                padding: '0.85rem 1.5rem',
                background: 'linear-gradient(135deg, #FF4500, #FF6A00)',
                border: 'none', borderRadius: '14px', color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: '1.05rem',
                letterSpacing: '0.06em', cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(255,69,0,0.35)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(255,69,0,0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(255,69,0,0.35)';
              }}
            >
              CONTINUAR
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              style={{
                flex: 1, maxWidth: '240px',
                padding: '0.85rem 1.5rem',
                background: 'linear-gradient(135deg, #FF4500, #FF6A00)',
                border: 'none', borderRadius: '14px', color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: '1.05rem',
                letterSpacing: '0.06em', cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(255,69,0,0.35)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(255,69,0,0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(255,69,0,0.35)';
              }}
            >
              AGREGAR AL CARRITO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
