'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { handleMessage, INITIAL_STATE, type ConversationState, type QuickAction } from '@/lib/responseEngine';
import type { Product } from '@/data/products';
import { products } from '@/data/products';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Msg { id: number; text: string; sender: 'bot' | 'user'; actions?: QuickAction[]; }

// ─── Product refs (single source of truth from products.ts) ────────────────
const COMBO_911 = products.find(p => p.name === '🔥 Combo 911') ?? products.find(p => p.category === 'combos')!;
const COMBO_BONELESS = products.find(p => p.name === '🍗 Combo Boneless')!;
const PAPAS_LOADED = products.find(p => p.name === 'Papas Loaded')!;
const BEBIDA = products.find(p => p.name.includes('Refresco'))!;
const POSTRE = products.find(p => p.name === 'Brownie con Helado')!;

function productRefs(cartItems: string[], cartTotal: number) {
  return {
    comboName: COMBO_911.name, comboPrice: COMBO_911.price,
    papasName: PAPAS_LOADED.name, papasPrice: PAPAS_LOADED.price,
    bebidaName: BEBIDA?.name ?? 'Refresco', bebidaPrice: BEBIDA?.price ?? 25,
    postreName: POSTRE?.name ?? 'Postre', postrePrice: POSTRE?.price ?? 59,
    comboBonelessName: COMBO_BONELESS.name, comboBonelessPrice: COMBO_BONELESS.price,
    ahorroBoneless: COMBO_BONELESS.originalPrice ? COMBO_BONELESS.originalPrice - COMBO_BONELESS.price : 49,
    currentTotal: cartTotal,
    hasPapas: cartItems.includes('Papas Loaded'),
    hasBebida: cartItems.some(i => i.includes('Refresco')),
    hasPostre: cartItems.some(i => i.includes('Brownie')),
  };
}

