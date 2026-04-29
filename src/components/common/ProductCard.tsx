'use client';

import Image from 'next/image';
import { memo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import type { Product } from '@/data/products';
import { products, getProductImage } from '@/data/products';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onCustomize?: (product: Product) => void;
}

// Emotion labels by category
const EMOTION_LABELS: Record<string, string[]> = {
  proteina: ['🔥 Se antojan', 'Crujientes por fuera', 'Jugosas por dentro'],
  papas: ['🍟 El acompañante perfecto', 'Crujientes', 'Para dipear'],
  combos: ['🚨 Para hoy', 'Todo incluido', 'Mejor precio'],
};

function ProductCardComponent({ product, onAddToCart, onCustomize }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isCombo = product.category === 'combos';
  const emotionLabel = EMOTION_LABELS[product.category]?.[0] ?? '';

  // Upsell suggestion based on product
  const upsellProduct = (() => {
    if (product.category === 'proteina') return products.find(p => p.name === 'Papas Loaded');
    if (product.category === 'papas') return products.find(p => p.name === 'Alitas BBQ');
    return null;
  })();

  const handleAdd = () => {
    if (added) return;
    if (onCustomize) {
      onCustomize(product);
      return;
    }
    onAddToCart(product);
    setAdded(true);

    // Show upsell after adding
    if (upsellProduct && product.category === 'proteina') {
      setShowUpsell(true);
    }

    // Fast micro-interaction: CSS class toggle
    if (btnRef.current) {
      btnRef.current.classList.remove('btn-pulse');
      void btnRef.current.offsetWidth;
      btnRef.current.classList.add('btn-pulse');
    }
    setTimeout(() => setAdded(false), 1200);
  };

  const handleAddUpsell = () => {
    if (!upsellProduct) return;
    onAddToCart(upsellProduct);
    setShowUpsell(false);
  };

  const isBestSeller = product.popular || product.badges?.some(b => 
    b.includes('Más pedido') || b.includes('Top Seller') || b.includes('Más vendido')
  );
  const savings = product.originalPrice ? product.originalPrice - product.price : 0;

  // Badge Priority Logic
  let displayBadge = null;
  if (isBestSeller) {
    displayBadge = "⭐ Más vendido";
  } else if (savings > 0) {
    displayBadge = `💰 Ahorra $${savings}`;
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card-premium"
      style={{
        border: isCombo ? '1.5px solid rgba(255, 69, 0, 0.35)' : undefined,
        background: isCombo ? 'linear-gradient(145deg, rgba(255, 69, 0, 0.12), rgba(20, 20, 20, 0.7))' : undefined,
      }}
    >
      {/* Badge */}
      {displayBadge && (
        <div style={{
          position: 'absolute', top: '10px', left: '10px', zIndex: 10,
        }}>
          <span
            style={{
              background: isBestSeller
                ? 'linear-gradient(135deg, var(--accent), var(--accent-gradient))'
                : 'linear-gradient(135deg, var(--status-success), #16a34a)',
              borderRadius: '12px',
              padding: '0.2rem 0.55rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              boxShadow: isBestSeller ? '0 2px 8px rgba(255,69,0,0.3)' : 'none',
            }}
          >
            {displayBadge}
          </span>
        </div>
      )}

      {/* Image */}
      <div style={{
        position: 'relative',
        height: isCombo ? '180px' : '155px',
        background: '#1a1a1a',
        overflow: 'hidden',
      }}>
        <Image
          src={getProductImage(product)}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          style={{
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.4s ease',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
          loading="lazy"
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: isCombo
            ? 'linear-gradient(to top, rgba(14,14,14,0.9) 0%, rgba(255,69,0,0.05) 50%, transparent 70%)'
            : 'linear-gradient(to top, rgba(14,14,14,0.85) 0%, transparent 55%)',
        }} />

        {/* Emotion label — floating on image */}
        {emotionLabel && (
          <div style={{
            position: 'absolute', bottom: '10px', left: '10px', zIndex: 5,
            padding: '0.3rem 0.65rem',
            background: 'rgba(14,14,14,0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            border: '1px solid rgba(255,69,0,0.2)',
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '0.02em',
          }}>
            {emotionLabel}
          </div>
        )}

        {/* Spicy indicator */}
        {product.spicy !== undefined && product.spicy > 0 && (
          <div style={{
            position: 'absolute', bottom: '10px', right: '10px',
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '0.25rem 0.5rem',
            background: 'rgba(14,14,14,0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '6px',
          }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: i < (product.spicy ?? 0) ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                boxShadow: i < (product.spicy ?? 0) ? '0 0 6px rgba(255,69,0,0.5)' : 'none',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        padding: isCombo ? '0.9rem 1rem' : '0.75rem 0.85rem',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Name */}
        <h3 style={{
          fontSize: isCombo ? '1.1rem' : '1rem',
          fontWeight: 800,
          color: isCombo ? '#FFB800' : '#fff',
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: '0.01em',
        }}>
          {product.name}
        </h3>

        {/* Description — 2 lines max */}
        <p style={{
          fontSize: '0.73rem',
          color: isBestSeller ? 'var(--text-secondary)' : 'var(--text-muted)',
          margin: 0,
          lineHeight: 1.45,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {product.description}
        </p>

        {/* Savings badge for combos */}
        {isCombo && savings > 0 && (
          <span style={{
            display: 'inline-block',
            fontSize: '0.65rem',
            color: '#22c55e',
            fontWeight: 700,
            padding: '0.15rem 0',
          }}>
            💰 Ahorras ${savings} vs individual
          </span>
        )}

        {/* Price + Button row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.6rem',
          gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {product.originalPrice && (
              <span style={{
                fontSize: '0.7rem',
                color: '#555',
                textDecoration: 'line-through',
                fontWeight: 600,
              }}>
                ${product.originalPrice}
              </span>
            )}
            <span style={{
              fontSize: isCombo ? '1.4rem' : '1.25rem',
              fontWeight: 900,
              color: 'var(--accent)',
              letterSpacing: '-0.02em',
            }}>
              ${product.price}
            </span>
          </div>
          <Button
            ref={btnRef}
            onClick={handleAdd}
            variant="primary"
            style={{
              flex: 1,
              maxWidth: isCombo ? '165px' : '145px',
              background: added
                ? 'linear-gradient(135deg, #00C853, #00E676)'
                : undefined,
              boxShadow: added
                ? '0 4px 14px rgba(0,200,83,0.25)'
                : undefined,
              padding: isCombo ? '0.7rem 1rem' : '0.6rem 0.9rem',
              fontSize: isCombo ? '0.92rem' : '0.82rem',
            }}
          >
            {added ? '✓ Agregado' : '🔥 Pedir ahora'}
          </Button>
        </div>
      </div>

      {/* Upsell popup */}
      {showUpsell && upsellProduct && (
        <div style={{
          padding: '0.65rem 0.85rem',
          borderTop: '1px solid rgba(255,69,0,0.15)',
          background: 'rgba(255,69,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.65rem', color: '#FF7040', fontWeight: 700, marginBottom: '0.15rem' }}>
                ¿Te interesa?
              </div>
              <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {upsellProduct.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#FF4500', fontWeight: 900 }}>
                +${upsellProduct.price}
              </div>
            </div>
            <Button
              onClick={handleAddUpsell}
              variant="primary"
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '12px',
                fontSize: '0.72rem',
              }}
            >
              🔥 Pedir ahora
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const ProductCard = memo(ProductCardComponent);

export default ProductCard;
