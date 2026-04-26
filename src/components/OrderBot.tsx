'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { detectIntent } from '@/lib/intents';
import { products } from '@/data/products';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Msg { id: number; text: string; sender: 'bot' | 'user'; }
interface HistoryItem { role: 'user' | 'model'; text: string; }

// ─── Intents que las reglas manejan (80%) — gratis e instantáneo ────────────
const RULE_INTENTS = new Set([
  'aceptacion', 'rechazo', 'rechazo_fuerte', 'pago_problema',
  'pedido', 'edicion', 'urgencia', 'hambre', 'gratitud', 'despedida',
  'precio', 'exploracion', 'browsing',
]);

// ─── Respuestas por reglas (80%) ────────────────────────────────────────────
function getRuleResponse(intent: string, text: string): string | null {
  const lower = text.toLowerCase();

  switch (intent) {
    case 'pedido':
    case 'aceptacion':
      return '¡Va que va! 🔥 Te recomiendo el Combo 911 ($119) — lleva Boneless, Papas y Aderezo. Es el más pedido. ¿Te lo armo?';

    case 'hambre':
      return '¡Eso se arregla rápido! 🤤 El Combo 911 ($119) es perfecto pa\' matar el antojo. Boneless + Papas + Aderezo. ¿Le entramos?';

    case 'precio':
      return 'Aquí los precios:\n\n🔥 Combo 911 — $119\n🍗 Combo Boneless — $99\n🌮 Combo Callejero — $89\n🍗 Alitas BBQ/Buffalo — $89\n🍟 Papas Loaded — $69\n🥤 Refresco — $25\n🍫 Brownie con Helado — $59\n\n¿Cuál se te antoja?';

    case 'exploracion':
    case 'browsing':
      return 'Tenemos Combos, Alitas, Boneless, Papas Loaded y Postres 🔥 Lo más pedido es el Combo 911 ($119). ¿Quieres que te cuente de alguno?';

    case 'rechazo':
      return 'Sin rollo 👊 ¿Te interesa algo más ligero? Las Papas Loaded ($69) están increíbles, o si prefieres, un Brownie con Helado ($59) pa\'l antojo dulce.';

    case 'rechazo_fuerte':
      return 'Entendido, no hay presión 🙌 Aquí estaremos cuando se te antoje algo. ¡Que te vaya chido!';

    case 'pago_problema':
      return 'Aceptamos efectivo y transferencia 💳 Si pagas con transferencia te mandamos los datos por WhatsApp al confirmar tu pedido. ¿Procedemos?';

    case 'urgencia':
      return '¡Entrega en ~30 min! ⚡ El Combo 911 sale volando. ¿Te lo mando?';

    case 'gratitud':
      return '¡A ti por elegirnos! 🔥 Si se te antoja algo más, aquí andamos.';

    case 'despedida':
      return '¡Nos vemos! 👋 Cuando se te antoje algo, aquí estaremos. ¡Snacks 911 no cierra! 🔥';

    case 'edicion':
      return 'Claro, dime qué quieres agregar o quitar y lo ajustamos 🔥';

    default:
      return null;
  }
}

