'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { products as staticProducts, categories, getProductImage } from '@/data/products';
import type { Product } from '@/data/products';
import type { CartItem } from '@/types';
import type { AdminProduct, Order } from '@/lib/adminTypes';
import { track } from '@/lib/analytics';
import { AdminStore } from '@/lib/adminStore';
import { analyzeSales } from '@/lib/salesOptimizer';
import { useCartStore } from '@/lib/cartStore';
import { Button } from '@/components/ui/Button';

import ProductCard from '@/components/ProductCard';
import ProductCustomizerModal from '@/components/ProductCustomizerModal';
import Cart from '@/components/Cart';
import UpsellModal from '@/components/UpsellModal';
import CartUpsellBanner from '@/components/CartUpsellBanner';

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), { ssr: false });
const OrderBot     = dynamic(() => import('@/components/OrderBot'),      { ssr: false });

function categoryFromDb(category: string): Product['category'] {
  const normalized = category.trim().toLowerCase();
  if (normalized === 'alitas' || normalized === 'boneless' || normalized === 'proteina') return 'proteina';
  if (normalized === 'papas') return 'papas';
  if (normalized === 'combos') return 'combos';
  if (normalized === 'banderillas') return 'banderillas';
  if (normalized === 'postres') return 'postres';
  if (normalized === 'bebidas') return 'bebidas';
  return 'extras';
}

function numericIdFromString(id: string) {
  const onlyDigits = id.replace(/\D/g, '');
  if (onlyDigits.length > 0) return Number(onlyDigits.slice(0, 9));
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return 100000 + (hash % 900000);
}

