'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Hero, { TickerBar } from '@/components/Hero';
import Cart from '@/components/Cart';
import SiteFooter from './components/SiteFooter';
import type { Product } from '@/data/products';
import type { CartItem } from '@/types';
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

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), {
  ssr: false,
});

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
          {['🍗 Alitas', '🔥 Boneless', '🍟 Papas', '🚨 Combos'].map((cat) => (
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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

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
      <div className="gsap-panel" style={{ position: 'relative', zIndex: 11, background: '#080808', boxShadow: '0 -15px 30px rgba(0,0,0,0.8)' }}>
        <ReviewSection />
      </div>
      <div className="gsap-panel" data-pin-panel="true" style={{ position: 'relative', zIndex: 12, background: '#080808', boxShadow: '0 -15px 30px rgba(0,0,0,0.8)' }}>
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
      />

      <ChatBot />
    </main>
  );
}
