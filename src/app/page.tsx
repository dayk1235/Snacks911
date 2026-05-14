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
import TopVentas from '@/components/sections/TopVentas';
import OrderStatus from '@/components/sections/OrderStatus';

const Navbar            = dynamic(() => import('@/components/layout/Navbar'),            { ssr: false });
const CombosSection     = dynamic(() => import('@/components/sections/CombosSection'),     { ssr: false });
const SiteFooter         = dynamic(() => import('@/components/layout/SiteFooter'),         { ssr: false });
const Hero               = dynamic(() => import('@/components/sections/Hero'),              { ssr: false });
const Cart               = dynamic(() => import('@/components/cart/Cart'),              { ssr: false });
const UpsellModal        = dynamic(() => import('@/components/modals/UpsellModal'),       { ssr: false });
const PromoBanner        = dynamic(() => import('@/components/common/PromoBanner'),       { ssr: false });
const RescueConfigurator = dynamic(() => import('@/components/sections/RescueConfigurator'), { ssr: false });
const DispatchOrb        = dynamic(() => import('@/components/chat/DispatchOrb'),        { ssr: false });
const CartBar            = dynamic(() => import('@/components/cart/CartBar'),            { ssr: false });
const ReviewSection      = dynamic(() => import('@/components/sections/ReviewSection'),      { ssr: false });
const ContactSection     = dynamic(() => import('@/components/sections/ContactSection'),      { ssr: false });
const MenuSection        = dynamic(() => import('@/components/sections/MenuSection'),        { ssr: false });
const ProductCustomizerModal = dynamic(() => import('@/components/modals/ProductCustomizerModal'), { ssr: false });

const ChatBot = dynamic(() => import('@/components/chat/ChatBot'), { ssr: false });
const OrderBot = dynamic(() => import('@/components/chat/OrderBot'), { ssr: false });
const LiveFeed = dynamic(() => import('@/components/sections/LiveFeed'), { ssr: false });
const UpsellGrid = dynamic(() => import('@/components/sections/UpsellGrid'), { ssr: false });
const QuickReviews = dynamic(() => import('@/components/sections/QuickReviews'), { ssr: false });
const WelcomeModal = dynamic(() => import('@/components/modals/WelcomeModal'), { ssr: false });
const CustomCursor = dynamic(() => import('@/components/layout/CustomCursor'), { ssr: false });

