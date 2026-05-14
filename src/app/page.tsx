'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product } from '@/data/products';
import { products } from '@/data/products';
import { getProductImage } from '@/data/products';
import { track } from '@/lib/analytics';
import Link from 'next/link';
import type { AdminProduct } from '@/lib/adminTypes';
import { useCartStore } from '@/lib/cartStore';
import { TickerBar } from '@/components/sections/Hero';
import { Button } from '@/components/ui/Button';

const Navbar        = dynamic(() => import('@/components/layout/Navbar'),        { ssr: false });
const CombosSection = dynamic(() => import('@/components/sections/CombosSection'), { ssr: false });
const SiteFooter    = dynamic(() => import('@/components/layout/SiteFooter'),    { ssr: false });
const Hero          = dynamic(() => import('@/components/sections/Hero'),          { ssr: false });
const Cart          = dynamic(() => import('@/components/cart/Cart'),          { ssr: false });
const UpsellModal   = dynamic(() => import('@/components/modals/UpsellModal'),   { ssr: false });
const PromoBanner   = dynamic(() => import('@/components/common/PromoBanner'),   { ssr: false });

const ReviewSection  = dynamic(() => import('@/components/sections/ReviewSection'),      { ssr: false, loading: () => <div style={{ minHeight: '720px', background: '#080808' }} /> });
const ContactSection = dynamic(() => import('@/components/sections/ContactSection'),      { ssr: false, loading: () => <div style={{ minHeight: '640px', background: '#0a0a0a' }} /> });

const OrderBot = dynamic(() => import('@/components/chat/OrderBot'), {
  ssr: false,
});

const WelcomeModal = dynamic(() => import('@/components/modals/WelcomeModal'), {
  ssr: false,
});

const CustomCursor = dynamic(() => import('@/components/layout/CustomCursor'), {
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
    const ids: string[] = [];
    // If they added wings/boneless → suggest papas or drinks
    if (product.category === 'proteina') {
      ids.push('5', '6'); // Papas Gajo + Papas Loaded
    } else if (product.category === 'papas') {
      ids.push('1', '3'); // Alitas BBQ + Boneless Clásico
    } else if (product.category === 'combos') {
      ids.push('6'); // Papas Loaded
    }
    return products.filter(p => ids.includes(p.id as string));
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
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px', padding: '1.75rem',
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
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#222', position: 'relative' }}>
                <Image src={getProductImage(item)} alt={item.name} fill style={{ objectFit: 'cover' }} loading="lazy" sizes="48px" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 800, marginTop: '0.1rem' }}>${item.price}</div>
              </div>
              <Button
                onClick={() => { onAdd(item); onClose(); }}
                variant="primary"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '12px' }}
              >
                +
              </Button>
            </div>
          ))}
        </div>

        <Button
          onClick={onClose}
          variant="secondary"
          fullWidth
          style={{ marginTop: '1rem', color: 'var(--text-muted)' }}
        >
          No, gracias
        </Button>
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ─── Homepage Bestsellers Section — shows combos FIRST, then top items ─────
function BestsellersSection({ onAdd }: { onAdd: (product: Product) => void }) {
  const bestsellers = useMemo(() => {
    const combos = products.filter(p => p.category === 'combos').slice(0, 2);
    const popular = products.filter(p => p.popular && p.category !== 'combos').slice(0, 1);
    return [...combos, ...popular];
  }, []);

  return (
    <section style={{ padding: '2.5rem 1.5rem', maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{
          display: 'block', fontSize: '0.6rem', fontWeight: 700,
          color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: '0.35rem',
        }}>Los mas pedidos</span>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          fontWeight: 400, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.03em',
        }}>
          FAVORITOS DEL <span style={{ color: 'var(--accent)' }}>MENU</span>
        </h2>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '0.75rem',
      }}>
        {bestsellers.map(item => (
          <div
            key={item.id}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '14px',
              overflow: 'hidden',
              transition: 'border-color 0.2s, transform 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
            }}
            onClick={() => onAdd(item)}
          >
            <div style={{ position: 'relative', height: '90px', background: '#1a1a1a', overflow: 'hidden' }}>
              <Image src={getProductImage(item)} alt={item.name} fill sizes="(max-width: 640px) 100vw, 200px" style={{ objectFit: 'cover' }} loading="lazy" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,14,14,0.5) 0%, transparent 40%)' }} />
            </div>
            <div style={{ padding: '0.65rem 0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', lineHeight: 1.2 }}>{item.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>${item.price}</span>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent)',
                  background: 'rgba(255,69,0,0.08)', padding: '0.2rem 0.55rem',
                  borderRadius: '8px', border: '1px solid rgba(255,69,0,0.12)',
                }}>
                  + Agregar
                </span>
              </div>
            </div>
          </div>
        ))}
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
          color: 'var(--accent)',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}>Menu completo</span>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
          fontWeight: 400,
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
          margin: '0 0 0.75rem',
          lineHeight: 0.95,
        }}>
          EXPLORA <span style={{ color: 'var(--accent)' }}>TODO</span>
        </h2>

        <p style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--text-muted)',
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
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
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
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-gradient) 100%)',
            borderRadius: '100px',
            color: 'var(--text-primary)',
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

