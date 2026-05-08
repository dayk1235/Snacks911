'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/Button';
import { handleMessageModular, INITIAL_STATE, type ConversationState, type ResponseOutput } from '@/core';
import { products as allProducts } from '@/data/products';
import { logEvent } from '@/core/eventLogger';
import { createUuid } from '@/lib/uuid';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Msg {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  type?: 'text' | 'buttons' | 'products';
  actions?: { label: string; value: string; image?: string; price?: number; }[];
}

type EngineType = 'modular' | 'ai';

// ─── Product refs for the engine ─────────────────────────────────────────────
const COMBO_911 = allProducts.find(p => p.name === '🔥 Combo 911') ?? allProducts.find(p => p.category === 'combos') ?? allProducts[0];
const COMBO_BONELESS = allProducts.find(p => p.name === '🍗 Combo Boneless') ?? allProducts.find(p => p.category === 'combos') ?? allProducts[0];
const PAPAS_LOADED = allProducts.find(p => p.name === 'Papas Loaded') ?? allProducts.find(p => p.category === 'extras') ?? { name: 'Papas Loaded', price: 49 };
const BEBIDA = allProducts.find(p => p.name.includes('Refresco')) ?? { name: 'Refresco', price: 25 };
const POSTRE = allProducts.find(p => p.name === 'Brownie con Helado') ?? { name: 'Brownie con Helado', price: 59 };

