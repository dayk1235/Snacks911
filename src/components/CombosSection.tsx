'use client';

import { memo, useMemo, useState } from 'react';
import Image from 'next/image';
import { products } from '@/data/products';
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
              style={{
                background: isBest
                  ? 'linear-gradient(145deg, rgba(255,69,0,0.07), rgba(20,20,20,0.95))'
                  : 'rgba(20,20,20,0.85)',
                border: isBest
                  ? '1.5px solid rgba(255,69,0,0.3)'
                  : '1px solid rgba(255,255,255,0.07)',
                borderRadius: isBest ? '18px' : '16px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                boxShadow: isBest ? '0 0 30px rgba(255,69,0,0.08)' : 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = isBest
                  ? '0 0 40px rgba(255,69,0,0.15), 0 8px 30px rgba(0,0,0,0.4)'
                  : '0 8px 30px rgba(0,0,0,0.3)';
                (e.currentTarget as HTMLElement).style.borderColor = isBest
                  ? 'rgba(255,69,0,0.4)'
                  : 'rgba(255,69,0,0.2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = isBest
                  ? '0 0 30px rgba(255,69,0,0.08)'
                  : 'none';
                (e.currentTarget as HTMLElement).style.borderColor = isBest
                  ? 'rgba(255,69,0,0.3)'
                  : 'rgba(255,255,255,0.07)';
              }}
            >
              {/* Badge */}
              {combo.badges && combo.badges.length > 0 && (
                <div style={{
                  position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                  display: 'flex', flexDirection: 'column', gap: '5px',
                }}>
                  {combo.badges.map((b, i) => (
                    <span
                      key={i}
                      style={{
                        background: i === 0
                          ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                          : 'rgba(0,0,0,0.7)',
                        borderRadius: '6px',
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Image */}
              <div style={{
                position: 'relative', height: '160px', background: '#1a1a1a', overflow: 'hidden',
              }}>
                <Image
                  src={combo.image}
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
                  <button
                    onClick={() => handleAdd(combo)}
                    disabled={isAdded}
                    style={{
                      flex: 1, maxWidth: isBest ? '170px' : '150px',
                      background: isAdded
                        ? 'linear-gradient(135deg, #00C853, #00E676)'
                        : 'linear-gradient(135deg, #FF4500, #FF6500)',
                      border: 'none', borderRadius: '10px',
                      padding: '0.6rem 1rem',
                      color: '#fff', fontWeight: 800, fontSize: isBest ? '0.9rem' : '0.85rem',
                      cursor: isAdded ? 'default' : 'pointer',
                      fontFamily: 'var(--font-body)',
                      boxShadow: isBest
                        ? '0 4px 20px rgba(255,69,0,0.35)'
                        : isAdded
                          ? '0 4px 14px rgba(0,200,83,0.25)'
                          : '0 2px 10px rgba(255,69,0,0.2)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isAdded ? '✓ Agregado' : isBest ? 'Pedir Combo 🔥' : 'Agregar'}
                  </button>
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
