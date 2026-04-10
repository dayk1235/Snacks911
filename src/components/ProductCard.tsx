'use client';

import Image from 'next/image';
import { memo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Product } from '@/data/products';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onCustomize?: (product: Product) => void;
}

function ProductCardComponent({ product, onAddToCart, onCustomize }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isCombo = product.category === 'combos';

  const handleAdd = () => {
    if (added) return;
    if (onCustomize) {
      onCustomize(product);
      return;
    }
    onAddToCart(product);
    setAdded(true);

    // Fast micro-interaction: button pulse + checkmark
    gsap.fromTo(btnRef.current,
      { scale: 1 },
      { scale: 1.06, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out' }
    );
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      ref={cardRef}
      style={{
        background: isCombo
          ? 'linear-gradient(145deg, rgba(255,69,0,0.08), rgba(20,20,20,0.9))'
          : 'rgba(20,20,20,0.85)',
        border: isCombo
          ? '1.5px solid rgba(255,69,0,0.25)'
          : '1px solid rgba(255,255,255,0.07)',
        borderRadius: isCombo ? '18px' : '14px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Badges */}
      {(product.badge || product.badges) && (
        <div style={{
          position: 'absolute', top: '10px', left: '10px', zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: '5px',
        }}>
          {(product.badges && product.badges.length > 0 ? product.badges : product.badge ? [product.badge] : []).map((b, i) => (
            <span
              key={i}
              style={{
                background: i === 0
                  ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                  : 'rgba(0,0,0,0.7)',
                borderRadius: '6px',
                padding: '0.2rem 0.55rem',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#fff',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Image */}
      <div style={{
        position: 'relative',
        height: isCombo ? '170px' : '150px',
        background: '#1a1a1a',
        overflow: 'hidden',
      }}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          style={{ objectFit: 'cover', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(14,14,14,0.8) 0%, transparent 50%)',
        }} />
        {product.spicy !== undefined && product.spicy > 0 && (
          <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} style={{ opacity: i < (product.spicy ?? 0) ? 1 : 0.18, fontSize: '0.75rem' }}>
                🌶️
              </span>
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
        gap: '0.3rem',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Name */}
        <h3 style={{
          fontSize: isCombo ? '1.05rem' : '0.95rem',
          fontWeight: 800,
          color: isCombo ? '#FFB800' : '#fff',
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: '0.01em',
        }}>
          {product.name}
        </h3>

        {/* Description — 1 line max, clamped */}
        <p style={{
          fontSize: '0.75rem',
          color: '#666',
          margin: 0,
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {product.description}
        </p>

        {/* Combo includes label */}
        {isCombo && (
          <span style={{
            display: 'inline-block',
            fontSize: '0.65rem',
            color: '#FF7040',
            fontWeight: 600,
            padding: '0.15rem 0',
          }}>
            ✓ Incluye papas + aderezo
          </span>
        )}

        {/* Price + Button row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          gap: '0.5rem',
        }}>
          <span style={{
            fontSize: isCombo ? '1.35rem' : '1.2rem',
            fontWeight: 900,
            color: '#FF4500',
            letterSpacing: '-0.02em',
          }}>
            ${product.price}
          </span>
          <button
            ref={btnRef}
            onClick={handleAdd}
            style={{
              flex: 1,
              maxWidth: isCombo ? '160px' : '140px',
              background: added
                ? 'linear-gradient(135deg, #00C853, #00E676)'
                : isCombo
                  ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                  : 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none',
              borderRadius: '10px',
              padding: isCombo ? '0.65rem 1rem' : '0.55rem 0.85rem',
              color: '#fff',
              fontWeight: 800,
              fontSize: isCombo ? '0.9rem' : '0.82rem',
              cursor: added ? 'default' : 'pointer',
              transition: 'background 0.2s, transform 0.08s',
              boxShadow: added
                ? '0 4px 14px rgba(0,200,83,0.25)'
                : '0 2px 10px rgba(255,69,0,0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            {added ? '✅ Agregado' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ProductCard = memo(ProductCardComponent);

export default ProductCard;
