'use client';

import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { products, categories } from '@/data/products';
import type { Product } from '@/data/products';
import ProductCard from './ProductCard';
import FireCanvas from './FireCanvas';

gsap.registerPlugin(ScrollTrigger);

interface MenuSectionProps {
  onAddToCart: (product: Product) => void;
}

export default function MenuSection({ onAddToCart }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState('todos');
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const filtered =
    activeCategory === 'todos'
      ? products.filter(p => p.category !== 'extras')
      : products.filter((p) => p.category === activeCategory);

  // ScrollTrigger entrance animations (runs once on mount)
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header fade up
      gsap.from(headerRef.current, {
        opacity: 0,
        y: 35,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: headerRef.current,
          start: 'top 85%',
        },
      });

      // Tabs stagger
      gsap.from(Array.from(tabsRef.current?.children ?? []), {
        opacity: 0,
        y: 18,
        duration: 0.45,
        stagger: 0.07,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: tabsRef.current,
          start: 'top 88%',
        },
      });

      // Initial grid cards
      gsap.from(Array.from(gridRef.current?.children ?? []), {
        opacity: 0,
        scale: 0.9,
        y: 20,
        duration: 0.45,
        stagger: 0.07,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 85%',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Re-animate cards when category filter changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Small timeout so React finishes re-rendering the filtered list
    const timer = setTimeout(() => {
      if (gridRef.current) {
        gsap.from(Array.from(gridRef.current.children), {
          opacity: 0,
          scale: 0.85,
          y: 24,
          rotateY: 8,
          duration: 0.5,
          stagger: 0.06,
          ease: 'back.out(1.4)',
          clearProps: 'opacity,scale,y,transform,rotateY',
        });
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [activeCategory]);

  return (
    <section
      ref={sectionRef}
      id="menu"
      style={{
        padding: '5rem 1.5rem 5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        scrollMarginTop: '70px',
        position: 'relative',
      }}
    >
      {/* Dynamic fire background */}
      <div style={{
        position: 'absolute',
        inset: '-100px -200px',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.25,
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
      }}>
        <FireCanvas />
      </div>

      {/* Content on top */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div ref={headerRef} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem',
              color: '#FF4500',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '0.75rem',
            }}
          >
            🍗 Nuestro Menú
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: 400,
              color: '#fff',
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            ¿QUÉ SE TE ANTOJA?
          </h2>
        </div>

        {/* Filter tabs — slower hover, faster color swap */}
        <div
          ref={tabsRef}
          style={{
            display: 'flex',
            gap: '0.65rem',
            justifyContent: 'center',
            marginBottom: '3rem',
            flexWrap: 'wrap',
          }}
        >
          {categories.filter(c => c.id !== 'extras').map((cat) => (
            <button
              key={cat.id}
              id={`filter-${cat.id}`}
              onClick={(e) => {
                // Ripple pulse animation on click
                gsap.fromTo(
                  e.currentTarget,
                  { scale: 0.88, boxShadow: '0 0 0 0 rgba(255,69,0,0.4)' },
                  {
                    scale: 1,
                    boxShadow: activeCategory !== cat.id
                      ? '0 0 20px 4px rgba(255,69,0,0.15)'
                      : '0 0 0 0 transparent',
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.45)',
                  }
                );
                setActiveCategory(cat.id);
              }}
              onMouseEnter={(e) => {
                // Slower, more attractive hover animation
                gsap.to(e.currentTarget, {
                  scale: 1.08,
                  y: -3,
                  duration: 0.4,
                  ease: 'back.out(1.7)',
                });
                // Glow effect
                if (activeCategory !== cat.id) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.35)';
                  (e.currentTarget as HTMLElement).style.color = '#FF7040';
                }
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  scale: 1,
                  y: 0,
                  duration: 0.35,
                  ease: 'power2.inOut',
                });
                if (activeCategory !== cat.id) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLElement).style.color = '#777';
                }
              }}
              style={{
                fontFamily: 'var(--font-body)',
                background:
                  activeCategory === cat.id
                    ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                    : 'rgba(255,255,255,0.05)',
                border:
                  activeCategory === cat.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '50px',
                padding: '0.6rem 1.5rem',
                color: activeCategory === cat.id ? '#fff' : '#777',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                // FAST color transition, slower transform
                transition: 'background 0.08s ease, color 0.08s ease, border-color 0.15s ease',
                boxShadow: activeCategory === cat.id
                  ? '0 4px 18px rgba(255,69,0,0.25)'
                  : 'none',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filtered.map((product) => (
            <div key={product.id}>
              <ProductCard product={product} onAddToCart={onAddToCart} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
