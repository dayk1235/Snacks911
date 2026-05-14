'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { products as staticProducts, categories, getProductImage } from '@/data/products';
import type { Product } from '@/data/products';
import type { CartItem } from '@/types';
import type { AdminProduct, Order } from '@/lib/adminTypes';
import { track } from '@/lib/analytics';
import { AdminStore } from '@/lib/adminStore';
import { analyzeSales } from '@/lib/salesOptimizer';
import { useCartStore } from '@/lib/cartStore';
import { Button } from '@/components/ui/Button';
import { PremiumButton, AnimatedBackground } from '@/components/ui/DesignSystem';
import { cn } from '@/lib/utils/core';

import ProductCard from '@/components/common/ProductCard';
import ProductCustomizerModal from '@/components/modals/ProductCustomizerModal';
import Cart from '@/components/cart/Cart';
import UpsellModal from '@/components/modals/UpsellModal';
import CartUpsellBanner from '@/components/cart/CartUpsellBanner';

const CustomCursor = dynamic(() => import('@/components/layout/CustomCursor'), { ssr: false });

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
    const ids: string[] = [];
    if (product.category === 'proteina') {
      ids.push('5', '6');
    } else if (product.category === 'papas') {
      ids.push('1', '3');
    } else if (product.category === 'combos') {
      ids.push('6');
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
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        category: categoryFromDb(p.category),
        image: p.imageUrl || getProductImage({ id: p.id, name: p.name, category: p.category }),
        available: p.available,
        ingredients: p.ingredients || [],
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
      void o;
      setDbProducts(p);
    }).catch(() => {});
  }, []);

  // Performance-based sorting using sales data
  const performanceRank = useMemo(() => {
    if (orders.length === 0 || dbProducts.length === 0) {
      // Fallback: use popular flag
      const rank: Record<string, number> = {};
      menuProducts.forEach((p, i) => {
        rank[p.id] = p.popular ? 100 - i : 50 - i;
      });
      return rank;
    }

    const analysis = analyzeSales(orders, dbProducts);
    const rank: Record<string, number> = {};

    // Default rank for all products
    menuProducts.forEach((p) => { rank[p.id] = 50; });

    // Assign scores based on position in bestSellers/lowPerformers
    analysis.bestSellers.forEach((item, i) => {
      rank[item.productId] = 100 - i * 10;
    });

    analysis.lowPerformers.forEach((item, i) => {
      rank[item.productId] = 10 - i * 5;
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
      id: `${extra.id}_ext`,
      name: extra.name,
      description: extra.description,
      price: extra.price,
      category: 'extras' as const,
      image: extra.imageUrl || '/images/combo.webp',
      ingredients: extra.ingredients || [],
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
    <div className="min-h-screen bg-bg-deep font-body selection:bg-accent/30">
      <CustomCursor />
      <AnimatedBackground />

      {/* ── Customizer Modal ── */}
      <ProductCustomizerModal
        product={customizing}
        onClose={handleCustomizerClose}
        onConfirm={handleCustomizerConfirm}
      />

      {/* ── Sticky Header ── */}
      <header
        className="sticky top-0 z-[100] h-16 glass-dark border-b border-white/5 px-4 md:px-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-foreground-muted hover:text-accent transition-colors text-sm font-bold uppercase tracking-widest group">
            <motion.div whileHover={{ x: -4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </motion.div>
            <span className="hidden sm:inline">Inicio</span>
          </Link>
          <div className="w-px h-5 bg-white/10 hidden sm:block" />
          <div className="font-display text-2xl tracking-tight text-white">
            SNACKS <span className="text-accent">911</span>
          </div>
        </div>

        <div>
        <PremiumButton
          onClick={() => setCartOpen(true)}
          variant={totalItems > 0 ? 'primary' : 'glass'}
          className="rounded-full h-11 px-6"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🛒</span>
            {totalItems > 0 && (
              <div className="flex items-center gap-3">
                <span className="font-black">{totalItems}</span>
                <div className="w-px h-4 bg-white/20" />
                <span className="font-display text-lg">${totalPrice}</span>
              </div>
            )}
          </div>
        </PremiumButton>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 px-4 max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="hero-dot" />
          <span className="text-accent font-black uppercase tracking-[0.3em] text-[10px]">Menú Gourmet</span>
        </div>
        <h1 className="font-display text-6xl md:text-8xl text-white mb-6 leading-none">
          ¿QUÉ SE TE <br className="sm:hidden" /> <span className="fire-text">ANTOJA?</span>
        </h1>
        <p className="text-foreground-muted text-lg max-w-lg mx-auto leading-relaxed">
          Selección artesanal de snacks premium. <br />
          Personaliza tu orden y recibe directo en tu puerta.
        </p>
      </motion.section>

      {/* ── Category Tabs ── */}
      <div className="sticky top-16 z-50 py-6 glass-dark border-b border-white/5 mb-8">
        <div className="flex gap-2 justify-center px-4 overflow-x-auto no-scrollbar">
          {categories.filter(c => c.id !== 'extras').map(cat => {
            const active = activeCategory === cat.id;
            return (
              <PremiumButton
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                variant={active ? 'primary' : 'glass'}
                className={cn(
                  "rounded-full whitespace-nowrap px-6 py-2 h-auto text-xs uppercase tracking-widest font-black",
                  !active && "text-foreground-muted hover:text-white"
                )}
              >
                {cat.label}
              </PremiumButton>
            );
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-32">
        {activeCategory === 'todos' ? (
          <div className="space-y-20">
            {/* ── Combos Section (Featured) ── */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h2 className="font-display text-4xl text-white tracking-tight">🔥 COMBOS</h2>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {combos.map((p, idx) => (
                  <ProductCard key={p.id} product={p} onAddToCart={addToCart} onCustomize={handleCustomize} />
                ))}
              </div>
            </section>

            {/* ── Proteina Section ── */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h2 className="font-display text-4xl text-white tracking-tight">🍗 ALITAS & BONELESS</h2>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {alaCarteAll.filter(p => p.category === 'proteina').map((p, idx) => (
                  <ProductCard key={p.id} product={p} onAddToCart={addToCart} onCustomize={handleCustomize} />
                ))}
              </div>
            </section>

            {/* ── Papas Section ── */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h2 className="font-display text-4xl text-white tracking-tight">🍟 PAPAS</h2>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {alaCarteAll.filter(p => p.category === 'papas').map((p, idx) => (
                  <ProductCard key={p.id} product={p} onAddToCart={addToCart} onCustomize={handleCustomize} />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={addToCart} onCustomize={handleCustomize} />
            ))}
          </div>
        )}
      </main>

      {/* ── Floating Cart Bar (Mobile) ── */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 inset-x-4 z-[110] md:hidden"
          >
            <PremiumButton
              onClick={() => setCartOpen(true)}
              className="w-full h-16 rounded-2xl shadow-2xl shadow-accent/20 flex justify-between items-center px-6"
            >
              <div className="flex items-center gap-3">
                <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-black">
                  {totalItems}
                </span>
                <span className="font-bold">VER CARRITO</span>
              </div>
              <span className="font-display text-2xl">${totalPrice}</span>
            </PremiumButton>
          </motion.div>
        )}
      </AnimatePresence>

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

      {showUpsell && lastAdded && (
        <UpsellPopup
          product={lastAdded}
          onAdd={addToCart}
          onClose={() => setShowUpsell(false)}
        />
      )}

      {showProductUpsell && (
        <UpsellModal
          product={showProductUpsell}
          onUpgrade={handleUpsellUpgrade}
          onSkip={handleUpsellSkip}
        />
      )}
    </div>
  );
}