// ─── Component (pure UI — no business logic) ───────────────────────────────

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [state, setState] = useState<ConversationState>(INITIAL_STATE);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(1);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => { return () => { if (typingTimeout.current) clearTimeout(typingTimeout.current); }; }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  // Auto-open greeting
  useEffect(() => {
    if (!panelRef.current || !isOpen || messages.length > 0) return;
    const el = panelRef.current;
    el.style.opacity = '0'; el.style.transform = 'scale(0.95) translateY(16px)';
    el.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'scale(1) translateY(0)'; });
    setUnread(0);

    const refs = productRefs([], 0);
    const { text, actions, nextState } = handleMessage('', INITIAL_STATE, refs);
    setState(nextState);
    setMessages([{ id: idCounter.current++, text, sender: 'bot', actions }]);
  }, [isOpen]);

  // ─── Open WhatsApp if URL provided by engine ───────────────────────────
  useEffect(() => {
    if (state.whatsappUrl) {
      window.open(state.whatsappUrl, '_blank');
      // Show confirmation then reset after delay
      const confirmMsg = '🔥 **Pedido confirmado**\n\n👉 Ya estamos preparando todo **recién hecho** 🤤\n👉 Te avisamos en cuanto salga\n\nGracias por pedir en **Snacks 911** 🔥';
      setMessages(prev => [...prev, { id: idCounter.current++, text: confirmMsg, sender: 'bot' }]);
      setTimeout(() => {
        setState(INITIAL_STATE);
        setMessages([]);
        setTimeout(() => {
          const refs = productRefs([], 0);
          const { text, actions, nextState } = handleMessage('', INITIAL_STATE, refs);
          setState(nextState);
          setMessages([{ id: idCounter.current++, text, sender: 'bot', actions }]);
        }, 1000);
      }, 6000);
    }
  }, [state.whatsappUrl]);

  // ─── Handle reset signal ───────────────────────────────────────────────
  useEffect(() => {
    if (state.reset) {
      setState(INITIAL_STATE);
      setMessages([]);
      setTimeout(() => {
        const refs = productRefs([], 0);
        const { text, actions, nextState } = handleMessage('', INITIAL_STATE, refs);
        setState(nextState);
        setMessages([{ id: idCounter.current++, text, sender: 'bot', actions }]);
      }, 500);
    }
  }, [state.reset]);

  // ─── Process input → engine → render ───────────────────────────────────
  const processInput = useCallback((text: string, action?: string) => {
    const refs = productRefs(stateRef.current.cart, stateRef.current.cartTotal);
    const { text: responseText, actions: responseActions, nextState } = handleMessage(text, stateRef.current, refs, action);

    setState(nextState);

    if (text && !action) {
      setMessages(prev => [...prev, { id: idCounter.current++, text, sender: 'user' }]);
    }
    if (action) {
      setMessages(prev => [...prev.map(m => ({ ...m, actions: undefined })), { id: idCounter.current++, text: action, sender: 'user' }]);
    }

    setTyping(true);
    typingTimeout.current = setTimeout(() => {
      if (responseText) {
        setMessages(prev => [...prev, { id: idCounter.current++, text: responseText, sender: 'bot', actions: responseActions }]);
      }
      setTyping(false);
    }, 500);
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    processInput(text);
  }, [input, processInput]);

  const handleAction = useCallback((value: string) => {
    processInput(value, value);
  }, [processInput]);

  // ─── Render (pure UI) ──────────────────────────────────────────────────
  return (
    <>
      {isOpen && (
        <div ref={panelRef} style={{
          position: 'fixed', bottom: '5.5rem', left: '1.5rem', width: '360px', maxWidth: 'calc(100vw - 3rem)',
          height: '480px', maxHeight: 'calc(100vh - 8rem)', zIndex: 500, borderRadius: '20px',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: 'rgba(14,14,14,0.95)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,69,0,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(255,69,0,0.05)',
        }}>
          {/* Header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,69,0,0.06)' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF4500, #FFB800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>🚨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>Snacks 911</div>
              <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Pedido rápido
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: '#888', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ padding: '0.7rem 1rem', borderRadius: msg.sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.sender === 'user' ? 'linear-gradient(135deg, #FF4500, #FF6500)' : 'rgba(255,255,255,0.06)', border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)', color: msg.sender === 'user' ? '#fff' : '#ccc', fontSize: '0.84rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{msg.text}</div>
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {msg.actions.map(a => (
                      <button key={a.value} onClick={() => handleAction(a.value)} style={{ padding: '0.45rem 0.85rem', borderRadius: '50px', background: a.value.includes('confirm') ? 'linear-gradient(135deg, #FF4500, #FF6500)' : a.value.includes('add_') || a.value.includes('accept_') ? 'rgba(255,69,0,0.15)' : 'rgba(255,255,255,0.06)', border: a.value.includes('confirm') ? 'none' : `1px solid ${a.value.includes('add_') || a.value.includes('accept_') ? 'rgba(255,69,0,0.3)' : 'rgba(255,255,255,0.1)'}`, color: a.value.includes('confirm') ? '#fff' : a.value.includes('accept_') || a.value.includes('add_') ? '#FF7040' : '#888', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>{a.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div style={{ alignSelf: 'flex-start', padding: '0.7rem 1.2rem', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (<span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#888', animation: `typingDot 1.2s ease-in-out ${i * 0.15}s infinite` }} />))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Cart */}
          {state.cart.length > 0 && (
            <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,69,0,0.04)' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>🛒 {state.cart.length} item{state.cart.length > 1 ? 's' : ''} · ${state.cartTotal}</div>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.5rem' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={state.deliveryStep === 'name' ? 'Tu nombre...' : state.deliveryStep === 'address' ? 'Tu dirección...' : state.deliveryStep === 'reference' ? 'Referencia...' : state.deliveryStep === 'payment' ? 'Efectivo o transferencia...' : 'Escribe aquí…'}
              style={{ flex: 1, padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={handleSend} disabled={!input.trim()} style={{ padding: '0.65rem 1rem', background: input.trim() ? 'linear-gradient(135deg, #FF4500, #FF6500)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: input.trim() ? '#fff' : '#555', fontWeight: 700, fontSize: '0.9rem', cursor: input.trim() ? 'pointer' : 'default' }}>↑</button>
          </div>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.12)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        style={{ position: 'fixed', bottom: '2rem', left: '1.5rem', zIndex: 500, width: '52px', height: '52px', borderRadius: '50%', background: isOpen ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FF4500, #FF6500)', border: isOpen ? '1px solid rgba(255,255,255,0.15)' : '2px solid rgba(255,184,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', boxShadow: isOpen ? 'none' : '0 4px 24px rgba(255,69,0,0.35)' }}>
        {isOpen ? '✕' : '🔥'}
        {unread > 0 && !isOpen && (<span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#FFB800', color: '#000', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>)}
      </button>

      <style>{`@keyframes typingDot { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }`}</style>
    </>
  );
}
