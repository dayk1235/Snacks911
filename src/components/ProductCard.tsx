'use client';

import Image from 'next/image';
import { memo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Product } from '@/data/products';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  /** If provided, clicking 'Agregar' fires this instead of onAddToCart directly */
  onCustomize?: (product: Product) => void;
}

function ProductCardComponent({ product, onAddToCart, onCustomize }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef  = useRef<HTMLDivElement>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    gsap.to(cardRef.current, { y: -10, duration: 0.5, ease: 'back.out(1.4)' });
    gsap.to(imgRef.current,  { scale: 1.1, duration: 0.6, ease: 'power2.out' });
    gsap.to(glowRef.current, { opacity: 1, duration: 0.4 });
    // Shine sweep
    if (shineRef.current) {
      gsap.fromTo(shineRef.current,
        { x: '-120%', opacity: 0.7 },
        { x: '120%', opacity: 0, duration: 0.8, ease: 'power2.inOut' }
      );
    }
    if (cardRef.current) {
      cardRef.current.style.borderColor = 'rgba(255,69,0,0.30)';
      cardRef.current.style.boxShadow   = '0 20px 60px rgba(0,0,0,0.55), 0 0 30px rgba(255,69,0,0.10), inset 0 1px 0 rgba(255,255,255,0.10)';
    }
  };

  const handleMouseLeave = () => {
    gsap.to(cardRef.current, { y: 0, duration: 0.45, ease: 'power2.inOut' });
    gsap.to(imgRef.current,  { scale: 1, duration: 0.5, ease: 'power2.inOut' });
    gsap.to(glowRef.current, { opacity: 0, duration: 0.4 });
    if (cardRef.current) {
      cardRef.current.style.borderColor = 'rgba(255,255,255,0.08)';
      cardRef.current.style.boxShadow   = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)';
    }
  };

  const handleAdd = () => {
    if (added) return;
    if (onCustomize) {
      // Let parent open customizer modal
      onCustomize(product);
      return;
    }
    onAddToCart(product);
    setAdded(true);
    gsap.fromTo(
      btnRef.current,
      { scale: 1 },
      { scale: 1.18, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.inOut',
        onComplete: () => { setTimeout(() => setAdded(false), 1500); },
      }
    );
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: 'rgba(20,20,20,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100%',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Liquid glass inner shimmer — only on hover */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          opacity: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,69,0,0.03) 50%, transparent 100%)',
          borderRadius: '20px',
        }}
      />

      {/* Shine sweep effect */}
      <div
        ref={shineRef}
        style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
          borderRadius: '20px',
          transform: 'translateX(-120%)',
        }}
      />

      {/* Badge */}
      {product.badge && (
        <div
          style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 10,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px', padding: '0.28rem 0.7rem',
            fontSize: '0.72rem', fontWeight: 700, color: '#fff',
          }}
        >
          {product.badge}
        </div>
      )}

      {/* Image */}
      <div style={{ position: 'relative', height: '200px', background: '#1a1a1a', overflow: 'hidden' }}>
        <div ref={imgRef} style={{ position: 'absolute', inset: 0 }}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(14,14,14,0.7) 0%, transparent 55%)',
        }} />
        {product.spicy !== undefined && product.spicy > 0 && (
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} style={{ opacity: i < (product.spicy ?? 0) ? 1 : 0.18, fontSize: '0.8rem' }}>
                🌶️
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative', zIndex: 2 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
          {product.name}
        </h3>
        <p style={{ fontSize: '0.83rem', color: '#777', margin: 0, lineHeight: 1.5, flex: 1 }}>
          {product.description}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.85rem' }}>
          <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FF4500' }}>
            ${product.price}
          </span>
          <button
            id={`add-to-cart-${product.id}`}
            ref={btnRef}
            onClick={handleAdd}
            onMouseEnter={() => !added && gsap.to(btnRef.current, { scale: 1.06, duration: 0.15, ease: 'power2.out' })}
            onMouseLeave={() => !added && gsap.to(btnRef.current, { scale: 1,    duration: 0.15, ease: 'power2.out' })}
            style={{
              background: added
                ? 'linear-gradient(135deg, #00C853, #00E676)'
                : 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none', borderRadius: '10px',
              padding: '0.6rem 1.25rem',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem',
              cursor: added ? 'default' : 'pointer',
              transition: 'background 0.35s ease',
              boxShadow: added
                ? '0 4px 14px rgba(0,200,83,0.25)'
                : '0 4px 14px rgba(255,69,0,0.25)',
            }}
          >
            {added ? '✓ ¡Listo!' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ProductCard = memo(ProductCardComponent);

export default ProductCard;
