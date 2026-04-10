'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { products, categories } from '@/data/products';
import type { Product } from '@/data/products';
import type { CartItem } from '@/types';
import type { AdminProduct } from '@/lib/adminTypes';

import ProductCard from '@/components/ProductCard';
import ProductCustomizerModal from '@/components/ProductCustomizerModal';
import Cart from '@/components/Cart';
import gsap from 'gsap';

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), { ssr: false });
const ChatBot      = dynamic(() => import('@/components/ChatBot'),       { ssr: false });

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [cartItems, setCartItems]     = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]       = useState(false);
  const [customizing, setCustomizing] = useState<Product | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  const filtered =
    activeCategory === 'todos'
      ? products.filter(p => p.category !== 'extras')
      : products.filter(p => p.category === activeCategory);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = useCallback((product: Product, extraNames?: string[]) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1, linkedExtras: extraNames }];
    });
  }, []);

  const updateQuantity = useCallback((id: number, delta: number) => {
    setCartItems(prev =>
      prev.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
          .filter(i => i.quantity > 0)
    );
  }, []);

  const handleAddExtra = useCallback((extra: AdminProduct, standalone = true) => {
    const asProduct = {
      id: parseInt(extra.id.replace(/\D/g, '')) + 900,
      name: extra.name,
      description: extra.description,
      price: extra.price,
      category: 'extras' as const,
      image: extra.imageUrl || '/images/combo.webp',
    };
    setCartItems(prev => {
      const existing = prev.find(i => i.id === asProduct.id);
      if (existing) return prev.map(i => i.id === asProduct.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...asProduct, quantity: 1, isStandaloneExtra: standalone }];
    });
  }, []);

  // ── Customizer modal handlers ─────────────────────────────────────────────
  const handleCustomize = useCallback((product: Product) => {
    setCustomizing(product);
  }, []);

  const handleCustomizerConfirm = useCallback((
    product: Product,
    _includedSelected: string[],
    chosenExtras: AdminProduct[]
  ) => {
    const extraNames = chosenExtras.map(e => e.name);
    addToCart(product, extraNames.length > 0 ? extraNames : undefined);
    // Add extras as linked (not standalone) so they show as sub-items
    chosenExtras.forEach(extra => handleAddExtra(extra, false));
    setCustomizing(null);
  }, [addToCart, handleAddExtra]);

  const handleCustomizerClose = useCallback(() => {
    setCustomizing(null);
  }, []);

  // ── Grid animations ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    const timer = setTimeout(() => {
      if (gridRef.current) {
        gsap.from(Array.from(gridRef.current.children), {
          opacity: 0, scale: 0.88, y: 20, duration: 0.45,
          stagger: 0.06, ease: 'back.out(1.4)',
          clearProps: 'opacity,scale,y,transform',
        });
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [activeCategory]);

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: 'var(--font-body)' }}>
      <CustomCursor />

      {/* ── Customizer Modal ── */}
      <ProductCustomizerModal
        product={customizing}
        onClose={handleCustomizerClose}
        onConfirm={handleCustomizerConfirm}
      />

      {/* ── Sticky header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 1.5rem', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            color: '#555', textDecoration: 'none', fontSize: '0.82rem',
            fontWeight: 600, letterSpacing: '0.04em', transition: 'color 0.18s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF4500'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Inicio
          </Link>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.05em', color: '#fff' }}>
            SNACKS <span style={{ color: '#FF4500' }}>911</span>
          </div>
        </div>

        <button
          onClick={() => setCartOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: totalItems > 0 ? 'linear-gradient(135deg, #FF4500, #FF6A00)' : 'rgba(255,255,255,0.06)',
            border: 'none', borderRadius: '100px',
            padding: '0.55rem 1.25rem',
            color: '#fff', fontSize: '0.85rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: totalItems > 0 ? '0 0 24px rgba(255,69,0,0.3)' : 'none',
          }}
        >
          🛒
          {totalItems > 0 && <span style={{ minWidth: '18px', textAlign: 'center' }}>{totalItems}</span>}
          {totalItems > 0 && (
            <span style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '0.6rem' }}>
              ${totalPrice}
            </span>
          )}
        </button>
      </header>

      {/* ── Hero strip ── */}
      <div style={{
        textAlign: 'center', padding: '4rem 1.5rem 3rem',
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,69,0,0.1) 0%, transparent 70%)',
      }}>
        <span style={{
          display: 'block', color: '#FF4500', fontWeight: 700,
          fontSize: '0.75rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', marginBottom: '0.75rem',
        }}>🍗 Menú Completo</span>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 5rem)',
          fontWeight: 400, color: '#fff', letterSpacing: '0.04em',
          margin: '0 0 1rem', lineHeight: 1,
        }}>
          ¿QUÉ SE TE ANTOJA?
        </h1>
        <p style={{ color: '#555', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto' }}>
          Escoge tus favoritos, personaliza tu orden y pide directo por WhatsApp.
        </p>
      </div>

      {/* ── Category filters ── */}
      <div style={{
        display: 'flex', gap: '0.6rem', justifyContent: 'center',
        flexWrap: 'wrap', padding: '0 1.5rem 2.5rem',
      }}>
        {categories.filter(c => c.id !== 'extras').map(cat => {
          const active = activeCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
              padding: '0.55rem 1.4rem', borderRadius: '50px',
              fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.15s ease',
              background: active ? 'linear-gradient(135deg, #FF4500, #FF6500)' : 'rgba(255,255,255,0.05)',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
              color: active ? '#fff' : '#777',
              boxShadow: active ? '0 4px 18px rgba(255,69,0,0.3)' : 'none',
              transform: active ? 'translateY(-1px)' : 'none',
            }}>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Product grid ── */}
      <div ref={gridRef} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1.5rem 1rem',
      }}>
        {filtered.map(product => (
          <div key={product.id}>
            <ProductCard
              product={product}
              onAddToCart={addToCart}
              onCustomize={handleCustomize}
            />
          </div>
        ))}
      </div>

      {/* ── Floating cart CTA ── */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%',
          transform: 'translateX(-50%)', zIndex: 50,
        }}>
          <button
            onClick={() => setCartOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #FF4500, #FF6A00)',
              border: 'none', borderRadius: '100px', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1.1rem',
              letterSpacing: '0.06em', cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(255,69,0,0.45)',
              whiteSpace: 'nowrap',
            }}
          >
            🛒 VER CARRITO
            <span style={{
              background: 'rgba(255,255,255,0.25)', borderRadius: '50px',
              padding: '0.15rem 0.6rem', fontSize: '0.85rem', fontWeight: 800,
            }}>{totalItems}</span>
          </button>
        </div>
      )}

      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        total={totalPrice}
        onClearCart={() => setCartItems([])}
        onAddExtra={handleAddExtra}
      />

      <ChatBot />
    </div>
  );
}
