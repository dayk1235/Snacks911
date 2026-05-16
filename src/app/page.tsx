'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Product } from '@/data/products';
import { products } from '@/data/products';
import { getProductImage } from '@/data/products';
import { track } from '@/lib/analytics';
import Image from 'next/image';
import type { AdminProduct } from '@/lib/adminTypes';
import { useCartStore } from '@/lib/cartStore';
import { Button } from '@/components/ui/Button';

// ─── Landing sections (v2.0) ──────────────────────────────────────────────────
import Hero from '@/components/sections/Hero';
import { TickerBar } from '@/components/sections/Hero';
import WhatsAppButton from '@/components/WhatsAppButton';

const Navbar              = dynamic(() => import('@/components/layout/Navbar'),              { ssr: false });
const LandingMenu         = dynamic(() => import('@/components/sections/LandingMenu'),         { ssr: false });
const SalsasSection       = dynamic(() => import('@/components/sections/SalsasSection'),       { ssr: false });
const GaleriaSection      = dynamic(() => import('@/components/sections/GaleriaSection'),      { ssr: false });
const ComoFuncionaSection = dynamic(() => import('@/components/sections/ComoFuncionaSection'), { ssr: false });
const ZonaSection         = dynamic(() => import('@/components/sections/ZonaSection'),         { ssr: false });
const TestimoniosSection  = dynamic(() => import('@/components/sections/TestimoniosSection'),  { ssr: false });
const SiteFooter          = dynamic(() => import('@/components/layout/SiteFooter'),            { ssr: false });

// ─── Legacy components (cart/bot — not rendered on landing, kept for admin compat)
const Cart               = dynamic(() => import('@/components/cart/Cart'),              { ssr: false });
const CartBar            = dynamic(() => import('@/components/cart/CartBar'),            { ssr: false });
const UpsellModal        = dynamic(() => import('@/components/modals/UpsellModal'),       { ssr: false });
const ProductCustomizerModal = dynamic(() => import('@/components/modals/ProductCustomizerModal'), { ssr: false });
const WelcomeModal       = dynamic(() => import('@/components/modals/WelcomeModal'),     { ssr: false });
const CustomCursor       = dynamic(() => import('@/components/layout/CustomCursor'),     { ssr: false });

// ─── Upsell Popup — unchanged for cart compat ────────────────────────────────
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
    <div onClick={onClose} className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6">
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
              <Button onClick={() => { onAdd(item); onClose(); }} variant="primary" className="w-10 h-10 p-0 rounded-full text-xl">+</Button>
            </div>
          ))}
        </div>
        <Button onClick={onClose} variant="ghost" className="mt-4 w-full">No, gracias</Button>
      </div>
    </div>
  );
}

import ChatBubble from '@/components/chat/ChatBubble';
import ChatDrawer from '@/components/chat/ChatDrawer';
import { useChatStore } from '@/stores/chatStore';

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { items: cartItems, totalItems, totalPrice, addToCart: storeAddToCart, updateQuantity, clearCart: handleClearCart, removeFromCart } = useCartStore();
  const { isOpen: chatOpenStore } = useChatStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [showProductUpsell, setShowProductUpsell] = useState<Product | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  const addToCart = useCallback((product: Product) => {
    track('add_to_cart', { product_name: product.name, price: product.price, category: product.category });
    let shouldShowProductUpsell = false;
    if (product.category === 'proteina' && !showProductUpsell) {
      const hasCombo = cartItems.some(i => i.category === 'combos');
      if (!hasCombo) shouldShowProductUpsell = true;
    }
    storeAddToCart(product);
    setLastAddedProduct(product);
    if (shouldShowProductUpsell) { setShowProductUpsell(product); return; }
    setShowUpsell(true);
  }, [cartItems, showProductUpsell, storeAddToCart]);

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

  const handleCustomizedAdd = useCallback((product: Product, extras: string[], _chosenExtras: unknown[]) => {
    const customizedProduct = {
      ...product,
      name: `${product.name}${extras.length > 0 ? ' (Custom)' : ''}`,
      price: product.price + (extras.length * 1.5),
      ingredients: [...(product.ingredients || []), ...extras],
    };
    addToCart(customizedProduct);
    setCustomizingProduct(null);
  }, [addToCart]);

  return (
    <main 
      className="min-h-screen w-full overflow-x-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" 
      style={{ 
        background: 'var(--color-bg)',
        marginRight: chatOpenStore ? '420px' : '0' 
      }}
    >
      <CustomCursor />

      {/* ── Navbar (with cart icon kept for compat) */}
      <Navbar cartCount={totalItems} onCartOpen={() => setCartOpen(true)} />

      {/* ── LANDING SECTIONS ───────────────────────────── */}
      <Hero />
      <LandingMenu />
      <SalsasSection />
      <GaleriaSection />
      <ComoFuncionaSection />
      <ZonaSection />
      <TestimoniosSection />
      <SiteFooter />

      {/* ── FOOTER TICKER */}
      <TickerBar />

      {/* ── CHAT SYSTEM */}
      <ChatBubble />
      <ChatDrawer />

      {/* ── FLOATING WhatsApp button */}
      <WhatsAppButton />

      {/* ── CART SYSTEM (kept operational, not shown on landing) */}
      <CartBar />
      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
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
