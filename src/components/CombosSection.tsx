'use client';

import { memo, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from './ui/Button';
import { products, getProductImage } from '@/data/products';
import type { Product } from '@/data/products';

interface CombosSectionProps {
  onAdd: (product: Product) => void;
}

function CombosSectionComponent({ onAdd }: CombosSectionProps) {
  const combos = useMemo(() => products.filter(p => p.category === 'combos'), []);
  const [addedId, setAddedId] = useState<number | null>(null);

  const handleAdd = (product: Product) => {
    onAdd(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  // Sort: "Más pedido" first, then by price asc. Limit to top 3.
  const sortedCombos = useMemo(() => {
    return [...combos]
      .sort((a, b) => {
        const aIsBest = a.badges?.some(b => b.includes('Más pedido')) ? 1 : 0;
        const bIsBest = b.badges?.some(b => b.includes('Más pedido')) ? 1 : 0;
        if (aIsBest !== bIsBest) return bIsBest - aIsBest;
        return a.price - b.price;
      })
      .slice(0, 3);
  }, [combos]);

  return (
    <section style={{
      padding: '3.5rem 1.5rem',
      maxWidth: '960px',
      margin: '0 auto',
    }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span style={{
          display: 'block', fontSize: '0.65rem', fontWeight: 700,
          color: '#FF4500', letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>
          🔥 Lo que todos piden
        </span>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.04em',
        }}>
          COMBOS <span style={{ color: '#FF4500' }}>911</span>
        </h2>
        <p style={{
          fontSize: '0.85rem', color: '#555', marginTop: '0.5rem',
          maxWidth: '400px', margin: '0.5rem auto 0', lineHeight: 1.5,
        }}>
          Main + papas + bebida. Todo incluido, sin pensarlo.
        </p>
      </div>

      {/* Combo cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
      }}>
        {sortedCombos.map(combo => {
          const isBest = combo.badges?.some(b => b.includes('Más pedido') || b.includes('Best seller'));
          const isAdded = addedId === combo.id;

          return (
            <div
              key={combo.id}
              className="card-premium"
              style={{
                border: isBest ? '1.5px solid rgba(255, 69, 0, 0.35)' : undefined,
                background: isBest ? 'linear-gradient(145deg, rgba(255, 69, 0, 0.08), rgba(20, 20, 20, 0.5))' : undefined,
              }}
            >
              {/* Badge */}
              {(() => {
                const isBest = combo.popular || combo.badges?.some(b => b.includes('vendido') || b.includes('pedido'));
                const savings = combo.originalPrice ? combo.originalPrice - combo.price : 0;
                
                let displayBadge = null;
                let badgeBg = 'linear-gradient(135deg, #FF4500, #FF6500)';
                
                if (isBest) {
                  displayBadge = "⭐ Más vendido";
                } else if (savings > 0) {
                  displayBadge = `💰 Ahorra $${savings}`;
                  badgeBg = 'linear-gradient(135deg, #16a34a, #22c55e)';
                }

                if (!displayBadge) return null;

                return (
                  <div style={{
                    position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                  }}>
                    <span
                      style={{
                        background: badgeBg,
                        borderRadius: '6px',
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        boxShadow: isBest ? '0 2px 8px rgba(255,69,0,0.3)' : 'none',
                      }}
                    >
                      {displayBadge}
                    </span>
                  </div>
                );
              })()}

              {/* Image */}
              <div style={{
                position: 'relative', height: '160px', background: '#1a1a1a', overflow: 'hidden',
              }}>
                <Image
                  src={getProductImage(combo)}
                  alt={combo.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 400px"
                  style={{ objectFit: 'cover' }}
                  loading="lazy"
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(14,14,14,0.7) 0%, transparent 50%)',
                }} />
              </div>

              {/* Content */}
              <div style={{ padding: '1rem' }}>
                <h3 style={{
                  fontSize: '1.05rem', fontWeight: 800,
                  color: isBest ? '#FFB800' : '#fff',
                  margin: 0, lineHeight: 1.2,
                  fontFamily: 'var(--font-body)',
                }}>
                  {combo.name}
                </h3>

                <p style={{
                  fontSize: '0.75rem', color: '#666',
                  margin: '0.3rem 0 0', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {combo.description}
                </p>

                {/* Price + Button */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: '0.75rem', gap: '0.75rem',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {combo.originalPrice && (
                      <span style={{
                        fontSize: '0.75rem', color: '#555',
                        textDecoration: 'line-through', fontWeight: 600,
                      }}>
                        Antes ${combo.originalPrice}
                      </span>
                    )}
                    <span style={{
                      fontSize: '1.4rem', fontWeight: 900, color: '#FF4500',
                      letterSpacing: '-0.02em', lineHeight: 1,
                    }}>
                      ${combo.price}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleAdd(combo)}
                    disabled={isAdded}
                    variant="primary"
                    style={{
                      flex: 1,
                      maxWidth: isBest ? '170px' : '150px',
                      background: isAdded ? 'linear-gradient(135deg, #00C853, #00E676)' : undefined,
                      padding: '0.6rem 1rem',
                      fontSize: isBest ? '0.9rem' : '0.85rem',
                    }}
                  >
                    {isAdded ? '✓ Agregado' : '🔥 Pedir ahora'}
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
