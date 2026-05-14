'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { INITIAL_STATE, type ConversationState, type ResponseOutput } from '@/core';
import { getProductImage } from '@/data/products';
import { logEvent } from '@/core/eventLogger';
import { createUuid } from '@/lib/utils/core';
import type { BotUI } from '@/core';
import { getCustomerData, saveCustomerData, detectCustomerInfo } from '@/lib/customerMemory';
import ImpulseShelf from './ImpulseShelf';
import VitrinaModal from './VitrinaModal';
import ChatSuggestions from './ChatSuggestions';

import { trackEvent } from '@/lib/analytics';
import { type Action } from '@/core';

// ─── Instant Feedback Component ─────────────────────────────────────────────
function AddFeedbackButton({ onClick, label = "+ Agregar" }: { onClick: () => void, label?: string }) {
  const [added, setAdded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (added) return;
    setAdded(true);
    onClick();
    setTimeout(() => setAdded(false), 1000);
  };

  return (
    <motion.div
      className={`chat-product-card-add ${added ? 'added' : ''}`}
      whileHover={{ scale: 1.05, backgroundColor: added ? 'rgba(34,197,94,0.2)' : 'rgba(255,69,0,0.25)' }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      initial={false}
      animate={{ 
        scale: added ? [1, 1.1, 1] : 1,
        backgroundColor: added ? 'rgba(34,197,94,0.15)' : 'rgba(255,69,0,0.15)',
        color: added ? '#22c55e' : 'var(--accent)'
      }}
      transition={{ duration: 0.2 }}
      style={{ 
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        transition: 'all 0.3s ease'
      }}
    >
      {added ? (
        <>
          <span style={{ fontSize: '0.7rem' }}>✓</span>
          <span>Agregado 🔥</span>
        </>
      ) : (
        label
      )}
    </motion.div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface Msg {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  type?: 'text' | 'buttons' | 'products';
  actions?: Action[];
  ui?: BotUI | null;
}

type EngineType = 'modular' | 'ai';

// Product references will be derived from state

export default function OrderBot({
  inline = false,
  activeView = 'chat',
  onActiveViewChange,
  onProductsVisible,
}: {
  inline?: boolean;
  activeView?: string;
  onActiveViewChange?: (view: string) => void;
  onProductsVisible?: (visible: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = inline ? true : open;
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [state, setState] = useState<ConversationState>({
    ...INITIAL_STATE,
    messages: [],
  });
  const [engine, setEngine] = useState<EngineType>('modular');
  const [expanded, setExpanded] = useState(false);
  const [vitrinaOpen, setVitrinaOpen] = useState(false);
  const [dbProducts, setDbProducts] = useState<any[]>([]);

  // Fetch products from DB on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?all=true');
        if (!res.ok) throw new Error('DB fetch failed');
        const data = await res.json();
        const items = data.products || data.data || (Array.isArray(data) ? data : []);
        setDbProducts(items);
      } catch (err) {
        console.error('[OrderBot] Failed to load DB products:', err);
      }
    };
    fetchProducts();
  }, []);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);
  const [customer, setCustomer] = useState(getCustomerData());

  // Dynamic Placeholder
  const placeholders = [
    "Escribe tu antojo...",
    "Ej: alitas, papas, algo dulce...",
    "¿Qué se te antoja hoy? 🔥",
    "Prueba con: un combo boneless",
    "¿Con qué salsa las quieres? 🌶️"
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  const rolloutSessionIdRef = useRef(`sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const forceLegacy = process.env.NEXT_PUBLIC_ENGINE_FORCE_LEGACY === 'true';
  console.log("DEBUG switch:", { forceLegacy, env: process.env.NEXT_PUBLIC_ENGINE_FORCE_LEGACY, engine });

  const rawCart = state.cart;
  let cartItems: string[] = [];
  if (Array.isArray(rawCart)) {
    cartItems = rawCart;
  } else if (rawCart && Array.isArray((rawCart as any).items)) {
    cartItems = (rawCart as any).items.map((item: any) => 
      typeof item === 'string' ? item : item.name || ''
    );
  } else {
    cartItems = [];
  }
  const safeTotal = state?.cartTotal || 0;

  const productRefs = useMemo(() => {
    const COMBO_911 = dbProducts.find(p => p.name === '🔥 Combo 911' || p.name === 'Combo Mixto 911') || dbProducts.find(p => p.category === 'combos') || { name: 'Combo 911', price: 149 };
    const COMBO_BONELESS = dbProducts.find(p => p.name === '🍗 Combo Boneless' || p.name === 'Boneless Power 911') || dbProducts.find(p => p.category === 'combos') || { name: 'Combo Boneless', price: 179 };
    const PAPAS_LOADED = dbProducts.find(p => p.name === 'Papas Loaded' || p.name === 'Papas 911 Loaded') || dbProducts.find(p => p.category === 'extras') || { name: 'Papas Loaded', price: 49 };
    const BEBIDA = dbProducts.find(p => p.name.includes('Refresco')) || { name: 'Refresco', price: 25 };
    const POSTRE = dbProducts.find(p => p.name === 'Brownie con Helado' || p.category === 'postres') || { name: 'Postre', price: 59 };

    return {
      comboName: COMBO_911.name, comboPrice: COMBO_911.price,
      papasName: PAPAS_LOADED.name, papasPrice: PAPAS_LOADED.price,
      bebidaName: BEBIDA.name, bebidaPrice: BEBIDA.price,
      postreName: POSTRE.name, postrePrice: POSTRE.price,
      comboBonelessName: COMBO_BONELESS.name, comboBonelessPrice: COMBO_BONELESS.price,
      ahorroBoneless: (COMBO_BONELESS as any).originalPrice ? (COMBO_BONELESS as any).originalPrice - COMBO_BONELESS.price : 49,
      currentTotal: safeTotal,
      hasPapas: cartItems.some(i => typeof i === 'string' && i.includes('Papas')),
      hasBebida: cartItems.some(i => typeof i === 'string' && i.includes('Refresco')),
      hasPostre: cartItems.some(i => typeof i === 'string' && (i.includes('Brownie') || i.includes('Postre'))),
    };
  }, [cartItems, safeTotal, dbProducts]);

  // Improved scroll to bottom with multiple passes for dynamic content/images
  useEffect(() => {
    const scrollToBottom = () => {
      const el = messagesRef.current;
      if (el) {
        el.scrollTo({ 
          top: el.scrollHeight, 
          behavior: 'smooth' 
        });
      }
    };

    scrollToBottom();
    
    // Additional passes to account for animating cards and images
    const timers = [100, 300, 600, 1000].map(ms => setTimeout(scrollToBottom, ms));
    
    return () => timers.forEach(t => clearTimeout(t));
  }, [state.messages, thinking]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 350); }, [isOpen]);

  // Greeting + Session Start
  useEffect(() => {
    if (isOpen && state.messages.length === 0) {
      logEvent({
        event_type: 'session_start',
        payload_json: { engine_type: engine.toUpperCase(), customer_name: customer.name }
      });
      
      let g = '¡Qué onda! 🔥 Soy tu asistente de Snacks 911. ¿Qué se te antoja hoy?';
      
      if (customer.name) {
        const prefs = customer.preferences && customer.preferences.length > 0 
          ? ` ¿lo de siempre o quieres probar algo nuevo?`
          : ` ¿Qué se te antoja hoy?`;
        g = `¡Qué onda ${customer.name}! 🔥${prefs}`;
      }
      
      setState(prev => ({
        ...prev,
        messages: [{ id: idRef.current++, text: g, sender: 'bot' }]
      }));
    }
  }, [isOpen, state.messages.length, engine, customer.name, customer.preferences]);

  // Auto-expand when showing cards or menu
  useEffect(() => {
    const lastMsg = state.messages[state.messages.length - 1];
    const hasCards = lastMsg?.type === 'products' || (lastMsg?.ui && (lastMsg.ui.cards || lastMsg.ui.cart));
    setExpanded(!!hasCards);
  }, [state.messages]);

  // Impulse shelf data
  const shelfData = useMemo(() => {
    const lastMsg = state.messages[state.messages.length - 1];
    
    // If bot sent specific cards, use them
    if (lastMsg?.sender === 'bot' && lastMsg.ui?.cards?.length) {
      return lastMsg.ui.cards.map((c: any) => ({
        id: c.id,
        name: c.title,
        price: c.price || 0,
        image: c.imageUrl || '',
        category: c.category || '',
        label: c.label || ''
      }));
    }

    // Default impulse shelf (Popular products from DB)
    return dbProducts
      .filter(p => p.popular || p.category === 'combos')
      .slice(0, 4)
      .map(p => ({
        id: String(p.id),
        name: p.name,
        price: p.price,
        image: p.image_url || p.imageUrl || '',
        category: p.category,
        label: p.popular ? '🔥 Popular' : ''
      }));
  }, [state.messages, dbProducts]);

  const shelfVisible = shelfData.length > 0 && isOpen;

  const productsShowing = useMemo(() => {
    if (shelfVisible) return true;
    const lastMsg = state.messages[state.messages.length - 1];
    if (!lastMsg || lastMsg.sender !== 'bot') return false;
    return lastMsg.type === 'products' || (lastMsg.ui?.cards?.length ?? 0) > 0;
  }, [state.messages, shelfVisible]);

  useEffect(() => {
    onProductsVisible?.(productsShowing);
    if (productsShowing) onActiveViewChange?.('chat');
  }, [productsShowing, onProductsVisible, onActiveViewChange]);

  // Track shown actions
  useEffect(() => {
    const lastMsg = state.messages[state.messages.length - 1];
    if (lastMsg && lastMsg.sender === 'bot' && lastMsg.actions?.length) {
      lastMsg.actions.forEach(a => {
        trackEvent("ACTION_SHOWN", {
          actionId: a.id,
          actionType: a.type,
          label: a.label,
          ...(a.meta || {})
        });
      });
    }
  }, [state.messages]);

  // WhatsApp confirmation + Checkout Completed
  useEffect(() => {
    if (state.whatsappUrl && state.deliveryStep === 'done' && state.orderConfirmed) {
      logEvent({
        event_type: 'checkout_completed',
        payload_json: {
          engine_type: engine.toUpperCase(),
          cart_total: state.cartTotal,
          items_count: cartItems.length
        }
      });

      const itemsToSubmit = cartItems.map(name => {
        const cleanName = name.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
        const product = dbProducts.find(p =>
          p.name === cleanName ||
          (typeof p.name === 'string' && p.name.includes(cleanName)) ||
          (typeof p.name === 'string' && cleanName.includes(p.name))
        );
        return {
          id: product?.id ?? 0,
          name: name,
          price: product?.price ?? 0,
          quantity: 1,
        };
      });

      if (itemsToSubmit.length > 0) {
        (async () => {
          try {
            await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: createUuid(),
                status: 'pending',
                channel: 'WEB',
                total: state.cartTotal,
                createdAt: new Date().toISOString(),
                customerName: state.customerName || 'Cliente',
                customerPhone: 'web-user',
                whatsappConfirmed: false,
                items: itemsToSubmit
              }),
            });
          } catch(err) {
            console.error('[OrderBot] Error saving order:', (err as Error)?.message || err);
          }
        })();
      }
      window.open(state.whatsappUrl, '_blank');
    }
  }, [state.whatsappUrl, state.deliveryStep, state.orderConfirmed, state.cart, state.cartTotal, state.customerName, engine]);

  const processResponse = useCallback(async (text: string, action?: string) => {
    setThinking(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    console.log("ENGINE:", engine);

    const r = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, phone: 'web-user' })
    });
    
    const output: ResponseOutput = await r.json();

    setThinking(false);
    setState(prev => ({
      ...prev,
      cart: output.cart || prev.cart,
      cartTotal: output.cart?.total ?? prev.cartTotal,
      messages: [...prev.messages, {
        id: idRef.current++,
        text: output.text,
        sender: 'bot',
        type: output.type,
        actions: output.actions,
        ui: output.ui,
      }]
    }));
  }, [state, productRefs, engine]);

  const send = useCallback(async () => {
    const t = input.trim();
    if (!t || thinking) return;

    // Detect and save customer info
    const info = detectCustomerInfo(t);
    if (Object.keys(info).length > 0) {
      saveCustomerData(info);
      setCustomer(getCustomerData());
    }

    setInput('');
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { id: idRef.current++, text: t, sender: 'user' }]
    }));
    await processResponse(t);
  }, [input, thinking, processResponse]);

  const handleAction = useCallback(async (action: Action) => {
    if (thinking) return;

    const label = action.label;
    const actionValue = action.value || action.type;

    // 1. Track Click
    trackEvent("ACTION_CLICKED", {
      actionId: action.id,
      actionType: action.type,
      productId: action.payload?.productId,
      ...(action.meta || {})
    });

    // 2. Specialized Tracking
    if (action.type === 'add_to_cart') {
      trackEvent("ADD_TO_CART", {
        productId: action.payload?.productId,
        name: action.payload?.name,
        actionId: action.id
      });
    }

    if (action.type === 'upsell') {
      trackEvent("UPSELL_ACCEPTED", {
        productId: action.payload?.productId,
        actionId: action.id
      });
    }

    // 3. Checkout: show confirmation card + WhatsApp link
    if (action.type === 'checkout' && state.cart?.items?.length > 0) {
      const cartItems = state.cart.items || [];
      const total = state.cart.total || state.cartTotal || 0;
      const itemsText = cartItems.map((item: any) =>
        `• ${item.quantity || 1}x ${item.name} — $${item.price || 0}`
      ).join('\n');

      const waMessage = `🚨 *PEDIDO SNACKS 911*\n\n*Productos:*\n${itemsText}\n\n💰 *Total: $${total}*\n\n¡Quiero hacer este pedido!`;
      const waUrl = `https://wa.me/525545295568?text=${encodeURIComponent(waMessage)}`;

      setState(prev => ({
        ...prev,
        orderConfirmed: true,
        deliveryStep: 'done',
        whatsappUrl: waUrl,
        messages: [
          ...prev.messages,
          { id: idRef.current++, text: label, sender: 'user' },
          {
            id: idRef.current++,
            text: `✅ ¡Pedido listo!\n\n${itemsText}\n\n💰 Total: $${total}\n\nTe llevamos a WhatsApp para coordinar la entrega y el pago. 🛵🔥`,
            sender: 'bot',
            type: 'buttons',
            actions: [{
              id: 'wa-checkout',
              label: '📱 Pedir por WhatsApp',
              type: 'checkout',
              value: waUrl,
            }],
          },
        ],
      }));

      setTimeout(() => window.open(waUrl, '_blank'), 800);
      return;
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { id: idRef.current++, text: label, sender: 'user' }]
    }));
    
    await processResponse(action.value || label);
  }, [thinking, processResponse, state.cart, state.cartTotal]);

  return (
    <div className={inline ? 'chat-inline-wrapper' : undefined} style={inline ? { width: '100%', maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' } : undefined}>
    <>
      <div
        className={`chat-container${inline ? ' chat-inline' : ''}`}
        style={inline ? {
          position: 'relative',
          width: '100%', maxWidth: '100%',
          minHeight: '420px', height: 'auto',
          maxHeight: '70vh',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column' as const,
          fontFamily: 'var(--font-chat), sans-serif',
        } : {
          position: 'fixed', bottom: isOpen ? '5.5rem' : '-600px', left: '1.25rem',
          width: expanded ? '640px' : '540px', maxWidth: 'calc(100vw - 2.5rem)',
          height: '540px', maxHeight: 'calc(100vh - 8rem)',
          zIndex: 9998,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column' as const,
          transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), bottom 0.5s var(--easing-premium), opacity 0.4s var(--easing-premium)',
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' as const,
          fontFamily: 'var(--font-chat), sans-serif',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px rgba(255,69,0,0.06)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,69,0,0.04)',
        }}>
          <div className="chat-header-avatar">🔥</div>
          <div style={{ flex: 1 }}>
            <div className="chat-header-title">Snacks 911</div>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
              <span className="chat-header-dot online" />
              <span style={{ color: 'var(--status-success)' }}>En línea</span>
            </div>
          </div>

          {state.cartTotal > 0 && (
            <div style={{
              padding: '0.35rem 0.65rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', fontWeight: 900, fontSize: '0.82rem',
              boxShadow: '0 2px 10px rgba(34,197,94,0.3)',
              animation: 'pulseTotal 1.5s ease-in-out infinite',
            }}>
              ${state.cartTotal}
            </div>
          )}
          <button onClick={() => setOpen(false)} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem',
            cursor: 'pointer', padding: '4px', lineHeight: 1, opacity: 0.6,
          }}>×</button>
        </div>

        {/* Messages */}
        <div className="chat-messages" ref={messagesRef}>
          {state.messages.length <= 1 && (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">🍟</div>
              <div className="chat-empty-title">¿Qué se te antoja?</div>
              <div className="chat-empty-subtitle">Pide lo que quieras, yo te ayudo</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
                {[
                  { label: '🔥 Ver combos', value: 'ver combos' },
                  { label: '📋 Ver menú', value: 'ver menu' },
                ].map(chip => (
                  <button
                    key={chip.value}
                    className="chat-suggestion-chip"
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        messages: [...prev.messages, { id: idRef.current++, text: chip.label, sender: 'user' }]
                      }));
                      processResponse(chip.value);
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.messages.map((m, i) => {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
            <div key={m.id} className={`msg-row ${m.sender === 'user' ? 'msg-row-user' : 'msg-row-bot'}`}>
              {m.sender === 'bot' && (
                <div className="msg-avatar" style={{ marginBottom: '2px' }}>🔥</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={`msg-bubble ${m.sender === 'user' ? 'msg-bubble-user' : 'msg-bubble-bot'}`}>
                  {m.text}
                </div>
                <div className="msg-time" style={{ textAlign: m.sender === 'user' ? 'right' : 'left' }}>
                  {time}
                </div>

                {/* Cart summary card */}
                {m.ui?.cart && m.sender === 'bot' && state.cart?.items?.length > 0 && (
                  <div className="chat-cart-summary" style={{
                    animation: 'cardSlideIn 0.35s ease 0.2s both',
                  }}>
                    {state.cart.items.map((item: any, idx: number) => (
                      <div key={idx} className="chat-cart-item">
                        <div className="chat-cart-item-info">
                          <span className="chat-cart-item-name">
                            {item.quantity || 1}x {item.name}
                          </span>
                        </div>
                        <span className="chat-cart-item-price">${item.price || 0}</span>
                        <button
                          className="chat-cart-item-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            const action: Action = {
                              id: `remove-${item.productId || item.id}`,
                              label: `Quitar ${item.name}`,
                              type: 'dismiss',
                              value: `quita ${item.name}`,
                            };
                            handleAction(action);
                          }}
                          title="Quitar"
                        >✕</button>
                      </div>
                    ))}
                    <div className="chat-cart-total">
                      <span className="chat-cart-total-label">Total</span>
                      <span className="chat-cart-total-price">${state.cart.total || state.cartTotal}</span>
                    </div>
                  </div>
                )}

                {/* Product cards from ui */}
                {m.ui?.cards && m.sender === 'bot' && (
                  <div className="chat-cards-scroll" style={{ animation: 'cardSlideIn 0.35s ease 0.2s both' }}>
                    {m.ui.cards.map((card: any, ci: number) => (
                      <motion.div
                        key={card.id}
                        className="chat-product-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + ci * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255, 69, 0, 0.15)', borderColor: 'rgba(255, 69, 0, 0.3)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          const action: Action = {
                            id: `card-add-${card.id}`,
                            label: `Agregar ${card.title}`,
                            type: 'add_to_cart',
                            value: `agrega ${card.title}`,
                            payload: { productId: card.id, name: card.title, price: card.price },
                            price: card.price,
                            image: card.imageUrl,
                          };
                          handleAction(action);
                        }}
                      >
                        {card.imageUrl && (
                          <div className="chat-product-card-img-wrap">
                            <motion.img
                              src={card.imageUrl}
                              alt={card.title}
                              className="chat-product-card-img"
                              whileHover={{ scale: 1.08 }}
                              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                        )}
                        <div className="chat-product-card-body">
                          <div className="chat-product-card-name">{card.title}</div>
                          {card.price > 0 && (
                            <div className="chat-product-card-price">${card.price}</div>
                          )}
                          <AddFeedbackButton 
                            onClick={() => {
                              const action: Action = {
                                id: `card-add-${card.id}`,
                                label: `Agregar ${card.title}`,
                                type: 'add_to_cart',
                                value: `agrega ${card.title}`,
                                payload: { productId: card.id, name: card.title, price: card.price },
                                price: card.price,
                                image: card.imageUrl,
                              };
                              handleAction(action);
                            }} 
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Legacy product cards */}
                {m.type === 'products' && m.actions && (
                  <div className="chat-cards-scroll" style={{ animation: 'cardSlideIn 0.35s ease 0.2s both' }}>
                    {m.actions.map((a: any, ai: number) => (
                      <motion.div
                        key={a.id || a.value}
                        className="chat-product-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + ai * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255, 69, 0, 0.15)', borderColor: 'rgba(255, 69, 0, 0.3)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAction(a)}
                      >
                        {a.image && (
                          <div className="chat-product-card-img-wrap">
                            <motion.img
                              src={a.image}
                              alt={a.label}
                              className="chat-product-card-img"
                              whileHover={{ scale: 1.08 }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        )}
                        <div className="chat-product-card-body">
                          <div className="chat-product-card-name">{a.label}</div>
                          {a.price && <div className="chat-product-card-price">${a.price}</div>}
                          <AddFeedbackButton onClick={() => handleAction(a)} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {m.actions && m.actions.length > 0 && m.sender === 'bot' && m.type !== 'products' && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px',
                    justifyContent: 'flex-start',
                    animation: 'actionsFadeIn 0.3s ease 0.3s both'
                  }}>
                    {m.actions.map((a: any, ai: number) => {
                      const btnClass = a.type === 'checkout' ? 'checkout'
                        : a.type === 'dismiss' ? 'danger'
                        : a.type === 'view_cart' ? 'view'
                        : a.type === 'add_to_cart' ? 'add'
                        : a.type === 'show_category' || a.type === 'recommend' ? 'ghost'
                        : 'add';
                      return (
                        <button
                          key={a.id || a.value}
                          onClick={() => handleAction(a)}
                          className={`chat-action-btn ${btnClass}`}
                          style={{
                            animation: `btnBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + (ai * 0.08)}s both`,
                          }}
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeView === 'chat' && m.sender === 'bot' && i === state.messages.length - 1 && state.messages.length > 1 && !(m.ui?.cards?.length) && m.type !== 'products' && (
                  <ChatSuggestions
                    cartItemNames={cartItems}
                    cartTotal={safeTotal}
                    onVerTodos={() => onActiveViewChange?.('catalog')}
                    onAdd={(product) => {
                      const action: Action = {
                        id: `suggest-add-${product.id}`,
                        label: `Agregar ${product.name}`,
                        type: 'add_to_cart',
                        value: `agrega ${product.name}`,
                        payload: { productId: product.id, name: product.name, price: product.price },
                        price: product.price,
                      };
                      handleAction(action);
                    }}
                  />
                )}
              </div>
              {m.sender === 'user' && (
                <div className="msg-avatar" style={{ marginBottom: '2px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                  Tú
                </div>
              )}
            </div>
          )})}
          {thinking && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <div className="msg-avatar" style={{ marginBottom: '2px' }}>🔥</div>
              <div className="chat-thinking">
                {[0, 1, 2].map(i => (
                  <span key={i} className="chat-thinking-dot" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Content Zone — dynamic suggestions, cards, upsells */}
        {activeView === 'chat' && shelfData.length === 0 && (
        <div className={`ai-content-zone ${shelfData.length === 0 ? 'empty' : ''}`}>
          {shelfData.length > 0 ? (
            <div className="ai-content-zone-inner h-scroll">
              {shelfData.map((product, i) => (
                <motion.div
                  key={product.id}
                  className="chat-product-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255, 69, 0, 0.15)', borderColor: 'rgba(255, 69, 0, 0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const prod = dbProducts.find(p => String(p.id) === String(product.id));
                    if (prod) {
                      handleAction({
                        id: `zone-add-${product.id}`,
                        label: `Agregar ${product.name}`,
                        type: 'add_to_cart',
                        value: `agrega ${product.name}`,
                        payload: { productId: product.id, name: product.name, price: product.price },
                        price: product.price,
                      });
                    }
                  }}
                >
                  {product.image && (
                    <div className="chat-product-card-img-wrap">
                      <img src={product.image} alt={product.name} className="chat-product-card-img" />
                    </div>
                  )}
                  <div className="chat-product-card-body">
                    <div className="chat-product-card-name">{product.name}</div>
                    {product.price > 0 && (
                      <div className="chat-product-card-price">${product.price}</div>
                    )}
                    <AddFeedbackButton 
                      onClick={() => {
                        const prod = dbProducts.find(p => String(p.id) === String(product.id));
                        if (prod) {
                          handleAction({
                            id: `zone-add-${product.id}`,
                            label: `Agregar ${product.name}`,
                            type: 'add_to_cart',
                            value: `agrega ${product.name}`,
                            payload: { productId: product.id, name: product.name, price: product.price },
                            price: product.price,
                          });
                        }
                      }} 
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <span className="ai-content-zone-placeholder">Sugerencias inteligentes aquí</span>
          )}
        </div>
        )}

        {/* Suggestion chips */}
        {state.messages.length > 1 && (
          <div className="chat-suggestions">
            {(() => {
              const hasCart = state.cart?.items?.length > 0;
              if (hasCart) {
                return [
                  { label: '🛒 Ver carrito', value: 'ver carrito', action: true },
                  { label: '📦 Pedir', value: 'confirmar pedido', action: false },
                ];
              }
              return [
                { label: '🔥 Combos', value: 'ver combos', action: false },
                { label: '🍗 Boneless', value: 'quiero boneless', action: false },
              ];
            })().map(chip => (
              <button
                key={chip.value}
                className="chat-suggestion-chip"
                onClick={() => {
                  if (chip.action) {
                    handleAction({
                      id: 'chip-' + chip.value,
                      label: chip.label,
                      type: chip.value === 'ver carrito' ? 'view_cart' : 'checkout',
                      value: chip.value,
                    });
                  } else {
                    setState(prev => ({
                      ...prev,
                      messages: [...prev.messages, { id: idRef.current++, text: chip.label, sender: 'user' }]
                    }));
                    processResponse(chip.value);
                  }
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '0 1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: '0.5rem', paddingTop: '0.75rem',
        }}>
          <motion.input 
            ref={inputRef} 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={placeholders[placeholderIdx]}
            className="chat-input"
            whileFocus={{ 
              scale: 1.01,
              borderColor: 'rgba(255, 69, 0, 0.4)',
              boxShadow: '0 0 20px rgba(255, 69, 0, 0.1), 0 0 0 3px rgba(255, 69, 0, 0.05)'
            }}
            transition={{ duration: 0.2 }}
            animate={{
              borderColor: input.trim() ? 'rgba(255, 69, 0, 0.25)' : 'var(--border-subtle)',
              boxShadow: input.trim() ? '0 0 10px rgba(255, 69, 0, 0.05)' : 'none'
            }}
          />
          <Button onClick={send} disabled={!input.trim() || thinking}
            variant={input.trim() && !thinking ? 'primary' : 'secondary'}
            className="chat-send-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </Button>
        </div>
      </div>

      {/* FAB — hidden in inline mode */}
      {!inline && <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.25rem', zIndex: 9999 }}>
        <Button
          onClick={() => setOpen(p => !p)}
          aria-label={open ? 'Cerrar chat' : 'Abrir asistente'}
          variant={open ? 'secondary' : 'primary'}
          style={{
            width: open ? '48px' : '56px', height: open ? '48px' : '56px',
            borderRadius: open ? '14px' : '16px',
            padding: 0,
            background: open ? 'var(--bg-secondary)' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-gradient) 50%, var(--accent-gold) 100%)',
            boxShadow: open ? '0 2px 12px rgba(0,0,0,0.4)' : '0 4px 20px rgba(255,69,0,0.45), 0 8px 40px rgba(255,69,0,0.2)',
          }}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-7.6-4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="white" opacity="0.95" />
              <circle cx="12" cy="12" r="1.2" fill="#FF4500" />
              <circle cx="8" cy="12" r="1.2" fill="#FF4500" />
              <circle cx="16" cy="12" r="1.2" fill="#FF4500" />
            </svg>
          )}
        </Button>
        {!open && state.cart?.items?.length > 0 && (
          <span className="fab-badge">{state.cart.items.length}</span>
        )}
      </div>}

      {activeView === 'chat' && shelfData.length === 0 && (
      <ImpulseShelf
        visible={shelfVisible}
        products={shelfData}
        inline={inline}
        onAdd={(product) => {
          const prod = dbProducts.find(p => String(p.id) === String(product.id));
          if (prod) {
            handleAction({
              id: `shelf-add-${product.id}`,
              label: `Agregar ${product.name}`,
              type: 'add_to_cart',
              value: `agrega ${product.name}`,
              payload: { productId: product.id, name: product.name, price: product.price },
              price: product.price,
            });
          }
        }}
        onVerTodos={() => { setVitrinaOpen(true); onActiveViewChange?.('catalog'); }}
        chatBottom={isOpen ? 88 : 0}
      />
      )}

      <VitrinaModal
        isOpen={vitrinaOpen}
        onClose={() => setVitrinaOpen(false)}
        products={dbProducts}
        onAdd={(product) => {
          handleAction({
            id: `vitrina-add-${product.id}`,
            label: `Agregar ${product.name}`,
            type: 'add_to_cart',
            value: `agrega ${product.name}`,
            payload: { productId: product.id, name: product.name, price: product.price },
            price: product.price,
          });
        }}
      />

      <style>{`
         @keyframes pulseTotal {
           0% { transform: scale(1); }
           50% { transform: scale(1.04); }
           100% { transform: scale(1); }
         }
         @keyframes msgSlideIn {
           from { opacity: 0; transform: translateY(20px) scale(0.98); }
           to   { opacity: 1; transform: translateY(0) scale(1); }
         }
         @keyframes actionsFadeIn {
           from { opacity: 0; transform: translateY(10px); }
           to   { opacity: 1; transform: translateY(0); }
         }
         @keyframes btnBounceIn {
           0% { opacity: 0; transform: scale(0.8); }
           60% { transform: scale(1.05); }
           100% { opacity: 1; transform: scale(1); }
         }
       `}</style>
    </>
    </div>
  );
}