export default function TiendaPage() {
  const { items: cartItems, totalItems, totalPrice, addToCart: storeAddToCart, updateQuantity, clearCart: handleClearCart, removeFromCart } = useCartStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [showProductUpsell, setShowProductUpsell] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<{ name: string; items: string[]; total: number } | null>(null);
  const [activeView, setActiveView] = useState('chat');

  const addToCart = useCallback((product: Product) => {
    track('add_to_cart', { product_name: product.name, price: product.price, category: product.category });
    let shouldShowProductUpsell = false;

    // Product-level upsell for boneless/alitas
    if (product.category === 'proteina' && !showProductUpsell) {
      const hasCombo = cartItems.some(i => i.category === 'combos');
      if (!hasCombo) {
        shouldShowProductUpsell = true;
      }
    }

    storeAddToCart(product);
    setLastAddedProduct(product);

    if (shouldShowProductUpsell) {
      setShowProductUpsell(product);
      return;
    }

    // Trigger upsell after adding
    setShowUpsell(true);
  }, [cartItems, showProductUpsell, storeAddToCart]);

  const handleUpsellUpgrade = useCallback((comboProduct: Product) => {
    if (showProductUpsell) {
      removeFromCart(showProductUpsell.id);
    }
    storeAddToCart(comboProduct);
    setLastAddedProduct(comboProduct);
    setShowProductUpsell(null);
    setCartOpen(true);
  }, [showProductUpsell, removeFromCart, storeAddToCart]);

  const handleUpsellSkip = useCallback(() => {
    setShowProductUpsell(null);
    setShowUpsell(true);
  }, []);

  // Load last order for reorder
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snacks911_last_order');
      if (saved) {
        requestAnimationFrame(() => {
          setLastOrder(JSON.parse(saved));
        });
      }
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



  const handleCartOpen = useCallback(() => {
    setCartOpen(true);
  }, []);

  const handleCartClose = useCallback(() => {
    setCartOpen(false);
  }, []);



  const handleAddExtra = useCallback((extra: AdminProduct) => {
    const asProduct = {
      id: `${extra.id}_ext`,
      name: extra.name,
      description: extra.description,
      price: extra.price,
      category: 'extras' as const,
      image: extra.imageUrl || '/images/combo.webp',
      ingredients: extra.ingredients || [],
    };
    addToCart(asProduct);
  }, [addToCart]);

  const featuredCombo = useMemo(() => products.find(p => p.id === '7') ?? products[6] ?? null, []);

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
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', width: '100%', overflowX: 'hidden', paddingTop: '4.5rem' }}>
      <CustomCursor />
      <TickerBar />
      <Navbar cartCount={totalItems} onCartOpen={handleCartOpen} minimal={activeView === 'chat'} />

      <OrderBot inline activeView={activeView} onActiveViewChange={setActiveView} onProductsVisible={() => {}} />

      <div className="gsap-panel" data-pin-panel="true" style={{ position: 'relative', zIndex: 10, background: 'var(--bg-primary)' }}>
        <Hero featuredProduct={featuredCombo} onOrderFeatured={handleOrderFeatured} />
      </div>

      {/* Reorder banner — only if user has a previous order */}
      {lastOrder && cartItems.length === 0 && (
        <div style={{
          position: 'relative', zIndex: 11, background: 'var(--bg-primary)',
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            maxWidth: '600px', margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'rgba(255,69,0,0.06)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
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
                padding: '0.55rem 1.25rem', borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-gradient))',
                border: 'none', color: 'var(--text-primary)',
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
      <div style={{ position: 'relative', zIndex: 11, background: 'var(--bg-primary)' }}>
        <PromoBanner />
      </div>

      {/* Combos Section — visible only in catalog view */}
      {activeView === 'catalog' && (
      <div style={{ position: 'relative', zIndex: 11, background: 'var(--bg-primary)' }}>
        <CombosSection onAdd={addToCart} />
      </div>
      )}

      {/* Bestsellers — visible only in catalog view */}
      {activeView === 'catalog' && (
      <div style={{ position: 'relative', zIndex: 12, background: 'var(--bg-primary)' }}>
        <BestsellersSection onAdd={(p) => { addToCart(p); setCartOpen(true); }} />
      </div>
      )}

      {/* Menu CTA */}
      <div style={{ position: 'relative', zIndex: 13, background: 'var(--bg-primary)' }}>
        <MenuCTASection />
      </div>

      {/* Reviews */}
      <div className="gsap-panel" style={{ position: 'relative', zIndex: 14, background: 'var(--bg-primary)', boxShadow: '0 -15px 30px rgba(0,0,0,0.8)' }}>
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
          <Button
            onClick={() => setCartOpen(true)}
            variant="primary"
            fullWidth
            style={{
              padding: '0.85rem',
              pointerEvents: 'auto',
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
          </Button>
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

    </main>
  );
}
