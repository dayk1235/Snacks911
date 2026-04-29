'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/Button';
import { handleMessage, INITIAL_STATE, type ConversationState, type ResponseOutput } from '@/core';
import { products as allProducts } from '@/data/products';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Msg { id: number; text: string; sender: 'bot' | 'user'; actions?: { label: string; value: string }[]; }

// ─── Product refs for the engine ─────────────────────────────────────────────
const COMBO_911      = allProducts.find(p => p.name === '🔥 Combo 911') ?? allProducts.find(p => p.category === 'combos') ?? allProducts[0];
const COMBO_BONELESS = allProducts.find(p => p.name === '🍗 Combo Boneless') ?? allProducts.find(p => p.category === 'combos') ?? allProducts[0];
const PAPAS_LOADED   = allProducts.find(p => p.name === 'Papas Loaded') ?? allProducts.find(p => p.category === 'extras') ?? { name: 'Papas Loaded', price: 49 };
const BEBIDA         = allProducts.find(p => p.name.includes('Refresco')) ?? { name: 'Refresco', price: 25 };
const POSTRE         = allProducts.find(p => p.name === 'Brownie con Helado') ?? { name: 'Brownie con Helado', price: 59 };

export default function OrderBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [state, setState] = useState<ConversationState>(INITIAL_STATE);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);

  const productRefs = useMemo(() => ({
    comboName: COMBO_911?.name ?? 'Combo 911', comboPrice: COMBO_911?.price ?? 149,
    papasName: PAPAS_LOADED?.name ?? 'Papas Loaded', papasPrice: PAPAS_LOADED?.price ?? 49,
    bebidaName: BEBIDA?.name ?? 'Refresco', bebidaPrice: BEBIDA?.price ?? 25,
    postreName: POSTRE?.name ?? 'Postre', postrePrice: POSTRE?.price ?? 59,
    comboBonelessName: COMBO_BONELESS?.name ?? 'Combo Boneless', comboBonelessPrice: COMBO_BONELESS?.price ?? 179,
    ahorroBoneless: COMBO_BONELESS.originalPrice ? COMBO_BONELESS.originalPrice - COMBO_BONELESS.price : 49,
    currentTotal: state.cartTotal,
    hasPapas: state.cart.includes('Papas Loaded'),
    hasBebida: state.cart.some(i => i.includes('Refresco')),
    hasPostre: state.cart.some(i => i.includes('Brownie')),
  }), [state.cart, state.cartTotal]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, thinking]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 350); }, [open]);

  // Greeting
  useEffect(() => {
    if (open && msgs.length === 0) {
      const g = '¡Qué onda! 🔥 Soy tu asistente de Snacks 911. ¿Qué se te antoja hoy?';
      setMsgs([{ id: idRef.current++, text: g, sender: 'bot' }]);
    }
  }, [open, msgs.length]);

  // WhatsApp confirmation
  useEffect(() => {
    if (state.whatsappUrl && state.deliveryStep === 'done') {
      window.open(state.whatsappUrl, '_blank');
    }
  }, [state.whatsappUrl, state.deliveryStep]);

  const processResponse = useCallback(async (text: string, action?: string) => {
    setThinking(true);
    
    // Artificial delay for realism
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    
    const output: ResponseOutput = handleMessage(text, state, productRefs, action);
    
    setThinking(false);
    setMsgs(p => [...p, { 
      id: idRef.current++, 
      text: output.text, 
      sender: 'bot', 
      actions: output.actions 
    }]);
    setState(output.nextState);
  }, [state, productRefs]);

  const send = useCallback(async () => {
    const t = input.trim();
    if (!t || thinking) return;
    setInput('');

    setMsgs(p => [...p, { id: idRef.current++, text: t, sender: 'user' }]);
    await processResponse(t);
  }, [input, thinking, processResponse]);

  const handleAction = useCallback(async (actionValue: string, label: string) => {
    if (thinking) return;
    setMsgs(p => [...p, { id: idRef.current++, text: label, sender: 'user' }]);
    await processResponse('', actionValue);
  }, [thinking, processResponse]);

  return (
    <>
      {/* Panel */}
      <div
        className="card-premium"
        style={{
          position: 'fixed', bottom: open ? '5.5rem' : '-600px', left: '1.25rem',
          width: '380px', maxWidth: 'calc(100vw - 2.5rem)',
          height: '520px', maxHeight: 'calc(100vh - 8rem)',
          zIndex: 9998,
          borderRadius: '16px',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transition: 'bottom 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          fontFamily: 'var(--font-inter), sans-serif',
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
             <div style={{ fontSize: '0.68rem', color: 'var(--status-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
               <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-success)', display: 'inline-block' }} />
               En línea
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
              <span style={{ opacity: state.cart.includes(state.comboName ?? 'Combo 911') ? 1 : 0.4 }}>Combo</span>
              <span style={{ opacity: state.hasPapas ? 1 : 0.4 }}>Papas</span>
              <span style={{ opacity: state.hasBebida ? 1 : 0.4 }}>Bebida</span>
              <span style={{ opacity: state.hasPostre ? 1 : 0.4 }}>Postre</span>
            </div>
            <div style={{
              height: '4px', borderRadius: '2px',
              background: 'rgba(255,255,255,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(([state.comboSelected, state.hasPapas, state.hasBebida, state.hasPostre].filter(Boolean).length / 4) * 100)}%`,
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
          {msgs.map((m, i) => (
            <div key={m.id} style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              animation: `msgSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${(i * 0.06)}s both`,
              transformOrigin: m.sender === 'user' ? 'bottom right' : 'bottom left',
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.sender === 'user'
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-gradient))'
                  : 'var(--bg-secondary)',
                border: m.sender === 'bot' ? '1px solid var(--border-subtle)' : 'none',
                color: m.sender === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.88rem', lineHeight: 1.55, whiteSpace: 'pre-line',
                boxShadow: m.sender === 'user' ? '0 3px 12px rgba(255,69,0,0.2)' : 'none',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >{m.text}</div>
              
              {m.actions && m.actions.length > 0 && m.sender === 'bot' && (
                <div style={{ 
                  display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px',
                  animation: 'actionsFadeIn 0.3s ease 0.3s both'
                }}>
                  {m.actions.map((a, ai) => (
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
                        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                        animation: `btnBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + (ai * 0.08)}s both`,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--accent)';
                        (e.currentTarget as HTMLElement).style.color = '#fff';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.03)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(255,69,0,0.3)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.1)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
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
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-7.6-4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="white" opacity="0.95"/>
            <circle cx="12" cy="12" r="1.2" fill="#FF4500"/>
            <circle cx="8" cy="12" r="1.2" fill="#FF4500"/>
            <circle cx="16" cy="12" r="1.2" fill="#FF4500"/>
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
           from { opacity: 0; transform: translateY(14px) scale(0.95); }
           to   { opacity: 1; transform: translateY(0) scale(1); }
         }

         @keyframes actionsFadeIn {
           from { opacity: 0; transform: translateY(6px); }
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
