'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product } from '@/data/products';
import { products } from '@/data/products';
import type { CartItem } from '@/types';
import { track } from '@/lib/analytics';
import Link from 'next/link';
import type { AdminProduct } from '@/lib/adminTypes';

// All interactive/animated components use ssr:false to prevent hydration mismatches
const Navbar        = dynamic(() => import('@/components/Navbar'),        { ssr: false });
const CombosSection = dynamic(() => import('@/components/CombosSection'), { ssr: false });
const SiteFooter    = dynamic(() => import('./components/SiteFooter'),    { ssr: false });
const Hero          = dynamic(() => import('@/components/Hero'),          { ssr: false });
const TickerBar     = dynamic(() => import('@/components/Hero').then(m => ({ default: m.TickerBar })), { ssr: false });
const Cart          = dynamic(() => import('@/components/Cart'),          { ssr: false });
const UpsellModal   = dynamic(() => import('@/components/UpsellModal'),   { ssr: false });
const PromoBanner   = dynamic(() => import('@/components/PromoBanner'),   { ssr: false });

const ReviewSection  = dynamic(() => import('@/components/ReviewSection'),      { ssr: false, loading: () => <div style={{ minHeight: '720px', background: '#080808' }} /> });
const ContactSection = dynamic(() => import('./components/ContactSection'),      { ssr: false, loading: () => <div style={{ minHeight: '640px', background: '#0a0a0a' }} /> });

const OrderBot = dynamic(() => import('@/components/OrderBot'), {
  ssr: false,
});

const WelcomeModal = dynamic(() => import('@/components/WelcomeModal'), {
  ssr: false,
});

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), {
  ssr: false,
});

