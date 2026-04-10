'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Hero, { TickerBar } from '@/components/Hero';
import Cart from '@/components/Cart';
import UpsellModal from '@/components/UpsellModal';
import SiteFooter from './components/SiteFooter';
import type { Product } from '@/data/products';
import { products } from '@/data/products';
import type { CartItem } from '@/types';
import { track } from '@/lib/analytics';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import type { AdminProduct } from '@/lib/adminTypes';


gsap.registerPlugin(ScrollTrigger);

const ReviewSection = dynamic(() => import('@/components/ReviewSection'), {
  loading: () => <div style={{ minHeight: '720px', background: '#080808' }} />,
});




const ContactSection = dynamic(() => import('./components/ContactSection'), {
  loading: () => <div style={{ minHeight: '640px', background: '#0a0a0a' }} />,
});

const ChatBot = dynamic(() => import('@/components/ChatBot'), {
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
          <span style={{ fontSize: '2rem' }}>🤤</span>
          <h3 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
            ¿Algo más?
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
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#222' }}>
                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

// ─── Homepage Bestsellers Section ────────────────────────────────────────────
function BestsellersSection({ onAdd }: { onAdd: (product: Product) => void }) {
  // Top 3 high-margin bestsellers
  const bestsellers = useMemo(() => {
    return products.filter(p => p.popular).slice(0, 3);
  }, []);

  return (
    <section style={{ padding: '3rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span style={{
          display: 'block', fontSize: '0.72rem', fontWeight: 700,
          color: '#FF4500', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>🔥 Los Más Pedidos</span>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.04em',
        }}>
          LOS FAVORITOS DEL <span style={{ color: '#FF4500' }}>MENÚ</span>
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
              background: 'rgba(20,20,20,0.7)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px',
              overflow: 'hidden', cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={() => onAdd(item)}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(255,69,0,0.15)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <div style={{ position: 'relative', height: '140px', background: '#1a1a1a', overflow: 'hidden' }}>
              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,14,14,0.6) 0%, transparent 50%)' }} />
              {item.badge && (
                <span style={{
                  position: 'absolute', top: '8px', left: '8px',
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                  borderRadius: '6px', padding: '0.2rem 0.5rem',
                  fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                }}>{item.badge}</span>
              )}
            </div>
            <div style={{ padding: '0.85rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.15rem' }}>{item.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.4, marginBottom: '0.5rem' }}>{item.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FF4500' }}>${item.price}</span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, color: '#FF4500',
                  background: 'rgba(255,69,0,0.1)', padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                }}>+ Agregar</span>
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
            fontWeight: 700, fontSize: '0.85rem',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          Ver menú completo →
        </Link>
      </div>
    </section>
  );
}

// ─── Menu teaser panel shown on homepage ─────────────────────────────────────
function MenuTeaser() {
  return (
    <section
      id="menu"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient fire glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 60%, rgba(255,69,0,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '700px',
        height: '300px',
        background: 'radial-gradient(ellipse at center bottom, rgba(255,69,0,0.18) 0%, transparent 65%)',
        pointerEvents: 'none',
        filter: 'blur(40px)',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '640px' }}>
        <span data-reveal="up" style={{
          display: 'block',
          fontFamily: 'var(--font-body)',
          fontSize: '0.78rem',
          color: '#FF4500',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: '1.25rem',
        }}>🍗 Menú Completo</span>

        <h2 data-reveal="up" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          fontWeight: 400,
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 1rem',
          lineHeight: 0.95,
        }}>
          ¿QUÉ SE TE<br />
          <span style={{ color: '#FF4500' }}>ANTOJA?</span>
        </h2>

        <p data-reveal="up" style={{
          fontFamily: 'var(--font-body)',
          color: '#666',
          fontSize: '1.05rem',
          lineHeight: 1.6,
          margin: '0 0 2.5rem',
        }}>
          Alitas, boneless, papas y más — todo en un solo lugar.
          Escoge, personaliza y pide directo por WhatsApp.
        </p>

        {/* Category previews */}
        <div data-reveal-group style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '2.5rem',
        }}>
          {['🔥 Combos', '🍗 Arma tu orden', '➕ Extras'].map((cat) => (
            <span key={cat} style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '50px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#888',
              fontSize: '0.82rem',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
            }}>{cat}</span>
          ))}
        </div>

        {/* CTA Button */}
        <Link
          href="/menu"
          data-reveal="scale"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.1rem 2.75rem',
            background: 'linear-gradient(135deg, #FF4500 0%, #FF6A00 100%)',
            borderRadius: '100px',
            color: '#fff',
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            fontSize: '1.55rem',
            letterSpacing: '0.08em',
            fontWeight: 400,
            boxShadow: '0 0 40px rgba(255,69,0,0.4), 0 8px 32px rgba(255,69,0,0.25)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.05) translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(255,69,0,0.55), 0 12px 40px rgba(255,69,0,0.35)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(255,69,0,0.4), 0 8px 32px rgba(255,69,0,0.25)';
          }}
        >
          VER MENÚ COMPLETO
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </section>
  );
}

