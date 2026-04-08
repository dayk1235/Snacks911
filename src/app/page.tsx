'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import MenuSection from '@/components/MenuSection';
import Cart from '@/components/Cart';
import CustomCursor from '@/components/CustomCursor';
import type { Product } from '@/data/products';
import type { CartItem } from '@/types';

export default function Page() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };



  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main style={{ background: '#080808', minHeight: '100vh' }}>
      {/* Global experience layer */}
      <CustomCursor />

      <Navbar cartCount={totalItems} onCartOpen={() => setCartOpen(true)} />
      <Hero />
      <MenuSection onAddToCart={addToCart} />

      {/* Footer */}
      <footer
        id="footer"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ marginBottom: '0.6rem', fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.06em' }}>
          <span style={{ color: '#fff' }}>SNACKS</span>
          <span style={{ color: '#FF4500' }}> 911</span>
        </div>
        <p style={{ fontWeight: 400 }}>🚨 Cuando el antojo no puede esperar · Entrega en 30 min</p>
      </footer>

      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        total={totalPrice}
      />
    </main>
  );
}