// ─── Upsell Popup — "¿Algo más?" after adding to cart ────────────────────────
function UpsellPopup({
  product,
  onAdd,
  onClose,
}: {
  product: Product;
  onAdd: (product: Product) => void;
  onClose: () => void;
}) {
  // Suggest 2-3 high-margin items that complement what was added
  const suggestions = useMemo(() => {
    const ids: number[] = [];
    // If they added wings/boneless → suggest papas or drinks
    if (product.category === 'alitas' || product.category === 'boneless') {
      ids.push(5, 6); // Papas Gajo + Papas Loaded
    } else if (product.category === 'papas') {
      ids.push(1, 3); // Alitas BBQ + Boneless Clásico
    } else if (product.category === 'combos') {
      ids.push(6); // Papas Loaded
    }
    return products.filter(p => ids.includes(p.id));
  }, [product]);

  if (suggestions.length === 0) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', animation: 'fadeUp 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '380px',
          background: 'rgba(14,14,14,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px', padding: '1.75rem',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
            Algo mas?
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#666', lineHeight: 1.5 }}>
            Completa tu pedido con estos favoritos
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {suggestions.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.75rem', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#222', position: 'relative' }}>
                <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} loading="lazy" sizes="48px" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ddd' }}>{item.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#FF4500', fontWeight: 800, marginTop: '0.1rem' }}>${item.price}</div>
              </div>
              <button
                onClick={() => { onAdd(item); onClose(); }}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                  border: 'none', color: '#fff', fontSize: '1.1rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: '1rem', padding: '0.7rem',
            background: 'none', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', color: '#666', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          No, gracias
        </button>
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ─── Homepage Bestsellers Section — shows combos FIRST, then top items ─────
function BestsellersSection({ onAdd }: { onAdd: (product: Product) => void }) {
  const bestsellers = useMemo(() => {
    // Top 3 items: 2 combos + 1 popular item
    const combos = products.filter(p => p.category === 'combos').slice(0, 2);
    const popular = products.filter(p => p.popular && p.category !== 'combos').slice(0, 1);
    return [...combos, ...popular];
  }, []);

  return (
    <section style={{ padding: '3rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span style={{
          display: 'block', fontSize: '0.65rem', fontWeight: 700,
          color: '#FF4500', letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>Los mas pedidos</span>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.04em',
        }}>
          FAVORITOS DEL <span style={{ color: '#FF4500' }}>MENU</span>
        </h2>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem', marginBottom: '2rem',
      }}>
        {bestsellers.map(item => (
          <div
            key={item.id}
            style={{
              background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
            }}
          >
            <div style={{ position: 'relative', height: '140px', background: '#1a1a1a', overflow: 'hidden' }}>
              <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 100vw, 320px" style={{ objectFit: 'cover' }} loading="lazy" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,14,14,0.6) 0%, transparent 50%)' }} />
              {item.badge && (
                <span style={{
                  position: 'absolute', top: '8px', left: '8px',
                  background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                  borderRadius: '6px', padding: '0.2rem 0.5rem',
                  fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                }}>{item.badge}</span>
              )}
            </div>
            <div style={{ padding: '0.85rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.15rem' }}>{item.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.4, marginBottom: '0.5rem' }}>{item.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FF4500' }}>${item.price}</span>
                <button
                  onClick={() => onAdd(item)}
                  style={{
                    fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                    background: item.category === 'combos' && item.badges?.some(b => b.includes('Más pedido'))
                      ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                      : 'rgba(255,69,0,0.85)',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '8px', border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'transform 0.15s ease',
                    boxShadow: item.category === 'combos' && item.badges?.some(b => b.includes('Más pedido'))
                      ? '0 0 12px rgba(255,69,0,0.3)'
                      : 'none',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  {item.category === 'combos' && item.badges?.some(b => b.includes('Más pedido'))
                    ? '🔥 Más vendido'
                    : item.category === 'combos'
                      ? 'Pedir Combo'
                      : 'Recomendado'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link
          href="/menu"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            color: '#FF4500', textDecoration: 'none',
            fontWeight: 700, fontSize: '0.82rem',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          Ver menu completo →
        </Link>
      </div>
    </section>
  );
}

// ─── Menu CTA section — clean prompt to explore full menu ────────────────────
function MenuCTASection() {
  return (
    <section
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient fire glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 60%, rgba(255,69,0,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '560px' }}>
        <span style={{
          display: 'block',
          fontFamily: 'var(--font-body)',
          fontSize: '0.65rem',
          color: '#FF4500',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}>Menu completo</span>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
          fontWeight: 400,
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.75rem',
          lineHeight: 0.95,
        }}>
          EXPLORA <span style={{ color: '#FF4500' }}>TODO</span>
        </h2>

        <p style={{
          fontFamily: 'var(--font-body)',
          color: '#555',
          fontSize: '0.92rem',
          lineHeight: 1.6,
          margin: '0 0 2rem',
        }}>
          Combos, alitas, boneless, papas y extras — personaliza tu orden y pide directo por WhatsApp.
        </p>

        {/* Category previews */}
        <div style={{
          display: 'flex',
          gap: '0.6rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '2rem',
        }}>
          {['Combos', 'Alitas', 'Boneless', 'Papas', 'Extras'].map((cat) => (
            <span key={cat} style={{
              padding: '0.4rem 1rem',
              borderRadius: '50px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#666',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
            }}>{cat}</span>
          ))}
        </div>

        {/* CTA Button */}
        <Link
          href="/menu"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.9rem 2.25rem',
            background: 'linear-gradient(135deg, #FF4500 0%, #FF6A00 100%)',
            borderRadius: '100px',
            color: '#fff',
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            letterSpacing: '0.08em',
            fontWeight: 400,
            boxShadow: '0 0 30px rgba(255,69,0,0.3), 0 6px 24px rgba(255,69,0,0.2)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.04) translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(255,69,0,0.45), 0 10px 32px rgba(255,69,0,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(255,69,0,0.3), 0 6px 24px rgba(255,69,0,0.2)';
          }}
        >
          VER MENU COMPLETO
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </section>
  );
}