// ─── AI (20%) — solo cuando las reglas no saben ─────────────────────────────
async function callAI(message: string, history: HistoryItem[]): Promise<string> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', text: h.text })),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    return data.text;
  } catch {
    // Fallback ultra-seguro si la API falla
    return 'Mmm no te entendí bien, pero te puedo ayudar con tu pedido. ¿Quieres ver el menú o armar un combo? 🔥';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function OrderBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);
  const historyRef = useRef<HistoryItem[]>([]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, thinking]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 350); }, [open]);

  // Greeting
  useEffect(() => {
    if (open && msgs.length === 0) {
      const g = '¡Qué onda! 🔥 Soy tu asistente de Snacks 911. ¿Qué se te antoja hoy?';
      setMsgs([{ id: idRef.current++, text: g, sender: 'bot' }]);
      historyRef.current = [{ role: 'model', text: g }];
    }
  }, [open, msgs.length]);

  // ── Hybrid 80/20 send ─────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const t = input.trim();
    if (!t || thinking) return;
    setInput('');

    // Show user message
    setMsgs(p => [...p, { id: idRef.current++, text: t, sender: 'user' }]);
    historyRef.current.push({ role: 'user', text: t });

    // ── 80%: Detectar intención y responder con reglas ──
    const { intent, confidence } = detectIntent(t);
    const ruleResponse = (confidence > 0.3 && RULE_INTENTS.has(intent))
      ? getRuleResponse(intent, t)
      : null;

    if (ruleResponse) {
      // Respuesta instantánea por reglas (gratis, 0 tokens)
      setThinking(true);
      await new Promise(r => setTimeout(r, 300 + Math.random() * 200)); // Delay natural
      setThinking(false);

      setMsgs(p => [...p, { id: idRef.current++, text: ruleResponse, sender: 'bot' }]);
      historyRef.current.push({ role: 'model', text: ruleResponse });
    } else {
      // ── 20%: Gemini para preguntas abiertas / conversación ──
      setThinking(true);
      const reply = await callAI(t, historyRef.current);
      setThinking(false);

      setMsgs(p => [...p, { id: idRef.current++, text: reply, sender: 'bot' }]);
      historyRef.current.push({ role: 'model', text: reply });
    }

    // Keep history manageable
    if (historyRef.current.length > 20) historyRef.current = historyRef.current.slice(-14);
  }, [input, thinking]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: open ? '5rem' : '-600px', left: '1.25rem',
        width: '360px', maxWidth: 'calc(100vw - 2.5rem)',
        height: '500px', maxHeight: 'calc(100vh - 7rem)',
        zIndex: 9998, borderRadius: '20px',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: '#111', border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        transition: 'bottom 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(255,69,0,0.08) 0%, transparent 100%)',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #FF4500, #FF7A00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0,
          }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fff' }}>Snacks 911</div>
            <div style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Asistente inteligente
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{
            background: 'none', border: 'none', color: '#555', fontSize: '1.2rem',
            cursor: 'pointer', padding: '4px', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0.85rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {msgs.map(m => (
            <div key={m.id} style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
            }}>
              <div style={{
                padding: '0.55rem 0.85rem',
                borderRadius: m.sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: m.sender === 'user'
                  ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                  : 'rgba(255,255,255,0.05)',
                border: m.sender === 'bot' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                color: m.sender === 'user' ? '#fff' : '#ccc',
                fontSize: '0.82rem', lineHeight: 1.55, whiteSpace: 'pre-line',
              }}>{m.text}</div>
            </div>
          ))}
          {thinking && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div style={{
                padding: '0.6rem 1rem', borderRadius: '14px 14px 14px 4px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', gap: '4px',
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%', background: '#FF4500',
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
          padding: '0.6rem 0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: '0.4rem',
        }}>
          <input ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Escribe tu mensaje..."
            disabled={thinking}
            style={{
              flex: 1, padding: '0.6rem 0.85rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', color: '#fff', fontSize: '0.82rem',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button onClick={send} disabled={!input.trim() || thinking} style={{
            width: '38px', height: '38px', borderRadius: '12px', border: 'none',
            background: input.trim() && !thinking
              ? 'linear-gradient(135deg, #FF4500, #FF6500)' : 'rgba(255,255,255,0.04)',
            color: input.trim() && !thinking ? '#fff' : '#444',
            fontSize: '1rem', cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>↑</button>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen(p => !p)}
        aria-label={open ? 'Cerrar chat' : 'Abrir asistente'}
        style={{
          position: 'fixed', bottom: '1.5rem', left: '1.25rem', zIndex: 9999,
          width: open ? '48px' : '56px', height: open ? '48px' : '56px',
          borderRadius: open ? '14px' : '16px',
          background: open ? '#222' : 'linear-gradient(135deg, #FF4500 0%, #FF6B00 50%, #FF8C00 100%)',
          border: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          boxShadow: open ? '0 2px 12px rgba(0,0,0,0.4)' : '0 4px 20px rgba(255,69,0,0.45), 0 8px 40px rgba(255,69,0,0.2)',
          transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="white" opacity="0.95"/>
            <circle cx="12" cy="12" r="1.2" fill="#FF4500"/>
            <circle cx="8" cy="12" r="1.2" fill="#FF4500"/>
            <circle cx="16" cy="12" r="1.2" fill="#FF4500"/>
          </svg>
        )}
      </button>

      <style>{`
        @keyframes dot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </>
  );
}
