'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import MenuSection from '@/components/MenuSection';
import ExtrasSection from '@/components/ExtrasSection';
import ReviewSection from '@/components/ReviewSection';
import Cart from '@/components/Cart';
import CustomCursor from '@/components/CustomCursor';
import ChatBot from '@/components/ChatBot';
import { initGlobalButtonPop } from '@/lib/sound';
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

  // Always-on subtle button pop sound
  useEffect(() => {
    const cleanup = initGlobalButtonPop();
    return cleanup;
  }, []);

  return (
    <main style={{ background: '#080808', minHeight: '100vh' }}>
      <CustomCursor />
      <Navbar cartCount={totalItems} onCartOpen={() => setCartOpen(true)} />
      <Hero />
      <MenuSection onAddToCart={addToCart} />
      <ExtrasSection onAddToCart={addToCart} />
      <ReviewSection />
      <SiteFooter />

      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        total={totalPrice}
      />

      <ChatBot />
    </main>
  );
}

/* ─────────────────────────── Footer ─────────────────────────────────────── */
function SiteFooter() {
  const [whatsappNumber, setWhatsappNumber] = useState('5215551234567');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('snacks911_admin_settings');
        if (raw) {
          const s = JSON.parse(raw);
          if (s?.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
        }
      } catch { /* ignore */ }
    }
  }, []);
  const socialLinks = [
    {
      name: 'Instagram',
      href: 'https://instagram.com/snacks911',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      color: '#E1306C',
    },
    {
      name: 'Facebook',
      href: 'https://facebook.com/snacks911',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: '#1877F2',
    },
    {
      name: 'TikTok',
      href: 'https://tiktok.com/@snacks911',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      ),
      color: '#ee1d52',
    },
  ];

  const deliveryApps = [
    { name: 'Uber Eats', href: 'https://ubereats.com', emoji: '🟢', color: '#06C167', bg: 'rgba(6,193,103,0.08)' },
    { name: 'Rappi',     href: 'https://rappi.com',    emoji: '🟠', color: '#FF441A', bg: 'rgba(255,68,26,0.08)'  },
    { name: 'DiDi Food', href: 'https://didiglobal.com',emoji: '🟡',color: '#FF6E20', bg: 'rgba(255,110,32,0.08)' },
  ];

  const hours = [
    { day: 'Lun–Mié', time: '1pm – 10pm' },
    { day: 'Jue',     time: '1pm – 11pm' },
    { day: 'Vie–Sáb', time: '12pm – 12am' },
    { day: 'Dom',     time: 'Cerrado' },
  ];

  return (
    <footer id="footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#050505' }}>
      {/* Wave divider */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, #FF4500 35%, #FFB800 50%, #FF4500 65%, transparent 100%)', opacity: 0.4 }} />

      {/* Main grid */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        padding: '4rem 2rem 2.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '3rem',
      }}>

        {/* Brand column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>🚨</span>
            <div>
              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.8rem', letterSpacing: '0.06em', lineHeight: 1 }}>
                <span style={{ color: '#fff' }}>SNACKS</span>
                <span style={{ color: '#FF4500' }}> 911</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#555', lineHeight: 1.7, maxWidth: '240px' }}>
            Cuando el antojo no puede esperar. Alitas, boneless y papas que te van a romper el alma 🔥
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {socialLinks.map(s => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.name}
                style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#666', textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = `${s.color}20`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${s.color}50`;
                  (e.currentTarget as HTMLElement).style.color = s.color;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)';
                  (e.currentTarget as HTMLElement).style.color = '#666';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Horarios */}
        <div>
          <h4 style={{ fontSize: '0.72rem', color: '#FF4500', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            ⏰ Horarios
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {hours.map(h => (
              <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.855rem', color: '#555', fontWeight: 500 }}>{h.day}</span>
                <span style={{
                  fontSize: '0.855rem', fontWeight: 700,
                  color: h.time === 'Cerrado' ? '#333' : '#ccc',
                }}>{h.time}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '1.25rem', padding: '0.75rem 1rem',
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '0.75rem' }}>🟢</span>
            <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>Aceptando pedidos ahora</span>
          </div>
        </div>

        {/* Delivery Apps */}
        <div>
          <h4 style={{ fontSize: '0.72rem', color: '#FF4500', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            🛵 Pídenos en
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {deliveryApps.map(app => (
              <a
                key={app.name}
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '12px',
                  background: app.bg, border: `1px solid ${app.color}25`,
                  textDecoration: 'none', color: '#ccc',
                  fontSize: '0.9rem', fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                  (e.currentTarget as HTMLElement).style.color = '#ccc';
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{app.emoji}</span>
                <span>{app.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: app.color }}>↗</span>
              </a>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 style={{ fontSize: '0.72rem', color: '#FF4500', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            📍 Contacto
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                color: '#25D366', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>📱</span> WhatsApp
            </a>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: '#555', fontSize: '0.875rem' }}>
              <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>📍</span>
              <span style={{ lineHeight: 1.6 }}>Tu Ciudad, México<br />Entrega a domicilio</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#555', fontSize: '0.875rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🚀</span>
              <span>Entrega en ~30 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '1.25rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
        gap: '0.75rem', maxWidth: '1200px', margin: '0 auto',
      }}>
        <p style={{ color: '#333', fontSize: '0.8rem', margin: 0 }}>
          © {new Date().getFullYear()} Snacks 911. Todos los derechos reservados.
        </p>
        <p style={{ color: '#333', fontSize: '0.8rem', margin: 0 }}>
          Hecho con 🔥 para los amantes del snack
        </p>
      </div>
    </footer>
  );
}
