'use client';

import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { products, categories } from '@/data/products';
import type { Product } from '@/data/products';
import ProductCard from './ProductCard';

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
      ? products
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
          scale: 0.88,
          y: 16,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power3.out',
          clearProps: 'opacity,scale,y,transform',
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
      }}
    >
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

      {/* Filter tabs */}
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
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`filter-${cat.id}`}
            onClick={(e) => {
              gsap.fromTo(
                e.currentTarget,
                { scale: 0.92 },
                { scale: 1, duration: 0.28, ease: 'elastic.out(1, 0.5)' }
              );
              setActiveCategory(cat.id);
            }}
            onMouseEnter={(e) =>
              gsap.to(e.currentTarget, { scale: 1.06, duration: 0.18, ease: 'power2.out' })
            }
            onMouseLeave={(e) =>
              gsap.to(e.currentTarget, { scale: 1, duration: 0.18, ease: 'power2.out' })
            }
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
              transition: 'background 0.25s, color 0.25s, border-color 0.25s',
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
    </section>
  );
}