// ─── Upsell Popup — "¿Algo más?" after adding to cart ────────────────────────
function UpsellPopup({ product, onAdd, onClose }: { product: Product; onAdd: (product: Product) => void; onClose: () => void; }) {
  const suggestions = useMemo(() => {
    const ids: string[] = [];
    if (product.category === 'proteina') ids.push('5', '6');
    else if (product.category === 'papas') ids.push('1', '3');
    else if (product.category === 'combos') ids.push('6');
    return products.filter(p => ids.includes(p.id as string));
  }, [product]);

  if (suggestions.length === 0) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6 animate-[fadeUp_0.25s_ease]">
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[380px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl p-7 shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
        <div className="text-center mb-5">
          <h3 className="mt-2 mb-1 text-[1.15rem] font-black text-white uppercase tracking-tight">¿Algo más?</h3>
          <p className="m-0 text-[0.82rem] text-[#666] leading-relaxed">Completa tu pedido con estos favoritos</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {suggestions.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#222] relative">
                <Image src={getProductImage(item)} alt={item.name} fill className="object-cover" sizes="48px" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-[0.85rem] text-white uppercase truncate">{item.name}</div>
                <div className="text-[0.78rem] text-[var(--accent)] font-black mt-0.5">${item.price}</div>
              </div>
              <Button 
                onClick={() => { onAdd(item); onClose(); }} 
                variant="primary" 
                className="w-10 h-10 p-0 rounded-full text-xl"
              >
                +
              </Button>
            </div>
          ))}
        </div>
        <Button onClick={onClose} variant="ghost" className="mt-4 w-full">No, gracias</Button>
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default function TiendaPage() {
  const { items: cartItems, totalItems, totalPrice, addToCart: storeAddToCart, updateQuantity, clearCart: handleClearCart, removeFromCart } = useCartStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [showProductUpsell, setShowProductUpsell] = useState<Product | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<{ name: string; items: string[]; total: number } | null>(null);
  const [activeView, setActiveView] = useState('chat');

  const addToCart = useCallback((product: Product) => {
    track('add_to_cart', { product_name: product.name, price: product.price, category: product.category });
    let shouldShowProductUpsell = false;
    if (product.category === 'proteina' && !showProductUpsell) {
      const hasCombo = cartItems.some(i => i.category === 'combos');
      if (!hasCombo) shouldShowProductUpsell = true;
    }
    storeAddToCart(product);
    setLastAddedProduct(product);
    if (shouldShowProductUpsell) {
      setShowProductUpsell(product);
      return;
    }
    setShowUpsell(true);
  }, [cartItems, showProductUpsell, storeAddToCart]);

  const handleCustomizedAdd = useCallback((product: Product, extras: string[], _chosenExtras: any[]) => {
    // Create a modified product with extras
    const customizedProduct = {
      ...product,
      name: `${product.name} ${extras.length > 0 ? '(Custom)' : ''}`,
      price: product.price + (extras.length * 1.5), // Simple price logic for now
      ingredients: [...(product.ingredients || []), ...extras]
    };
    addToCart(customizedProduct);
    setCustomizingProduct(null);
  }, [addToCart]);

  const handleUpsellUpgrade = useCallback((comboProduct: Product) => {
    if (showProductUpsell) removeFromCart(showProductUpsell.id);
    storeAddToCart(comboProduct);
    setLastAddedProduct(comboProduct);
    setShowProductUpsell(null);
    setCartOpen(true);
  }, [showProductUpsell, removeFromCart, storeAddToCart]);

  const handleUpsellSkip = useCallback(() => {
    setShowProductUpsell(null);
    setShowUpsell(true);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('snacks911_last_order');
      if (saved) requestAnimationFrame(() => setLastOrder(JSON.parse(saved)));
    } catch {}
  }, []);

  const handleReorder = useCallback(() => {
    if (!lastOrder) return;
    lastOrder.items.forEach(name => {
      const match = products.find(p => p.name === name);
      if (match) addToCart(match);
    });
    setCartOpen(true);
  }, [lastOrder, addToCart]);

  const handleCartOpen = useCallback(() => setCartOpen(true), []);
  const handleCartClose = useCallback(() => setCartOpen(false), []);

  const handleAddExtra = useCallback((extra: AdminProduct) => {
    addToCart({
      id: `${extra.id}_ext`,
      name: extra.name,
      description: extra.description,
      price: extra.price,
      category: 'extras' as const,
      image: extra.imageUrl || '/images/combo.webp',
      ingredients: extra.ingredients || [],
    });
  }, [addToCart]);

  const featuredCombo = useMemo(() => products.find(p => p.id === '7') ?? products[6] ?? null, []);
  const handleOrderFeatured = useCallback(() => {
    if (!featuredCombo) return;
    addToCart(featuredCombo);
    setCartOpen(true);
  }, [featuredCombo, addToCart]);

  return (
    <main className="bg-[var(--bg-primary)] min-h-screen w-full overflow-x-hidden pt-[4.5rem]">
      <CustomCursor />
      <Navbar cartCount={totalItems} onCartOpen={handleCartOpen} minimal={activeView === 'chat'} />

      <div className="relative z-10 bg-[var(--bg-primary)]">
        <Hero featuredProduct={featuredCombo} onOrderFeatured={handleOrderFeatured}>
          <OrderBot 
            hero={true} 
            activeView={activeView} 
            onActiveViewChange={setActiveView} 
            onProductsVisible={() => {}} 
          />
        </Hero>
      </div>

      <TopVentas />
      
      <LiveFeed />
      
      <UpsellGrid />
      
      <QuickReviews />

      {lastOrder && cartItems.length === 0 && (
        <div className="relative z-11 bg-[var(--bg-primary)] px-6 py-5 border-t border-[var(--border-subtle)]">
          <div className="max-w-[600px] mx-auto flex items-center justify-between gap-4 p-5 bg-orange-500/5 border border-[var(--border-subtle)] rounded-2xl">
            <div>
              <div className="text-[0.78rem] text-[var(--accent)] font-black uppercase mb-0.5">¿Lo mismo de siempre?</div>
              <div className="text-[0.72rem] text-[#888]">{lastOrder.items.join(', ')} — ${lastOrder.total}</div>
            </div>
            <button onClick={handleReorder} className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-black text-[0.78rem] hover:scale-105 transition-all">
              Repetir →
            </button>
          </div>
        </div>
      )}

      <RescueConfigurator />
      <CombosSection onAdd={addToCart} />
      <PromoBanner />
      <MenuSection onAdd={(p) => setCustomizingProduct(p)} />
      <ContactSection />
      <SiteFooter />
      <TickerBar />

      <ChatBot />
      <CartBar />

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

      {showUpsell && lastAddedProduct && (
        <UpsellPopup product={lastAddedProduct} onAdd={addToCart} onClose={() => setShowUpsell(false)} />
      )}

      {showProductUpsell && (
        <UpsellModal product={showProductUpsell} onUpgrade={handleUpsellUpgrade} onSkip={handleUpsellSkip} />
      )}

      {customizingProduct && (
        <ProductCustomizerModal 
          product={customizingProduct} 
          onClose={() => setCustomizingProduct(null)}
          onConfirm={handleCustomizedAdd}
        />
      )}

      <WelcomeModal onClaim={() => {}} />
    </main>
  );
}
