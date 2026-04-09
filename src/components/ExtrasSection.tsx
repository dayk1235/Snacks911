'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AdminStore } from '@/lib/adminStore';
import type { AdminProduct } from '@/lib/adminTypes';
import type { Product } from '@/data/products';

gsap.registerPlugin(ScrollTrigger);

interface ExtrasSectionProps {
  onAddToCart: (product: Product) => void;
}

export default function ExtrasSection({ onAddToCart }: ExtrasSectionProps) {
  const [extras, setExtras] = useState<AdminProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const products = AdminStore.getProducts();
    const extraItems = products.filter(p => p.category === 'extras' && p.available);
    setExtras(extraItems);
  }, []);

  useEffect(() => {
    if (!headerRef.current || !gridRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        opacity: 0, y: 30, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 85%' },
      });
      gsap.from(Array.from(gridRef.current?.children ?? []), {
        opacity: 0, y: 16, scale: 0.92, stagger: 0.05, duration: 0.4, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: gridRef.current, start: 'top 88%' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [extras]);

  const toggleExtra = (extra: AdminProduct) => {
    const newSelected = new Set(selected);
    if (newSelected.has(extra.id)) {
      newSelected.delete(extra.id);
    } else {
      newSelected.add(extra.id);
      // Add to cart as a Product-compatible item
      const product: Product = {
        id: parseInt(extra.id.replace(/\D/g, '')) + 900, // high IDs to avoid collision
        name: extra.name,
        description: extra.description,
        price: extra.price,
        category: 'extras' as Product['category'],
        image: extra.imageUrl || '/images/combo.webp',
      };
      onAddToCart(product);
    }
    setSelected(newSelected);
  };

  if (extras.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      id="extras"
      style={{
        padding: '4rem 1.5rem 3rem',
        maxWidth: '900px',
        margin: '0 auto',
        scrollMarginTop: '70px',
      }}
    >
      {/* Header */}
      <div ref={headerRef} style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#FF4500',
          fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
          display: 'block', marginBottom: '0.75rem',
        }}>
          🍋 Personaliza tu pedido
        </span>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.8rem, 4vw, 3rem)',
          fontWeight: 400, color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.75rem',
        }}>
          EXTRAS Y ACOMPAÑAMIENTOS
        </h2>
        <p style={{ color: '#555', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
          Dale el toque final a tu pedido. Elige salsas, limones y más 🔥
        </p>
      </div>

      {/* Grid of toggleable extras */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {extras.map(extra => {
          const isOn = selected.has(extra.id);
          return (
            <button
              key={extra.id}
              onClick={() => toggleExtra(extra)}
              onMouseEnter={e => {
                gsap.to(e.currentTarget, { scale: 1.04, y: -3, duration: 0.3, ease: 'back.out(1.5)' });
              }}
              onMouseLeave={e => {
                gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.25, ease: 'power2.inOut' });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                background: isOn
                  ? 'rgba(255,69,0,0.12)'
                  : 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: isOn
                  ? '1px solid rgba(255,69,0,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
                transition: 'background 0.15s ease, border-color 0.15s ease',
                boxShadow: isOn
                  ? '0 4px 20px rgba(255,69,0,0.15), inset 0 1px 0 rgba(255,120,0,0.1)'
                  : '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {/* Check indicator */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                background: isOn
                  ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                  : 'rgba(255,255,255,0.06)',
                border: isOn ? 'none' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
                fontSize: '0.75rem', color: '#fff',
              }}>
                {isOn ? '✓' : ''}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: '0.85rem',
                  color: isOn ? '#fff' : '#bbb',
                  transition: 'color 0.15s',
                }}>
                  {extra.name}
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  color: extra.price === 0 ? '#22c55e' : '#888',
                  fontWeight: 600,
                  marginTop: '2px',
                }}>
                  {extra.price === 0 ? '¡Gratis!' : `+$${extra.price}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