export default function Page() {
  // Always start with empty array on SSR — localStorage rehydration happens in useEffect
  // (typeof window branch in useState initializer causes hydration mismatch)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [showProductUpsell, setShowProductUpsell] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<{ name: string; items: string[]; total: number } | null>(null);

  const addToCart = useCallback((product: Product) => {
    track('add_to_cart', { product_name: product.name, price: product.price, category: product.category });
    let shouldShowProductUpsell = false;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const next = existing
        ? prev.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...prev, { ...product, quantity: 1 }];

      // Product-level upsell for boneless/alitas
      if ((product.category === 'boneless' || product.category === 'alitas') && !showProductUpsell) {
        const hasCombo = prev.some(i => i.category === 'combos');
        if (!hasCombo) {
          shouldShowProductUpsell = true;
        }
      }

      return next;
    });

    setLastAddedProduct(product);

    if (shouldShowProductUpsell) {
      setShowProductUpsell(product);
      return;
    }

    // Trigger upsell after adding
    setShowUpsell(true);
  }, [showProductUpsell]);

  const handleUpsellUpgrade = useCallback((comboProduct: Product) => {
    if (showProductUpsell) {
      setCartItems(prev => prev.filter(i => i.id !== showProductUpsell.id));
    }
    setCartItems(prev => [...prev, { ...comboProduct, quantity: 1 }]);
    setLastAddedProduct(comboProduct);
    setShowProductUpsell(null);
    setCartOpen(true);
  }, [showProductUpsell]);

  const handleUpsellSkip = useCallback(() => {
    setShowProductUpsell(null);
    setShowUpsell(true);
  }, []);

  // Rehydrate cart from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snacks911_cart');
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (parsed.length > 0) setCartItems(parsed);
      }
    } catch {}
  }, []);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem('snacks911_cart', JSON.stringify(cartItems));
      } else {
        localStorage.removeItem('snacks911_cart');
      }
    } catch {}
  }, [cartItems]);

  // Load last order for reorder
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snacks911_last_order');
      if (saved) setLastOrder(JSON.parse(saved));
    } catch {}
  }, []);

  const handleReorder = useCallback(() => {
    if (!lastOrder) return;
    // Re-add all items from last order
    lastOrder.items.forEach(name => {
      const match = products.find(p => p.name === name);
      if (match) addToCart(match);
    });
    setCartOpen(true);
  }, [lastOrder, addToCart]);

  const updateQuantity = useCallback((id: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleCartOpen = useCallback(() => {
    setCartOpen(true);
  }, []);

  const handleCartClose = useCallback(() => {
    setCartOpen(false);
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const handleAddExtra = useCallback((extra: AdminProduct) => {
    const asProduct = {
      id: parseInt(extra.id.replace(/\D/g, '')) + 900,
      name: extra.name,
      description: extra.description,
      price: extra.price,
      category: 'extras' as const,
      image: extra.imageUrl || '/images/combo.webp',
    };
    addToCart(asProduct);
  }, [addToCart]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const featuredCombo = useMemo(() => products.find(p => p.id === 7) ?? products[6] ?? null, []);

  const handleOrderFeatured = useCallback(() => {
    if (!featuredCombo) return;
    addToCart(featuredCombo);
    setCartOpen(true);
  }, [featuredCombo, addToCart]);

  // Lightweight CSS scroll reveal via IntersectionObserver
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      [data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .6s ease,transform .6s ease}
      [data-reveal].revealed{opacity:1;transform:translateY(0)}
      [data-reveal="scale"]{transform:scale(.92) translateY(16px)}
      [data-reveal="scale"].revealed{transform:scale(1) translateY(0)}
      [data-reveal="left"]{transform:translateX(-28px)}
      [data-reveal="left"].revealed{transform:translateX(0)}
      [data-reveal="right"]{transform:translateX(28px)}
      [data-reveal="right"].revealed{transform:translateX(0)}
      [data-reveal-group]>*{opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease}
      [data-reveal-group].revealed>*{opacity:1;transform:translateY(0)}
      [data-reveal-group].revealed>*:nth-child(2){transition-delay:.1s}
      [data-reveal-group].revealed>*:nth-child(3){transition-delay:.2s}
    `;
    document.head.appendChild(style);
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('[data-reveal],[data-reveal-group]').forEach(el => io.observe(el));
    return () => { io.disconnect(); try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main style={{ background: '#080808', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <CustomCursor />
      <TickerBar />
      <Navbar cartCount={totalItems} onCartOpen={handleCartOpen} />

      <div className="gsap-panel" data-pin-panel="true" style={{ position: 'relative', zIndex: 10, background: '#080808' }}>
        <Hero featuredProduct={featuredCombo} onOrderFeatured={handleOrderFeatured} />
      </div>

      {/* Reorder banner — only if user has a previous order */}
      {lastOrder && cartItems.length === 0 && (
        <div style={{
          position: 'relative', zIndex: 11, background: '#080808',
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            maxWidth: '600px', margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'rgba(255,69,0,0.06)',
            border: '1px solid rgba(255,69,0,0.15)',
            borderRadius: '14px',
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#FF4500', fontWeight: 700, marginBottom: '0.15rem' }}>
                Lo mismo de siempre?
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888' }}>
                {lastOrder.items.join(', ')} — ${lastOrder.total}
              </div>
            </div>
            <button
              onClick={handleReorder}
              style={{
                padding: '0.55rem 1.25rem', borderRadius: '10px', flexShrink: 0,
                background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                border: 'none', color: '#fff',
                fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Repetir →
            </button>
          </div>
        </div>
      )}

      {/* Promo Banner */}
      <div style={{ position: 'relative', zIndex: 11, background: '#080808' }}>
        <PromoBanner onAdd={(p) => { addToCart(p); setCartOpen(true); }} />
      </div>

      {/* Combos Section */}
      <div style={{ position: 'relative', zIndex: 11, background: '#080808' }}>
        <CombosSection onAdd={addToCart} />
      </div>

      {/* Bestsellers */}
      <div style={{ position: 'relative', zIndex: 12, background: '#080808' }}>
        <BestsellersSection onAdd={(p) => { addToCart(p); setCartOpen(true); }} />
      </div>

      {/* Menu CTA */}
      <div style={{ position: 'relative', zIndex: 13, background: '#080808' }}>
        <MenuCTASection />
      </div>

      {/* Reviews */}
      <div className="gsap-panel" style={{ position: 'relative', zIndex: 14, background: '#080808', boxShadow: '0 -15px 30px rgba(0,0,0,0.8)' }}>
        <ReviewSection />
      </div>

      <div className="gsap-panel" data-pin-panel="true" style={{ position: 'relative', zIndex: 15, background: '#0a0a0a', boxShadow: '0 -15px 30px rgba(0,0,0,0.9)' }}>
        <ContactSection />
      </div>
      <div style={{ position: 'relative', zIndex: 16, background: '#050505' }}>
        <SiteFooter />
      </div>

      {/* Sticky mobile CTA bar */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2.5rem',
          left: 0,
          right: 0,
          zIndex: 95,
          padding: '0.65rem 1rem',
          paddingBottom: 'max(0.65rem, env(safe-area-inset-bottom))',
          pointerEvents: 'none',
        }}>
          <button
            onClick={() => setCartOpen(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem',
              background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none',
              borderRadius: '14px',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 24px rgba(255,69,0,0.3)',
              pointerEvents: 'auto',
              letterSpacing: '0.02em',
            }}
          >
            Ver pedido
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '6px',
              padding: '0.1rem 0.55rem',
              fontSize: '0.82rem',
            }}>
              {totalItems}
            </span>
            <span style={{ opacity: 0.6 }}>·</span>
            <span>${totalPrice}</span>
          </button>
        </div>
      )}

      <Cart
        isOpen={cartOpen}
        onClose={handleCartClose}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        total={totalPrice}
        onClearCart={handleClearCart}
        onAddExtra={handleAddExtra}
        onAddProduct={addToCart}
      />

      {/* Upsell popup */}
      {showUpsell && lastAddedProduct && (
        <UpsellPopup
          product={lastAddedProduct}
          onAdd={addToCart}
          onClose={() => setShowUpsell(false)}
        />
      )}

      {/* Product-level upsell (combo upgrade) */}
      {showProductUpsell && (
        <UpsellModal
          product={showProductUpsell}
          onUpgrade={handleUpsellUpgrade}
          onSkip={handleUpsellSkip}
        />
      )}

      <WelcomeModal onClaim={() => {}} />

      <OrderBot onAddToCart={addToCart} onCartOpen={handleCartOpen} />
    </main>
  );
}
