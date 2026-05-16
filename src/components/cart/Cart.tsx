'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import gsap from 'gsap';
import { AdminStore } from '@/lib/adminStore';
import { track } from '@/lib/analytics';
import { getProductImage } from '@/data/products';
import type { CartItem } from '@/core/types';
import type { AdminProduct } from '@/lib/adminTypes';
import type { Product } from '@/data/products';
import { logEvent } from '@/core/eventLogger';
import { cartStore } from '@/lib/cartStore';
import CartUpsell from './CartUpsell';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  total: number;
  onClearCart: () => void;
  onAddExtra?: (extra: AdminProduct) => void;
  onAddProduct?: (product: Product) => void;
}

/* ── Step 1: Customer Capture Modal ──────────────────────────────────────── */
function CustomerCaptureModal({
  onContinue,
  onSkip,
}: {
  onContinue: (name: string, phone: string) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Prefill phone from previous capture — after mount only (avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snacks911_customer');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) setPhone(parsed.phone);
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.body.style.setProperty('cursor', 'auto', 'important');
    document.documentElement.setAttribute('data-cursor-restore', 'true');
    return () => {
      document.body.style.removeProperty('cursor');
      document.documentElement.removeAttribute('data-cursor-restore');
    };
  }, []);

  const handleSubmit = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;
    // Save for future prefill
    try {
      localStorage.setItem('snacks911_customer', JSON.stringify({ name, phone: cleanPhone }));
    } catch {}
    onContinue(name.trim(), cleanPhone);
  };

  return (
    <div
      data-order-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', animation: 'cartFadeIn 0.25s ease',
        cursor: 'default',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '380px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px', padding: '2rem',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
          animation: 'cartSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center', cursor: 'default',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem', lineHeight: 1 }}>🎉</div>

        <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
          ¡Gracias por tu pedido!
        </h3>
        <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: '#888', lineHeight: 1.5 }}>
          Guarda tu info para descuentos y repetir más rápido.
        </p>
        <div style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          background: 'rgba(255,69,0,0.1)',
          border: '1px solid rgba(255,69,0,0.2)',
          borderRadius: '50px',
          marginBottom: '1.5rem',
        }}>
          <span style={{ fontSize: '0.72rem', color: '#FF4500', fontWeight: 700 }}>
            🎁 10% OFF en tu próximo pedido
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', textAlign: 'left' }}>
          <input
            type="text"
            placeholder="Tu nombre (opcional)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%', padding: '0.8rem 1rem',
              borderRadius: '12px', border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,69,0,0.4)'; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
          />
          <input
            type="tel"
            placeholder="WhatsApp (55 1234 5678)"
            aria-label="WhatsApp number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus={!phone}
            style={{
              width: '100%', padding: '0.8rem 1rem',
              borderRadius: '12px', border: '1px solid var(--accent)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,69,0,0.5)'; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,69,0,0.3)'; }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
          <motion.button
            onClick={handleSubmit}
            disabled={phone.replace(/\D/g, '').length < 10}
            className="btn btn-primary w-full"
            whileHover={phone.replace(/\D/g, '').length >= 10 ? { scale: 1.03 } : undefined}
            whileTap={phone.replace(/\D/g, '').length >= 10 ? { scale: 0.96 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
          >
            Guardar y continuar →
          </motion.button>
          <Button
            onClick={onSkip}
            variant="ghost"
            size="sm"
            fullWidth
          >
            Omitir
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes cartFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes cartSlideUp { from { opacity:0; transform:translateY(20px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        [data-order-modal="true"],
        [data-order-modal="true"] * { cursor: default !important; }
        html[data-cursor-restore="true"] body *  { cursor: default !important; }
        html[data-cursor-restore="true"] .custom-cursor-el { display: none !important; }
      `}</style>
    </div>
  );
}

/* ── Step 2: Order Confirm Modal ─────────────────────────────────────────── */
function OrderConfirmModal({
  waUrl,
  onConfirm,
  onRetry,
  onCancel,
}: {
  waUrl: string;
  onConfirm: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    document.body.style.setProperty('cursor', 'auto', 'important');
    document.documentElement.setAttribute('data-cursor-restore', 'true');
    return () => {
      document.body.style.removeProperty('cursor');
      document.documentElement.removeAttribute('data-cursor-restore');
    };
  }, []);

  return (
    <div
      data-order-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'cartFadeIn 0.25s ease',
        cursor: 'default',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
          animation: 'cartSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center',
          cursor: 'default',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </div>

        <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
          ¿Se envió tu pedido?
        </h3>
        <p style={{ margin: '0 0 1.75rem', fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>
          Confirma si pudiste enviar el mensaje por WhatsApp.
          Si algo falló, puedes reintentarlo.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button
            onClick={onConfirm}
            variant="success"
            fullWidth
          >
            Si, pedido enviado — vaciar carrito
          </Button>

          <Button
            onClick={onRetry}
            variant="outline"
            fullWidth
          >
            No llego — reintentar WhatsApp
          </Button>

          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            fullWidth
          >
            Volver al carrito
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes cartFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes cartSlideUp { from { opacity:0; transform:translateY(20px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        [data-order-modal="true"],
        [data-order-modal="true"] * { cursor: default !important; }
        html[data-cursor-restore="true"] body *  { cursor: default !important; }
        html[data-cursor-restore="true"] .custom-cursor-el { display: none !important; }
      `}</style>
    </div>
  );
}

/* ── Step 3: Payment Pending Modal ─────────────────────────────────────────── */
function PaymentPendingModal({
  paymentUrl,
  customerName,
  onPaid,
  onRetry,
  onCancel,
}: {
  paymentUrl: string;
  customerName: string;
  onPaid: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    document.body.style.setProperty('cursor', 'auto', 'important');
    document.documentElement.setAttribute('data-cursor-restore', 'true');
    return () => {
      document.body.style.removeProperty('cursor');
      document.documentElement.removeAttribute('data-cursor-restore');
    };
  }, []);

  const handleOpenPayment = () => {
    window.open(paymentUrl, '_blank');
  };

  return (
    <div
      data-order-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'cartFadeIn 0.25s ease',
        cursor: 'default',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
          animation: 'cartSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center',
          cursor: 'default',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>💳</div>

        <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
          {customerName ? `¡${customerName}, tu pedido está listo!` : '¡Tu pedido está listo!'}
        </h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#888', lineHeight: 1.6 }}>
          Completa tu pago con tarjeta en la pestaña que se abrió.
          Si no se abrió, usa el botón de abajo.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button
            onClick={handleOpenPayment}
            variant="primary"
            glow
            fullWidth
          >
            💳 Ir a pagar
          </Button>

          <Button
            onClick={onPaid}
            variant="success"
            fullWidth
          >
            ✅ Ya pagué
          </Button>

          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            fullWidth
          >
            Cancelar
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes cartFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes cartSlideUp { from { opacity:0; transform:translateY(20px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        [data-order-modal="true"],
        [data-order-modal="true"] * { cursor: default !important; }
        html[data-cursor-restore="true"] body *  { cursor: default !important; }
        html[data-cursor-restore="true"] .custom-cursor-el { display: none !important; }
      `}</style>
    </div>
  );
}

/* ── Compact Extra Row (inside cart) ─────────────────────────────────────── */
function CartExtras({
  items,
  onAddExtra,
}: {
  items: CartItem[];
  onAddExtra: (extra: AdminProduct) => void;
}) {
  const [allExtras, setAllExtras] = useState<AdminProduct[]>([]);
  const [added, setAdded]         = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    AdminStore.getProducts().then(all => {
      if (!cancelled) {
        setAllExtras(all.filter(p => p.category === 'extras' && p.available));
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Filter: show extra if no restriction (empty applicableProductIds)
  // OR if at least one cart item ID matches the extra's applicable list
  const cartItemIds = items.map(i => i.id.toString());
  const extras = allExtras.filter(extra => {
    const ids = extra.applicableProductIds ?? [];
    if (ids.length === 0) return true;
    return ids.some(id => cartItemIds.includes(id));
  });

  if (extras.length === 0) return null;

  const handleAdd = (extra: AdminProduct) => {
    onAddExtra(extra);
    setAdded(prev => new Set(prev).add(extra.id));
    setTimeout(() => {
      setAdded(prev => {
        const next = new Set(prev);
        next.delete(extra.id);
        return next;
      });
    }, 1500);
  };

  return (
    <div style={{
      padding: '1rem 1.25rem',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <p style={{
        fontSize: '0.7rem', color: '#FF4500', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        margin: '0 0 0.75rem',
      }}>
        🍋 ¿Le agregas algo?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {extras.map(extra => {
          const isAdded = added.has(extra.id);
          return (
            <div
              key={extra.id}
              style={{
                display: 'flex', alignItems: 'center',
                gap: '0.75rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '12px',
                background: isAdded ? 'rgba(255,69,0,0.08)' : 'var(--bg-secondary)',
                border: isAdded ? '1px solid rgba(255,69,0,0.25)' : '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Name + price */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ccc' }}>{extra.name}</div>
                <div style={{ fontSize: '0.7rem', color: extra.price === 0 ? '#22c55e' : '#888', fontWeight: 600 }}>
                  {extra.price === 0 ? '¡Gratis!' : `+$${extra.price}`}
                </div>
              </div>

              {/* Add button */}
              <motion.button
                onClick={() => handleAdd(extra)}
                disabled={isAdded}
                className="btn btn-icon btn-sm"
                whileHover={!isAdded ? { scale: 1.12 } : undefined}
                whileTap={!isAdded ? { scale: 0.9 } : undefined}
                transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
                style={{
                  background: isAdded ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                  border: isAdded ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border-subtle)',
                  color: isAdded ? '#22c55e' : 'var(--text-primary)',
                }}
              >
                {isAdded ? '✓' : '+'}
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Cart ────────────────────────────────────────────────────────────── */
export default function Cart({ isOpen, onClose, items, onUpdateQuantity, total, onClearCart, onAddExtra, onAddProduct }: CartProps) {
  const drawerRef       = useRef<HTMLDivElement>(null);
  const backdropRef     = useRef<HTMLDivElement>(null);
  const itemsRef        = useRef<HTMLDivElement>(null);
  const prevItemsLength = useRef(0);
  const initialized     = useRef(false);

  const [whatsappNumber, setWhatsappNumber] = useState('525584507458');
  const [showCapture, setShowCapture]       = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [showPaymentPending, setShowPaymentPending] = useState(false);
  const [lastOrderId, setLastOrderId]       = useState<string>('');
  const [waUrl, setWaUrl]                   = useState('');
  const [paymentUrl, setPaymentUrl]         = useState('');
  const [customerName, setCustomerName]     = useState('');
  const [customerPhone, setCustomerPhone]   = useState('');
  const [paymentMode, setPaymentMode]       = useState<'whatsapp' | 'card' | null>(null);

  /* ── Load WhatsApp number ──────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      AdminStore.getSettings().then(s => {
        if (s?.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      AdminStore.getSettings().then(s => {
        if (s?.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
      });
    }
  }, [isOpen]);

  /* ── Drawer animation ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!drawerRef.current || !backdropRef.current) return;

    if (!initialized.current) {
      gsap.set(drawerRef.current, { xPercent: 100 });
      gsap.set(backdropRef.current, { opacity: 0, pointerEvents: 'none' });
      initialized.current = true;
      return;
    }

    if (isOpen) {
      gsap.set(backdropRef.current, { pointerEvents: 'auto' });
      gsap.to(backdropRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(drawerRef.current,   { xPercent: 0, duration: 0.5, ease: 'power4.out' });
    } else {
      gsap.to(backdropRef.current, {
        opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => { gsap.set(backdropRef.current, { pointerEvents: 'none' }); },
      });
      gsap.to(drawerRef.current, { xPercent: 100, duration: 0.4, ease: 'power3.in' });
    }
  }, [isOpen]);

  /* ── Animate new item ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (items.length > prevItemsLength.current && itemsRef.current) {
      const children = Array.from(itemsRef.current.children);
      const last = children[children.length - 1];
      if (last) gsap.from(last, { x: 40, opacity: 0, duration: 0.35, ease: 'power3.out' });
    }
    prevItemsLength.current = items.length;
  }, [items.length]);

  /* ── Build WhatsApp URL ────────────────────────────────────────────────── */
  const buildWaUrl = useCallback(() => {
    const mainItems  = items.filter(i => !i.isStandaloneExtra);
    const extraItems = items.filter(i => i.isStandaloneExtra);

    // Build product lines with their chosen extras
    const productLines = mainItems.map(i => {
      let line = `• ${i.name} x${i.quantity ?? 1} — $${i.price * (i.quantity ?? 1)}`;
      if (i.linkedExtras && i.linkedExtras.length > 0) {
        line += `\n   ↳ Con extras: ${i.linkedExtras.join(', ')}`;
      }
      return line;
    });

    // Build standalone extras block
    const extraLines = extraItems.map(i =>
      `  + ${i.name} x${i.quantity ?? 1} — $${i.price * (i.quantity ?? 1)}`
    );

    let message = `🚨 *PEDIDO SNACKS 911*\n\n`;

    if (productLines.length > 0) {
      message += `*🍗 Productos:*\n${productLines.join('\n')}\n`;
    }

    if (extraLines.length > 0) {
      message += `\n*🍋 Extras adicionales:*\n${extraLines.join('\n')}\n`;
    }

    message += `\n💰 *Total: $${total}*\n\n¡Quiero hacer este pedido!`;

    const cleanNum = (whatsappNumber || '525584507458').replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
  }, [items, total, whatsappNumber]);

  const handleWhatsApp = async () => {
    setPaymentMode('whatsapp');
    setShowCapture(true);
  };

  const handleCardPayment = async () => {
    setPaymentMode('card');
    setShowCapture(true);
  };

  const handleCustomerSubmit = async (name: string, phone: string) => {
    setCustomerName(name);
    setCustomerPhone(phone);
    setShowCapture(false);
    await submitOrder();
  };

  const handleCustomerSkip = async () => {
    setShowCapture(false);
    await submitOrder();
  };

  const submitOrder = async () => {
    track('checkout_start', { items: items.length, total, mode: paymentMode });

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, total, customerName, customerPhone, channel: 'WEB' }),
    });
    const result = await response.json();

    const orderId = result.orderId;
    setLastOrderId(orderId);
    track('order_placed', { value: total, currency: 'MXN', orderId, mode: paymentMode, customerPhone: !!customerPhone });

    if (customerPhone && customerPhone.length >= 10) {
      const topItem = items.reduce<{ name: string; qty: number }>(
        (best, i) => (i.quantity ?? 1) > best.qty ? { name: i.name, qty: i.quantity ?? 1 } : best,
        { name: '', qty: 0 }
      );
      AdminStore.trackCustomerOrder(
        customerPhone, customerName, total, new Date().toISOString(), topItem.name || ''
      ).catch(() => {});
    }

    try {
      const orderSummary = {
        name: `Pedido ${orderId?.slice(-4) || ''}`,
        items: items.map(i => i.name),
        total,
        ts: Date.now(),
      };
      localStorage.setItem('snacks911_last_order', JSON.stringify(orderSummary));
    } catch {}

    logEvent({
      event_type: 'order_created',
      cart_id: cartStore.getCartId(),
      order_id: orderId,
      customer_phone: customerPhone,
      payload_json: { total: total, item_count: items.length, payment_mode: paymentMode }
    });

    if (paymentMode === 'card') {
      await handleCardPaymentFlow(orderId);
    } else {
      const url = buildWaUrl();
      setWaUrl(url);
      await generatePaymentLinkForWhatsApp(orderId);
      window.open(url, '_blank');
      setTimeout(() => setShowConfirm(true), 1200);
    }
  };

  const generatePaymentLinkForWhatsApp = async (orderId: string) => {
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success && data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
      }
    } catch {}
  };

  const handleCardPaymentFlow = async (orderId: string) => {
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success && data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        window.open(data.paymentUrl, '_blank');
        setShowPaymentPending(true);
      } else {
        const url = buildWaUrl();
        setWaUrl(url);
        window.open(url, '_blank');
        setTimeout(() => setShowConfirm(true), 1200);
      }
    } catch {
      const url = buildWaUrl();
      setWaUrl(url);
      window.open(url, '_blank');
      setTimeout(() => setShowConfirm(true), 1200);
    }
  };

  const handleConfirm = async () => {
    if (lastOrderId) {
      await AdminStore.updateOrderWhatsAppConfirmed(lastOrderId, true).catch(() => {});
    }
    setShowConfirm(false);
    onClearCart();
    onClose();
  };

  const handleRetry = () => {
    window.open(waUrl, '_blank');
    setShowConfirm(false);
    setTimeout(() => setShowConfirm(true), 1500);
  };

  const handleCancel = () => setShowConfirm(false);

  const handlePaymentPaid = () => {
    setShowPaymentPending(false);
    onClearCart();
    onClose();
  };

  const handlePaymentRetry = () => {
    window.open(paymentUrl, '_blank');
  };

  const handlePaymentCancel = () => {
    setShowPaymentPending(false);
  };
  
  const handleClose = () => {
    if (items.length > 0) {
      logEvent({
        event_type: 'cart_abandoned',
        cart_id: cartStore.getCartId(),
        payload_json: {
          item_count: items.length,
          total: total,
          reason: 'drawer_closed'
        }
      });
    }
    onClose();
  };

  /* ── Handle extra added from cart ─────────────────────────────────────── */
  const handleAddExtra = (extra: AdminProduct) => {
    if (onAddExtra) {
      onAddExtra(extra);
    }
  };

  return (
    <>
      {/* Step 1: Customer capture */}
      {showCapture && (
        <CustomerCaptureModal
          onContinue={handleCustomerSubmit}
          onSkip={handleCustomerSkip}
        />
      )}

      {/* Step 2: Order confirm */}
      {showConfirm && (
        <OrderConfirmModal
          waUrl={waUrl}
          onConfirm={handleConfirm}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      )}

      {/* Step 3: Payment pending */}
      {showPaymentPending && (
        <PaymentPendingModal
          paymentUrl={paymentUrl}
          customerName={customerName}
          onPaid={handlePaymentPaid}
          onRetry={handlePaymentRetry}
          onCancel={handlePaymentCancel}
        />
      )}

      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(420px, 100vw)',
          background: 'var(--bg-primary)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderLeft: '1px solid var(--border-subtle)',
          zIndex: 300,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Tu Pedido</h2>
          <Button
            onClick={handleClose}
            variant="ghost"
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '12px', color: 'var(--text-primary)' }}
          >
            ✕
          </Button>
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', padding: '5rem 1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
                </svg>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                Tu carrito está vacío.<br />¡Agrega algo rico!
              </p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div ref={itemsRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
                {items.map(item => {
                  const isExtra = item.isStandaloneExtra;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', gap: '0.85rem',
                        background: isExtra
                          ? 'rgba(255,69,0,0.06)'
                          : 'var(--bg-secondary)',
                        borderRadius: '16px',
                        padding: isExtra ? '0.75rem 1rem' : '0.85rem',
                        alignItems: 'center',
                        border: isExtra
                          ? '1px solid rgba(255,69,0,0.18)'
                          : '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        overflow: 'hidden', flexShrink: 0,
                        background: '#222',
                        border: isExtra ? '1.5px solid rgba(255,69,0,0.25)' : '1px solid var(--border-subtle)',
                      }}>
                        <Image
                          src={getProductImage(item)}
                          alt={item.name}
                          width={56}
                          height={56}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          flexWrap: 'wrap',
                        }}>
                          {isExtra && (
                            <span style={{
                              fontSize: '0.6rem', fontWeight: 700,
                              letterSpacing: '0.1em', textTransform: 'uppercase',
                              color: '#FF5500', padding: '0.15rem 0.45rem',
                              background: 'rgba(255,69,0,0.12)',
                              border: '1px solid rgba(255,69,0,0.2)',
                              borderRadius: '4px',
                            }}>Extra</span>
                          )}
                          <span style={{
                            fontWeight: 700,
                            fontSize: isExtra ? '0.82rem' : '0.9rem',
                            color: isExtra ? '#bbb' : '#fff',
                            lineHeight: 1.3,
                          }}>
                            {item.name}
                          </span>
                        </div>

                        {/* Extras description tags */}
                        {!isExtra && item.linkedExtras && item.linkedExtras.length > 0 && (
                          <div style={{
                            display: 'flex', flexWrap: 'wrap',
                            gap: '0.3rem', marginTop: '0.35rem',
                          }}>
                            {item.linkedExtras.map(name => (
                              <span key={name} style={{
                                fontSize: '0.65rem', fontWeight: 600,
                                padding: '0.15rem 0.5rem',
                                background: 'rgba(255,184,0,0.08)',
                                border: '1px solid rgba(255,184,0,0.18)',
                                borderRadius: '20px', color: '#F59E0B',
                              }}>+ {name}</span>
                            ))}
                          </div>
                        )}

                        <div style={{
                          color: '#FF4500', fontWeight: 900,
                          fontSize: isExtra ? '0.88rem' : '1rem',
                          marginTop: '0.3rem',
                        }}>${item.price * (item.quantity ?? 1)}</div>
                      </div>

                      {/* Quantity controls */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: '0.35rem', flexShrink: 0, alignSelf: 'center',
                      }}>
                        <Button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          variant="secondary"
                          style={{
                            width: '26px', height: '26px', padding: 0,
                            borderRadius: '7px', fontSize: '0.9rem',
                          }}
                        >−</Button>
                        <span style={{
                          fontWeight: 700, minWidth: '16px',
                          textAlign: 'center', fontSize: '0.85rem',
                        }}>
                          {item.quantity ?? 1}
                        </span>
                        <Button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          variant="primary"
                          style={{
                            width: '26px', height: '26px', padding: 0,
                            borderRadius: '7px', fontSize: '0.9rem',
                          }}
                        >+</Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extras upsell strip */}
              <CartExtras items={items} onAddExtra={handleAddExtra} />
            </>
          )}
        </div>

        {/* Footer checkout */}
        {items.length > 0 && (
          <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Contextual upsell based on cart */}
            <CartUpsell
              cartItems={items}
              onAdd={onAddProduct ?? (() => {})}
            />

            {total >= 150 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.65rem', marginBottom: '0.65rem',
                background: 'rgba(34,197,94,0.08)', borderRadius: '8px',
                border: '1px solid rgba(34,197,94,0.2)',
              }}>
                <span style={{ fontSize: '0.7rem' }}>✅</span>
                <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 700 }}>¡Pedido mínimo alcanzado!</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ color: '#777', fontSize: '0.85rem' }}>Total</span>
              <span style={{ fontWeight: 900, color: '#FF4500', fontSize: '1.5rem' }}>${total}</span>
            </div>
            <Button
              id="checkout-whatsapp"
              onClick={handleWhatsApp}
              fullWidth
              variant="success"
              size="lg"
              glow
            >
              Pedir por WhatsApp
            </Button>
            <div style={{ marginTop: '0.75rem' }}>
              <Button
                id="checkout-card"
                onClick={handleCardPayment}
                fullWidth
                variant="primary"
                size="lg"
                glow
              >
                💳 Pagar con tarjeta
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
