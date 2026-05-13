'use client';

import { memo, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { products, getProductImage } from '@/data/products';
import type { Product } from '@/data/products';

interface CombosSectionProps {
  onAdd: (product: Product) => void;
}

function CombosSectionComponent({ onAdd }: CombosSectionProps) {
  const combos = useMemo(() => products.filter(p => p.category === 'combos'), []);
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAdd = (product: Product) => {
    onAdd(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  // Sort: "Más pedido" first, then by price asc. Limit to top 3.
  const sortedCombos = useMemo(() => {
    return [...combos]
      .sort((a, b) => {
        const aIsBest = a.badges?.some(b => typeof b === 'string' && b.includes('Más pedido')) ? 1 : 0;
        const bIsBest = b.badges?.some(b => typeof b === 'string' && b.includes('Más pedido')) ? 1 : 0;
        if (aIsBest !== bIsBest) return bIsBest - aIsBest;
        return a.price - b.price;
      })
      .slice(0, 3);
  }, [combos]);

  return (
    <section style={{
      padding: '2.5rem 1.5rem',
      maxWidth: '780px',
      margin: '0 auto',
    }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{
          display: 'block', fontSize: '0.6rem', fontWeight: 700,
          color: '#FF4500', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: '0.35rem',
        }}>
          🔥 Lo que todos piden
        </span>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.03em',
        }}>
          COMBOS <span style={{ color: '#FF4500' }}>911</span>
        </h2>
        <p style={{
          fontSize: '0.78rem', color: '#555', marginTop: '0.35rem',
          maxWidth: '400px', margin: '0.35rem auto 0', lineHeight: 1.5,
        }}>
          Main + papas + bebida. Todo incluido, sin pensarlo.
        </p>
      </div>

      {/* Combo cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '0.75rem',
      }}>
        {sortedCombos.map(combo => {
          const isBest = combo.badges?.some(b => typeof b === 'string' && (b.includes('Más pedido') || b.includes('Best seller')));
          const isAdded = addedId === combo.id;

          return (
            <div
              key={combo.id}
              style={{
                background: 'var(--bg-secondary)',
                border: isBest ? '1px solid rgba(255, 69, 0, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: '14px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'border-color 0.2s, transform 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.borderColor = isBest ? 'rgba(255, 69, 0, 0.2)' : 'rgba(255,255,255,0.05)';
              }}
            >
              {/* Image */}
              <div style={{
                position: 'relative', height: '100px', background: '#1a1a1a', overflow: 'hidden',
              }}>
                <Image
                  src={getProductImage(combo)}
                  alt={combo.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 250px"
                  style={{ objectFit: 'cover' }}
                  loading="lazy"
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(14,14,14,0.5) 0%, transparent 40%)',
                }} />
              </div>

              {/* Content */}
              <div style={{ padding: '0.7rem' }}>
                <h3 style={{
                  fontSize: '0.8rem', fontWeight: 700,
                  color: '#fff',
                  margin: 0, lineHeight: 1.2,
                  fontFamily: 'var(--font-body)',
                }}>
                  {combo.name}
                </h3>

                {/* Price + Button */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: '0.4rem', gap: '0.5rem',
                }}>
                  <span style={{
                    fontSize: '0.95rem', fontWeight: 800, color: '#FF4500',
                    letterSpacing: '-0.01em', lineHeight: 1,
                  }}>
                    ${combo.price}
                  </span>
                  <Button
                    onClick={() => handleAdd(combo)}
                    disabled={isAdded}
                    variant={isAdded ? 'secondary' : 'primary'}
                    style={{
                      padding: '0.35rem 0.7rem',
                      fontSize: '0.68rem',
                      borderRadius: '10px',
                      background: isAdded ? 'rgba(34,197,94,0.15)' : undefined,
                    }}
                  >
                    {isAdded ? '✓' : '+ Agregar'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const CombosSection = memo(CombosSectionComponent);

export default CombosSection;
