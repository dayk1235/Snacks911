'use client';

import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
}

const GREETING = '¡Hola! 👋 Soy el asistente de Snacks 911. ¿En qué te puedo ayudar?';

const QUICK_REPLIES = [
  '📋 Menú',
  '⏰ Horarios',
  '🛵 Delivery',
  '💰 Precios',
  '📱 WhatsApp',
];

function getResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('horario') || lower.includes('hora') || lower.includes('abier') || lower.includes('cerr')) {
    return '⏰ Nuestros horarios son:\n\n• Lun-Mié: 1pm – 10pm\n• Jueves: 1pm – 11pm\n• Vie-Sáb: 12pm – 12am\n• Domingo: Cerrado\n\n¡Te esperamos! 🔥';
  }
  if (lower.includes('menú') || lower.includes('menu') || lower.includes('carta') || lower.includes('producto')) {
    return '🍗 Tenemos:\n\n• Alitas BBQ, Buffalo y más\n• Boneless en varias salsas\n• Papas Gajo y Loaded\n• Combos especiales\n\n¡Desliza hacia arriba para ver el menú completo! ⬆️';
  }
  if (lower.includes('precio') || lower.includes('cost') || lower.includes('cuánto') || lower.includes('cuanto')) {
    return '💰 Nuestros precios:\n\n• Alitas: desde $89\n• Boneless: desde $79\n• Papas: desde $55\n• Combos: desde $149\n\nTodos los extras se pueden agregar. ¡Revisa el menú para ver precios actualizados! 📋';
  }
  if (lower.includes('entrega') || lower.includes('delivery') || lower.includes('domicilio') || lower.includes('envío') || lower.includes('envio')) {
    return '🛵 ¡Sí, hacemos entregas a domicilio!\n\n• Tiempo aprox: ~30 min\n• También estamos en Uber Eats, Rappi y DiDi Food\n\nPide directamente por WhatsApp para mejor precio 📱';
  }
  if (lower.includes('whatsapp') || lower.includes('contacto') || lower.includes('teléfono') || lower.includes('telefono') || lower.includes('llamar')) {
    return '📱 ¡Contáctanos por WhatsApp!\n\nEs la forma más rápida de hacer tu pedido. Haz click en el botón de WhatsApp en la página para enviarnos tu pedido directamente.\n\n¡Respondemos en minutos! ⚡';
  }
  if (lower.includes('prom') || lower.includes('descuento') || lower.includes('oferta')) {
    return '🔥 ¡Pregunta por nuestras promos del día!\n\nContáctanos por WhatsApp para conocer las ofertas especiales. Los combos siempre son tu mejor opción 🚨';
  }
  if (lower.includes('salsa') || lower.includes('extra') || lower.includes('limón') || lower.includes('limon')) {
    return '🍋 ¡Sí tenemos extras!\n\n• Salsas: Valentina, Buffalo, Habanero\n• Limones (¡gratis!)\n• Cebolla curtida, Zanahorias\n• Queso extra\n\nSelecciona tus extras en la sección de acompañamientos ⬆️';
  }
  if (lower.includes('hola') || lower.includes('hey') || lower.includes('buenas') || lower.includes('qué tal')) {
    return '¡Hola! 😄 ¡Bienvenido a Snacks 911!\n\n¿Tienes antojo? Pregúntame sobre el menú, precios, horarios o delivery. ¡Estoy para ayudarte! 🍗';
  }
  if (lower.includes('gracias') || lower.includes('thanks')) {
    return '¡De nada! 😊 Si necesitas algo más, aquí estoy. ¡Buen provecho! 🔥🍗';
  }

  return '🤔 No estoy seguro de eso, pero puedo ayudarte con:\n\n• Menú y precios\n• Horarios\n• Delivery\n• Contacto por WhatsApp\n\n¿Qué te gustaría saber? 😊';
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: GREETING, sender: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);

  const chatRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(1);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Animate panel open/close
  useEffect(() => {
    if (!panelRef.current) return;
    if (isOpen) {
      gsap.fromTo(panelRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.5)' }
      );
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: idCounter.current++,
      text: text.trim(),
      sender: 'user',
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate bot typing delay
    setTimeout(() => {
      const botResponse = getResponse(text);
      const botMsg: Message = {
        id: idCounter.current++,
        text: botResponse,
        sender: 'bot',
      };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
      if (!isOpen) setUnread(prev => prev + 1);
    }, 600 + Math.random() * 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            left: '1.5rem',
            width: '360px',
            maxWidth: 'calc(100vw - 3rem)',
            height: '480px',
            maxHeight: 'calc(100vh - 8rem)',
            zIndex: 500,
            borderRadius: '20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(14,14,14,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,69,0,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(255,69,0,0.05)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(255,69,0,0.06)',
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF4500, #FFB800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', flexShrink: 0,
            }}>
              🚨
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                Snacks 911
              </div>
              <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                En línea
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', width: '32px', height: '32px',
                cursor: 'pointer', color: '#888', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888'; }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div style={{
                  padding: '0.7rem 1rem',
                  borderRadius: msg.sender === 'user'
                    ? '14px 14px 4px 14px'
                    : '14px 14px 14px 4px',
                  background: msg.sender === 'user'
                    ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                    : 'rgba(255,255,255,0.06)',
                  border: msg.sender === 'user'
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: msg.sender === 'user' ? '#fff' : '#ccc',
                  fontSize: '0.84rem',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '0.7rem 1.2rem',
                borderRadius: '14px 14px 14px 4px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#888',
                    animation: `typingDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div style={{
              padding: '0 1rem 0.5rem',
              display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
            }}>
              {QUICK_REPLIES.map(qr => (
                <button
                  key={qr}
                  onClick={() => sendMessage(qr)}
                  style={{
                    padding: '0.35rem 0.7rem', borderRadius: '20px',
                    background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.25)',
                    color: '#FF7040', fontSize: '0.72rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.1)';
                  }}
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', gap: '0.5rem',
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              style={{
                flex: 1, padding: '0.65rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', color: '#fff',
                fontSize: '0.85rem', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                padding: '0.65rem 1rem',
                background: input.trim()
                  ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                  : 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: '12px',
                color: input.trim() ? '#fff' : '#555',
                fontWeight: 700, fontSize: '0.9rem',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              ↑
            </button>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        ref={chatRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.12, duration: 0.2, ease: 'back.out(1.7)' })}
        onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: 'power2.out' })}
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '1.5rem',
          zIndex: 500,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: isOpen
            ? 'rgba(255,255,255,0.1)'
            : 'linear-gradient(135deg, #FF4500, #FF6500)',
          border: isOpen
            ? '1px solid rgba(255,255,255,0.15)'
            : '2px solid rgba(255,184,0,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          boxShadow: isOpen
            ? 'none'
            : '0 4px 24px rgba(255,69,0,0.35)',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        {isOpen ? '✕' : '💬'}

        {/* Unread badge */}
        {unread > 0 && !isOpen && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#FFB800', color: '#000',
            borderRadius: '50%', width: '20px', height: '20px',
            fontSize: '0.65rem', fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread}
          </span>
        )}
      </button>

      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}
