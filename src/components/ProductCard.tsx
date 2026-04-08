'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import type { Product } from '@/data/products';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    gsap.to(cardRef.current, { y: -8, duration: 0.25, ease: 'power2.out' });
    gsap.to(imgRef.current, { scale: 1.08, duration: 0.4, ease: 'power2.out' });
    if (cardRef.current) cardRef.current.style.borderColor = 'rgba(255,69,0,0.28)';
  };

  const handleMouseLeave = () => {
    gsap.to(cardRef.current, { y: 0, duration: 0.3, ease: 'power2.inOut' });
    gsap.to(imgRef.current, { scale: 1, duration: 0.4, ease: 'power2.inOut' });
    if (cardRef.current) cardRef.current.style.borderColor = 'rgba(255,255,255,0.06)';
  };

  const handleAdd = () => {
    if (added) return;
    onAddToCart(product);
    setAdded(true);
    // Satisfying elastic pop on the button
    gsap.fromTo(
      btnRef.current,
      { scale: 1 },
      {
        scale: 1.18,
        duration: 0.14,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
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
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100%',
        transition: 'border-color 0.3s',
      }}
    >
      {/* Badge */}
      {product.badge && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '0.28rem 0.7rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {product.badge}
        </div>
      )}

      {/* Image */}
      <div
        style={{
          position: 'relative',
          height: '200px',
          background: '#1a1a1a',
          overflow: 'hidden',
        }}
      >
        <img
          ref={imgRef}
          src={product.image}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(20,20,20,0.55) 0%, transparent 50%)',
          }}
        />
        {product.spicy !== undefined && product.spicy > 0 && (
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                style={{ opacity: i < (product.spicy ?? 0) ? 1 : 0.18, fontSize: '0.8rem' }}
              >
                🌶️
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          padding: '1.2rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
          {product.name}
        </h3>
        <p style={{ fontSize: '0.83rem', color: '#666', margin: 0, lineHeight: 1.5, flex: 1 }}>
          {product.description}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '0.85rem',
          }}
        >
          <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FF4500' }}>
            ${product.price}
          </span>
          <button
            id={`add-to-cart-${product.id}`}
            ref={btnRef}
            onClick={handleAdd}
            onMouseEnter={() =>
              !added && gsap.to(btnRef.current, { scale: 1.06, duration: 0.15, ease: 'power2.out' })
            }
            onMouseLeave={() =>
              !added && gsap.to(btnRef.current, { scale: 1, duration: 0.15, ease: 'power2.out' })
            }
            style={{
              background: added
                ? 'linear-gradient(135deg, #00C853, #00E676)'
                : 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none',
              borderRadius: '10px',
              padding: '0.6rem 1.25rem',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: added ? 'default' : 'pointer',
              transition: 'background 0.35s ease',
            }}
          >
            {added ? '✓ ¡Listo!' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