export default function Page() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Restore cart from localStorage on first load
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('snacks911_cart');
        if (saved) return JSON.parse(saved) as CartItem[];
      } catch {}
    }
    return [];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [showProductUpsell, setShowProductUpsell] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<{ name: string; items: string[]; total: number } | null>(null);

  const addToCart = useCallback((product: Product) => {
    track('add_to_cart', { product_name: product.name, price: product.price, category: product.category });
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setLastAddedProduct(product);

    // Product-level upsell for boneless/alitas
    if ((product.category === 'boneless' || product.category === 'alitas') && !showProductUpsell) {
      const hasCombo = cartItems.some(i => i.category === 'combos');
      if (!hasCombo) {
        setShowProductUpsell(product);
        return;
      }
    }

    // Trigger upsell after adding
    setShowUpsell(true);
  }, [cartItems, showProductUpsell]);

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

  // GSAP Layered Pinning (Panel Wipe)
  useEffect(() => {
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        const panels = gsap.utils.toArray<HTMLElement>('[data-pin-panel="true"]');
        panels.forEach((panel, i) => {
          if (i === panels.length - 1) return;
          ScrollTrigger.create({
            trigger: panel,
            start: () => panel.offsetHeight <= window.innerHeight ? 'top top' : 'bottom bottom',
            pin: true,
            pinSpacing: true,
          });
        });
      });
      return () => ctx.revert();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ScrollTrigger reveal animations for elements inside each panel
  useEffect(() => {
    const timer = setTimeout(() => {
      // Reveal anything tagged with [data-reveal]
      const revealEls = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      revealEls.forEach((el) => {
        const dir = el.dataset.reveal || 'up';
        const fromVars: gsap.TweenVars = { opacity: 0, duration: 0.7, ease: 'power3.out' };
        if (dir === 'up')    { fromVars.y = 40; }
        if (dir === 'left')  { fromVars.x = -40; }
        if (dir === 'right') { fromVars.x = 40; }
        if (dir === 'scale') { fromVars.scale = 0.88; fromVars.y = 20; }

        gsap.from(el, {
          ...fromVars,
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        });
      });

      // Staggered children reveal for [data-reveal-group]
      const groups = gsap.utils.toArray<HTMLElement>('[data-reveal-group]');
      groups.forEach((group) => {
        gsap.from(group.children, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: group,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        });
      });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main style={{ background: '#080808', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
      <CustomCursor />
      <TickerBar />
      <Navbar cartCount={totalItems} onCartOpen={handleCartOpen} />

      <div className="gsap-panel" data-pin-panel="true" style={{ position: 'relative', zIndex: 10, background: '#080808' }}>
        <Hero />
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
                🔄 ¿Lo mismo de siempre?
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

      <div className="gsap-panel" style={{ position: 'relative', zIndex: 11, background: '#080808', boxShadow: '0 -15px 30px rgba(0,0,0,0.8)' }}>
        <ReviewSection />
      </div>

      {/* Bestsellers — direct product showcase before menu teaser */}
      <div style={{ position: 'relative', zIndex: 12, background: '#080808' }}>
        <BestsellersSection onAdd={addToCart} />
      </div>

      <div className="gsap-panel" data-pin-panel="true" style={{ position: 'relative', zIndex: 13, background: '#080808', boxShadow: '0 -15px 30px rgba(0,0,0,0.8)' }}>
        <MenuTeaser />
      </div>

      <div className="gsap-panel" data-pin-panel="true" style={{ position: 'relative', zIndex: 14, background: '#0a0a0a', boxShadow: '0 -15px 30px rgba(0,0,0,0.9)' }}>
        <ContactSection />
      </div>
      <div style={{ position: 'relative', zIndex: 15, background: '#050505' }}>
        <SiteFooter />
      </div>

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

      <ChatBot />
    </main>
  );
}