// ─── Upsell Popup (same as homepage) ─────────────────────────────────────────
function UpsellPopup({
  product,
  onAdd,
  onClose,
}: {
  product: Product;
  onAdd: (product: Product) => void;
  onClose: () => void;
}) {
  const suggestions = useMemo(() => {
    const ids: number[] = [];
    if (product.category === 'proteina') {
      ids.push(5, 6);
    } else if (product.category === 'papas') {
      ids.push(1, 3);
    } else if (product.category === 'combos') {
      ids.push(6);
    }
    return staticProducts.filter(p => ids.includes(p.id));
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
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#222', position: 'relative' }}>
                <Image src={getProductImage(item)} alt={item.name} fill sizes="48px" style={{ objectFit: 'cover' }} loading="lazy" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ddd' }}>{item.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#FF4500', fontWeight: 800, marginTop: '0.1rem' }}>${item.price}</div>
              </div>
               <Button
                 onClick={() => { onAdd(item); onClose(); }}
                 variant="primary"
                 style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}
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

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('todos');
  const { items: cartItems, totalItems, totalPrice, addToCart: storeAddToCart, updateQuantity, clearCart: handleClearCart, removeFromCart } = useCartStore();
  const [cartOpen, setCartOpen]       = useState(false);
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const [showUpsell, setShowUpsell]   = useState(false);
  const [lastAdded, setLastAdded]     = useState<Product | null>(null);
  const [showProductUpsell, setShowProductUpsell] = useState<Product | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dbProducts, setDbProducts] = useState<AdminProduct[]>([]);
  const menuProducts = useMemo<Product[]>(() => {
    if (dbProducts.length === 0) return staticProducts;
    return dbProducts
      .filter(p => p.available)
      .map((p) => ({
        id: numericIdFromString(p.id),
        name: p.name,
        description: p.description || '',
        price: p.price,
        category: categoryFromDb(p.category),
        image: p.imageUrl || getProductImage({ id: p.id, name: p.name, category: p.category }),
        available: p.available,
      }));
  }, [dbProducts]);

  const gridRef = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  const [showAllAlaCarte, setShowAllAlaCarte] = useState(false);

  // Load orders for performance-based sorting
  useEffect(() => {
    Promise.all([
      AdminStore.getOrders(),
      AdminStore.getProducts(),
    ]).then(([o, p]) => {
      setOrders(o);
      setDbProducts(p);
    }).catch(() => {});
  }, []);

  // Performance-based sorting using sales data
  const performanceRank = useMemo(() => {
    if (orders.length === 0 || dbProducts.length === 0) {
      // Fallback: use popular flag
      const rank: Record<number, number> = {};
      menuProducts.forEach((p, i) => {
        rank[p.id] = p.popular ? 100 - i : 50 - i;
      });
      return rank;
    }

    const analysis = analyzeSales(orders, dbProducts);
    const rank: Record<number, number> = {};

    // Default rank for all products
    menuProducts.forEach((p) => { rank[p.id] = 50; });

    // Assign scores based on position in bestSellers/lowPerformers
    analysis.bestSellers.forEach((item, i) => {
      const productId = parseInt(item.productId.replace(/\D/g, ''));
      if (productId) rank[productId] = 100 - i * 10;
    });

    analysis.lowPerformers.forEach((item, i) => {
      const productId = parseInt(item.productId.replace(/\D/g, ''));
      if (productId) rank[productId] = 10 - i * 5;
    });

    return rank;
  }, [orders, dbProducts, menuProducts]);

  // Sectioned menu: ordered by priority
  const combos = useMemo(() =>
    menuProducts.filter(p => p.category === 'combos')
      .sort((a, b) => (performanceRank[b.id] || 0) - (performanceRank[a.id] || 0)),
    [performanceRank, menuProducts]
  );

  const alaCarteAll = useMemo(() =>
    menuProducts.filter(p => ['proteina', 'papas', 'banderillas', 'postres'].includes(p.category))
      .sort((a, b) => {
        // Order: proteina > papas > banderillas > postres
        const order = { proteina: 1, papas: 2, banderillas: 3, postres: 4 };
        const catDiff = (order[a.category as keyof typeof order] || 99) - (order[b.category as keyof typeof order] || 99);
        if (catDiff !== 0) return catDiff;
        return (performanceRank[b.id] || 0) - (performanceRank[a.id] || 0);
      }),
    [performanceRank, menuProducts]
  );

  const topSellers = alaCarteAll.slice(0, 4);
  const restItems = alaCarteAll.slice(4);
  const alaCarte = showAllAlaCarte ? alaCarteAll : topSellers;
  const extras = menuProducts.filter(p => p.category === 'extras');

  // For category filter mode (when user taps a specific tab)
  const filtered = useMemo(() => {
    const base = activeCategory === 'todos'
      ? menuProducts.filter(p => !['extras'].includes(p.category))
      : menuProducts.filter(p => p.category === activeCategory);
    return base.sort((a, b) => (performanceRank[b.id] || 0) - (performanceRank[a.id] || 0));
  }, [activeCategory, performanceRank, menuProducts]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = useCallback((product: Product, extraNames?: string[]) => {
    track('add_to_cart', { product_name: product.name, price: product.price, category: product.category });
    let shouldShowProductUpsell = false;

    // Product-level upsell for boneless/alitas (only if cart doesn't already have combos)
    if (product.category === 'proteina' && !showProductUpsell) {
      const hasCombo = cartItems.some(i => i.category === 'combos');
      if (!hasCombo) {
        shouldShowProductUpsell = true;
      }
    }

    const payload = { ...product, linkedExtras: extraNames };
    storeAddToCart(payload);

    setLastAdded(product);

    if (shouldShowProductUpsell) {
      setShowProductUpsell(product);
      return;
    }

    setShowUpsell(true);
  }, [cartItems, showProductUpsell, storeAddToCart]);

  // Upsell upgrade handler: replace pending product with combo
  const handleUpsellUpgrade = useCallback((comboProduct: Product) => {
    // Remove the original item that triggered upsell
    if (showProductUpsell) {
      removeFromCart(showProductUpsell.id);
    }
    // Add the combo
    storeAddToCart(comboProduct);
    setLastAdded(comboProduct);
    setShowProductUpsell(null);
    // Open cart to show the upgrade
    setCartOpen(true);
  }, [showProductUpsell, removeFromCart, storeAddToCart]);

  const handleUpsellSkip = useCallback(() => {
    setShowProductUpsell(null);
    // Still show micro-upsell for non-combo adds
    setShowUpsell(true);
  }, []);



  const handleAddExtra = useCallback((extra: AdminProduct, standalone = true) => {
    const asProduct = {
      id: parseInt(extra.id.replace(/\D/g, '')) + 900,
      name: extra.name,
      description: extra.description,
      price: extra.price,
      category: 'extras' as const,
      image: extra.imageUrl || '/images/combo.webp',
      isStandaloneExtra: standalone
    };
    storeAddToCart(asProduct);
  }, [storeAddToCart]);

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
    // Trigger CSS re-animation by toggling a key class
    if (gridRef.current) {
      gridRef.current.classList.remove('grid-animate');
      void gridRef.current.offsetWidth;
      gridRef.current.classList.add('grid-animate');
    }
  }, [activeCategory, combos.length, alaCarte.length]);



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
        flexWrap: 'wrap', padding: '0 1.5rem 2rem',
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

      {/* ── Sectioned Menu (shown when "Todos") ── */}
      {activeCategory === 'todos' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem 7rem' }}>

          {/* Section 1: 🔥 Combos */}
          <section style={{ marginBottom: '2.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              marginBottom: '1rem', padding: '0 0.5rem',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                🔥 Combos
              </h2>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div ref={gridRef} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}>
              {combos.map(product => (
                <div key={product.id}>
                  <ProductCard
                    product={product}
                    onAddToCart={addToCart}
                    onCustomize={handleCustomize}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: 🍗 Alitas & Boneless */}
          {(() => {
            const sectionItems = alaCarteAll.filter(p => p.category === 'proteina');
            if (sectionItems.length === 0) return null;
            return (
              <section style={{ marginBottom: '2.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '1rem', padding: '0 0.5rem',
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                    fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                  }}>
                    🍗 Alitas & Boneless
                  </h2>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '0.85rem',
                }}>
                  {sectionItems.map(product => (
                    <div key={product.id}>
                      <ProductCard
                        product={product}
                        onAddToCart={addToCart}
                        onCustomize={handleCustomize}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Section 4: 🍟 Papas */}
          {(() => {
            const sectionItems = alaCarteAll.filter(p => p.category === 'papas');
            if (sectionItems.length === 0) return null;
            return (
              <section style={{ marginBottom: '2.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '1rem', padding: '0 0.5rem',
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                    fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                  }}>
                    🍟 Papas
                  </h2>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '0.85rem',
                }}>
                  {sectionItems.map(product => (
                    <div key={product.id}>
                      <ProductCard
                        product={product}
                        onAddToCart={addToCart}
                        onCustomize={handleCustomize}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Section 5: 🌭 Banderillas */}
          {(() => {
            const sectionItems = alaCarteAll.filter(p => p.category === 'banderillas');
            if (sectionItems.length === 0) return null;
            return (
              <section style={{ marginBottom: '2.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '1rem', padding: '0 0.5rem',
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                    fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                  }}>
                    🌭 Banderillas
                  </h2>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '0.85rem',
                }}>
                  {sectionItems.map(product => (
                    <div key={product.id}>
                      <ProductCard
                        product={product}
                        onAddToCart={addToCart}
                        onCustomize={handleCustomize}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Section 6: 🍫 Postres */}
          {(() => {
            const sectionItems = alaCarteAll.filter(p => p.category === 'postres');
            if (sectionItems.length === 0) return null;
            return (
              <section style={{ marginBottom: '2.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '1rem', padding: '0 0.5rem',
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                    fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                  }}>
                    🍫 Postres
                  </h2>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '0.85rem',
                }}>
                  {sectionItems.map(product => (
                    <div key={product.id}>
                      <ProductCard
                        product={product}
                        onAddToCart={addToCart}
                        onCustomize={handleCustomize}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Show more / less toggle */}
          {alaCarteAll.length > 8 && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <button
                onClick={() => setShowAllAlaCarte(!showAllAlaCarte)}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: showAllAlaCarte ? 'linear-gradient(135deg, #FF4500, #FF6500)' : 'none',
                  border: `1px solid ${showAllAlaCarte ? 'transparent' : 'rgba(255,69,0,0.3)'}`,
                  borderRadius: '50px',
                  color: showAllAlaCarte ? '#fff' : '#FF4500',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {showAllAlaCarte ? '↑ Ver menos' : `↓ Ver todo (${alaCarteAll.length})`}
              </button>
            </div>
          )}

          {/* Section 7: ➕ Agrega más */}
          {extras.length > 0 && (
            <section>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1rem', padding: '0 0.5rem',
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
                  fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                }}>
                  ➕ Agrega más
                </h2>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}>
                {extras.map(product => (
                  <div key={product.id}>
                    <ProductCard
                      product={product}
                      onAddToCart={addToCart}
                      onCustomize={handleCustomize}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Filtered view (when a specific tab is selected) ── */}
      {activeCategory !== 'todos' && (
        <div ref={gridRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1.5rem 4rem',
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
      )}

      {/* ── Sticky cart bar (mobile-first, always visible) ── */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '0.75rem 1rem',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          background: 'rgba(14,14,14,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,69,0,0.2)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
        }}>
          <button
            onClick={() => setCartOpen(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.9rem',
              background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,69,0,0.3)',
            }}
          >
            🛒 Ver carrito
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '6px',
              padding: '0.1rem 0.55rem',
              fontSize: '0.85rem',
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
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        total={totalPrice}
        onClearCart={handleClearCart}
        onAddExtra={handleAddExtra}
        onAddProduct={(p) => addToCart(p)}
      />

      {/* Upsell popup */}
      {showUpsell && lastAdded && (
        <UpsellPopup
          product={lastAdded}
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

      <OrderBot />
    </div>
  );
}
