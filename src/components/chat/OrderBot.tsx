'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
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
  
  // Listen to external toggle event (e.g. from DispatchOrb)
  useEffect(() => {
    const handleToggle = () => setOpen(prev => !prev);
    window.addEventListener('toggle-ai', handleToggle);
    return () => window.removeEventListener('toggle-ai', handleToggle);
  }, []);

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
    <div className={inline ? 'chat-inline-wrapper' : undefined} style={inline ? { position: 'relative', width: '100%', maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' } : undefined}>
    <>
      {inline && (
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute', inset: 0, opacity: 0.55, borderRadius: '24px',
            pointerEvents: 'none',
            background: 'linear-gradient(137deg, #FF4500 0%, #FF6B35 45%, #FF8F00 100%)',
            filter: 'blur(45px)',
          }}
        />
      )}
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
          border: '1px solid transparent',
          background: 'linear-gradient(#1A1A1C, #1A1A1C) padding-box, linear-gradient(137deg, #FF4500 0%, #FF6B35 45%, #FF8F00 100%) border-box',
        } : {
          position: 'fixed', bottom: '6rem', right: '1.5rem',
          width: expanded ? '640px' : '420px', maxWidth: 'calc(100vw - 3rem)',
          height: '580px', maxHeight: 'calc(100vh - 8rem)',
          zIndex: 9998,
          borderRadius: '24px',
          overflow: 'hidden', display: 'flex', flexDirection: 'column' as const,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: isOpen ? 1 : 0, 
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
          transformOrigin: 'bottom right',
          pointerEvents: isOpen ? 'auto' : 'none' as const,
          fontFamily: 'var(--font-chat), sans-serif',
          boxShadow: '0 30px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1), 0 0 60px rgba(255,69,0,0.1)',
        }}
      >
        {/* Aurora blobs background */}
        <motion.div
          animate={{ x: [0, 40, -30, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute', width: '380px', height: '380px',
            borderRadius: '50%', filter: 'blur(90px)', opacity: 0.1,
            pointerEvents: 'none', zIndex: 0,
            background: '#FF4500',
            top: '-15%', right: '-15%',
          }}
        />
        <motion.div
          animate={{ x: [0, -35, 25, 0], y: [0, 25, -35, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute', width: '300px', height: '300px',
            borderRadius: '50%', filter: 'blur(80px)', opacity: 0.08,
            pointerEvents: 'none', zIndex: 0,
            background: '#FF8C00',
            bottom: '-10%', left: '-10%',
          }}
        />
        <motion.div
          animate={{ x: [0, 20, -25, 0], y: [0, -15, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute', width: '250px', height: '250px',
            borderRadius: '50%', filter: 'blur(70px)', opacity: 0.07,
            pointerEvents: 'none', zIndex: 0,
            background: '#FFD700',
            top: '40%', left: '50%',
          }}
        />

        {/* Header */}
        <div className="chat-header p-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-white/2 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="chat-avatar w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center text-xl text-[var(--bg)] shadow-[0_0_20px_var(--accent)]">
              🚨
            </div>
            <div>
              <div className="font-black text-[0.85rem] tracking-[2px] text-[var(--fg)] uppercase">DISPATCHER 911</div>
              <div className="text-[0.6rem] text-[var(--accent)] font-black tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                SYSTEM ACTIVE • {rolloutSessionIdRef.current.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">Status</span>
              <span className="text-[10px] text-[var(--accent)] font-bold uppercase tracking-tighter">Ready to dispatch</span>
            </div>
            <button 
              onClick={() => setOpen(false)} 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-[var(--fg)] cursor-pointer hover:bg-white/10 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages" ref={messagesRef}>
          {state.messages.length <= 1 && (
            <div className="chat-empty-state py-12 px-8 flex flex-col items-center text-center">
              <div className="chat-empty-icon w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-4xl mb-6 animate-[pulse-glow_4s_infinite]">🚨</div>
              <div className="chat-empty-title font-black text-2xl uppercase tracking-tight mb-2">Dispatcher 911</div>
              <div className="chat-empty-subtitle text-white/40 text-sm max-w-[240px] mb-8">Canal de emergencia para antojos críticos. ¿Cuál es tu situación?</div>
              
              <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
                {[
                  { label: '🔥 Ver combos', value: 'ver combos', icon: '📦' },
                  { label: '🍗 Boneless', value: 'quiero boneless', icon: '🍗' },
                  { label: '🍟 Papas', value: 'ver papas', icon: '🍟' },
                  { label: '🥤 Bebidas', value: 'ver bebidas', icon: '🥤' },
                ].map(chip => (
                  <button
                    key={chip.value}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-[0.75rem] font-bold transition-all text-left group"
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        messages: [...prev.messages, { id: idRef.current++, text: chip.label, sender: 'user' }]
                      }));
                      processResponse(chip.value);
                    }}
                  >
                    <span className="text-lg group-hover:scale-125 transition-transform">{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.messages.map((m, i) => {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={m.id} className={`msg-row-container flex flex-col gap-2 ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`message p-3.5 px-5 rounded-[20px] text-[0.95rem] max-w-[85%] relative opacity-0 translate-y-[15px] animate-[fadeInUp_0.5s_forwards] ${
                  m.sender === 'bot' ? 'ai bg-white/6 self-start rounded-bl-[4px]' : 'user bg-[var(--accent)] text-[var(--bg)] self-end font-bold rounded-br-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.3)]'
                }`}>
                  {m.text}
                </div>

                {/* Cart summary card */}
                {m.ui?.cart && m.sender === 'bot' && (state.cart?.items?.length ?? 0) > 0 && (
                  <div className="chat-cart-summary w-full max-w-[85%] bg-white/5 rounded-2xl p-4 border border-white/10 mt-2" style={{
                    animation: 'cardSlideIn 0.35s ease 0.2s both',
                  }}>
                    {state.cart?.items?.map((item: any, idx: number) => (
                      <div key={idx} className="chat-cart-item flex justify-between items-center mb-2 text-[0.85rem]">
                        <div className="chat-cart-item-info">
                          <span className="chat-cart-item-name font-bold">
                            {item.quantity || 1}x {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="chat-cart-item-price font-mono text-[var(--accent)]">${item.price || 0}</span>
                          <button
                            className="text-white/40 hover:text-red-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction({
                                id: `remove-${item.productId || item.id}`,
                                label: `Quitar ${item.name}`,
                                type: 'dismiss',
                                value: `quita ${item.name}`,
                              });
                            }}
                          >✕</button>
                        </div>
                      </div>
                    ))}
                    <div className="chat-cart-total border-t border-white/10 pt-2 mt-2 flex justify-between font-black">
                      <span>Total</span>
                      <span className="text-[var(--accent)]">${state.cart?.total || state.cartTotal}</span>
                    </div>
                  </div>
                )}

                {/* Product cards from ui */}
                {m.ui?.cards && m.sender === 'bot' && (
                  <div className="chat-cards-scroll flex gap-3 overflow-x-auto pb-4 mt-2 w-full no-scrollbar" style={{ animation: 'cardSlideIn 0.35s ease 0.2s both' }}>
                    {m.ui.cards.map((card: any, ci: number) => (
                      <motion.div
                        key={card.id}
                        className="chat-product-card glass min-w-[180px] p-3 cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + ci * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.03, rotate: 1 }}
                        onClick={() => {
                          handleAction({
                            id: `card-add-${card.id}`,
                            label: `Agregar ${card.title}`,
                            type: 'add_to_cart',
                            value: `agrega ${card.title}`,
                            payload: { productId: card.id, name: card.title, price: card.price },
                            price: card.price,
                            image: card.imageUrl,
                          });
                        }}
                      >
                        {card.imageUrl && (
                          <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                            <Image
                              src={card.imageUrl}
                              alt={card.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="text-[0.8rem] font-black mb-1 truncate">{card.title}</div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--accent)] font-mono font-bold">${card.price}</span>
                          <AddFeedbackButton label="+" onClick={() => {}} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Legacy product cards */}
                {m.type === 'products' && m.actions && (
                  <div className="chat-cards-scroll flex gap-3 overflow-x-auto pb-4 mt-2 w-full no-scrollbar" style={{ animation: 'cardSlideIn 0.35s ease 0.2s both' }}>
                    {m.actions.map((a: any, ai: number) => (
                      <motion.div
                        key={a.id || a.value}
                        className="chat-product-card glass min-w-[180px] p-3 cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + ai * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => handleAction(a)}
                      >
                        {a.image && (
                          <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                            <Image src={a.image} alt={a.label} fill className="object-cover" />
                          </div>
                        )}
                        <div className="text-[0.8rem] font-black mb-1 truncate">{a.label}</div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--accent)] font-mono font-bold">${a.price}</span>
                          <AddFeedbackButton label="+" onClick={() => {}} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {m.actions && m.actions.length > 0 && m.sender === 'bot' && m.type !== 'products' && (
                  <div className="flex flex-wrap gap-2 mt-2" style={{ animation: 'actionsFadeIn 0.3s ease 0.3s both' }}>
                    {m.actions.map((a: any, ai: number) => (
                      <button
                        key={a.id || a.value}
                        onClick={() => handleAction(a)}
                        className={`btn ${a.type === 'checkout' ? 'btn-primary' : 'btn-ghost'} !py-1.5 !px-4 !text-[0.7rem] !rounded-full`}
                        style={{
                          animation: `btnBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + (ai * 0.08)}s both`,
                        }}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeView === 'chat' && m.sender === 'bot' && i === state.messages.length - 1 && state.messages.length > 1 && !(m.ui?.cards?.length) && m.type !== 'products' && (
                  <ChatSuggestions
                    cartItemNames={cartItems}
                    cartTotal={safeTotal}
                    onVerTodos={() => onActiveViewChange?.('catalog')}
                    onAdd={(product) => {
                      handleAction({
                        id: `suggest-add-${product.id}`,
                        label: `Agregar ${product.name}`,
                        type: 'add_to_cart',
                        value: `agrega ${product.name}`,
                        payload: { productId: product.id, name: product.name, price: product.price },
                        price: product.price,
                      });
                    }}
                  />
                )}
                
                <div className="text-[0.6rem] text-white/20 mt-1 uppercase tracking-widest font-bold">
                  {m.sender === 'user' ? 'AUTORIZADO' : 'SISTEMA'} • {time}
                </div>
              </div>
            );
          })}
          {thinking && (
            <div id="typingIndicator" className="flex ml-5 gap-1.5 mb-2.5">
              <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-[pulse-glow_1s_infinite]"></span>
              <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-[pulse-glow_1s_infinite_0.2s]"></span>
              <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-[pulse-glow_1s_infinite_0.4s]"></span>
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

      {/* Expandable FAB */}
      {/* FAB removed to use DispatchOrb as the trigger */}

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