export default function OrderBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [state, setState] = useState<ConversationState>({
    ...INITIAL_STATE,
    cart: [],
    cartTotal: 0,
    messages: [],
  });
  const [engine, setEngine] = useState<EngineType>('modular');

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);
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

  const productRefs = useMemo(() => ({
    comboName: COMBO_911?.name ?? 'Combo 911', comboPrice: COMBO_911?.price ?? 149,
    papasName: PAPAS_LOADED?.name ?? 'Papas Loaded', papasPrice: PAPAS_LOADED?.price ?? 49,
    bebidaName: BEBIDA?.name ?? 'Refresco', bebidaPrice: BEBIDA?.price ?? 25,
    postreName: POSTRE?.name ?? 'Postre', postrePrice: POSTRE?.price ?? 59,
    comboBonelessName: COMBO_BONELESS?.name ?? 'Combo Boneless', comboBonelessPrice: COMBO_BONELESS?.price ?? 179,
    ahorroBoneless: COMBO_BONELESS.originalPrice ? COMBO_BONELESS.originalPrice - COMBO_BONELESS.price : 49,
    currentTotal: safeTotal,
    hasPapas: cartItems.some(i => typeof i === 'string' && i.includes('Papas Loaded')),
    hasBebida: cartItems.some(i => typeof i === 'string' && i.includes('Refresco')),
    hasPostre: cartItems.some(i => typeof i === 'string' && i.includes('Brownie')),
  }), [cartItems, safeTotal]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [state.messages, thinking]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 350); }, [open]);

  // Greeting + Session Start
  useEffect(() => {
    if (open && state.messages.length === 0) {
      logEvent({
        event_type: 'session_start',
        payload_json: { engine_type: engine.toUpperCase() }
      });
      const g = '¡Qué onda! 🔥 Soy tu asistente de Snacks 911. ¿Qué se te antoja hoy?';
      setState(prev => ({
        ...prev,
        messages: [{ id: idRef.current++, text: g, sender: 'bot' }]
      }));
    }
  }, [open, state.messages.length, engine]);

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
        const product = allProducts.find(p =>
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
          console.error('[OrderBot] Error saving order:', err?.message || err);
        }
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
      ...output.nextState,
      messages: [...prev.messages, {
        id: idRef.current++,
        text: output.text,
        sender: 'bot',
        type: output.type,
        actions: output.actions
      }]
    }));
  }, [state, productRefs, engine]);

  const send = useCallback(async () => {
    const t = input.trim();
    if (!t || thinking) return;
    setInput('');
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { id: idRef.current++, text: t, sender: 'user' }]
    }));
    await processResponse(t);
  }, [input, thinking, processResponse]);

  const handleAction = useCallback(async (actionValue: string, label: string) => {
    if (thinking) return;
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { id: idRef.current++, text: label, sender: 'user' }]
    }));
    await processResponse('', actionValue);
  }, [thinking, processResponse]);

  return (
    <>
      <div
        className="card-premium"
        style={{
          position: 'fixed', bottom: open ? '5.5rem' : '-600px', left: '1.25rem',
          width: '380px', maxWidth: 'calc(100vw - 2.5rem)',
          height: '520px', maxHeight: 'calc(100vh - 8rem)',
          zIndex: 9998,
          borderRadius: 'var(--radius)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transition: 'bottom 0.5s var(--easing-premium), opacity 0.4s var(--easing-premium)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          fontFamily: 'var(--font-body), sans-serif',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,69,0,0.06)',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-gradient))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0,
          }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Snacks 911</div>
            <div style={{ fontSize: '0.68rem', color: engine === 'ai' || engine === 'modular' ? 'var(--status-success)' : 'var(--accent-gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: engine === 'ai' || engine === 'modular' ? 'var(--status-success)' : 'var(--accent-gold)', display: 'inline-block', boxShadow: engine === 'ai' || engine === 'modular' ? '0 0 8px var(--status-success)' : 'none' }} />
              {engine.toUpperCase() + " ENGINE"}
            </div>
          </div>


          {/* 🟢 TOTAL EN VIVO */}
          {state.cartTotal > 0 && (
            <div style={{
              padding: '0.4rem 0.75rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', fontWeight: 900, fontSize: '0.85rem',
              boxShadow: '0 2px 10px rgba(34,197,94,0.3)',
              animation: 'pulseTotal 1.5s ease-in-out infinite',
            }}>
              ${state.cartTotal}
            </div>
          )}
          <button onClick={() => setOpen(false)} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem',
            cursor: 'pointer', padding: '4px', lineHeight: 1,
          }}>×</button>
        </div>

        {/* PROGRESS BAR */}
        {state.comboSelected && (
          <div style={{
            padding: '0.75rem 1rem 0.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '0.65rem', color: '#555', marginBottom: '0.5rem',
            }}>
              <span style={{ opacity: cartItems.some(i => typeof i === 'string' && i.includes(productRefs.comboName ?? 'Combo 911')) ? 1 : 0.4 }}>Combo</span>
              <span style={{ opacity: productRefs.hasPapas ? 1 : 0.4 }}>Papas</span>
              <span style={{ opacity: productRefs.hasBebida ? 1 : 0.4 }}>Bebida</span>
              <span style={{ opacity: productRefs.hasPostre ? 1 : 0.4 }}>Postre</span>
            </div>
            <div style={{
              height: '4px', borderRadius: '2px',
              background: 'rgba(255,255,255,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(([state.comboSelected, productRefs.hasPapas, productRefs.hasBebida, productRefs.hasPostre].filter(Boolean).length / 4) * 100)}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-gold))',
                borderRadius: '2px',
                transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
          {state.messages.map((m, i) => (
            <div key={m.id} style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              animation: `msgSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${(i * 0.06)}s both`,
              transformOrigin: m.sender === 'user' ? 'bottom right' : 'bottom left',
            }}>
              <div style={{
                borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.sender === 'user'
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-gradient))'
                  : 'var(--bg-secondary)',
                border: m.sender === 'bot' ? '1px solid var(--border-subtle)' : 'none',
                color: 'var(--text-primary)',
                fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-line',
                boxShadow: m.sender === 'user' ? '0 4px 15px var(--accent-glow)' : 'none',
              }}>{m.text}</div>

              {/* STEP 6: Render Product Cards if type is products */}
              {m.type === 'products' && m.actions && (
                <div style={{
                  display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 0',
                  msOverflowStyle: 'none', scrollbarWidth: 'none',
                  animation: 'actionsFadeIn 0.3s ease 0.3s both'
                }}>
                  {m.actions.map((a: any) => (
                    <div
                      key={a.value}
                      onClick={() => handleAction(a.value, a.label)}
                      style={{
                        minWidth: '160px', background: 'var(--bg-card)',
                        borderRadius: '12px', border: '1px solid var(--border-subtle)',
                        overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s var(--easing-premium)',
                      }}
                      className="hover:scale-105 hover:border-accent"
                    >
                      {a.image && <img src={a.image} alt={a.label} style={{ width: '100%', height: '90px', objectFit: 'cover', opacity: 0.9 }} />}
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{a.label}</div>
                        {a.price && <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 800, marginTop: '2px' }}>${a.price}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {m.actions && m.actions.length > 0 && m.sender === 'bot' && m.type !== 'products' && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px',
                  justifyContent: 'center',
                  animation: 'actionsFadeIn 0.3s ease 0.3s both'
                }}>
                  {m.actions.map((a: any, ai: number) => (
                    <button
                      key={a.value}
                      onClick={() => handleAction(a.value, a.label)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255,69,0,0.1)',
                        border: '1px solid rgba(255,69,0,0.2)',
                        color: 'var(--accent)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        animation: `btnBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + (ai * 0.08)}s both`,
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div style={{
                padding: '0.6rem 1rem', borderRadius: '14px 14px 14px 4px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                display: 'flex', gap: '4px',
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)',
                    animation: `dot 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', gap: '0.5rem',
        }}>
          <input ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Escribe tu mensaje..."
            style={{
              flex: 1, padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.88rem',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <Button onClick={send} disabled={!input.trim() || thinking} variant={input.trim() && !thinking ? 'primary' : 'secondary'} style={{
            width: '38px', height: '38px', padding: 0, borderRadius: '12px', flexShrink: 0,
          }}>↑</Button>
        </div>
      </div>

      {/* FAB */}
      <Button
        onClick={() => setOpen(p => !p)}
        aria-label={open ? 'Cerrar chat' : 'Abrir asistente'}
        variant={open ? 'secondary' : 'primary'}
        style={{
          position: 'fixed', bottom: '1.5rem', left: '1.25rem', zIndex: 9999,
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

      <style>{`
         @keyframes dot {
           0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
           40% { transform: scale(1.2); opacity: 1; }
         }
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
  );
}
