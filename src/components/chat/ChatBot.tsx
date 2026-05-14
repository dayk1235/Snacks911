'use client';

/**
 * src/components/chat/ChatBot.tsx — Conversational Sales Assistant.
 * 
 * Redesigned with Product Cards for higher conversion.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { INITIAL_STATE, type ConversationState } from '@/core';
import { products, getProductImage, type Product } from '@/data/products';
import { useCartStore } from '@/lib/cartStore';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Msg { 
  id: number; 
  text: string; 
  sender: 'bot' | 'user' | 'system'; 
  product?: Product;
}

// ─── Sub-Component: Product Card Message ─────────────────────────────────────
function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  return (
    <div style={{
      marginTop: '0.75rem',
      background: '#111',
      borderRadius: '18px',
      overflow: 'hidden',
      border: '1px solid #222',
      width: '100%',
      maxWidth: '240px',
    }}>
      <div style={{ position: 'relative', height: '140px', background: '#000' }}>
        <Image 
          src={getProductImage(product)} 
          alt={product.name} 
          fill 
          style={{ objectFit: 'cover' }}
          sizes="240px"
        />
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: '0.25rem' }}>
          {product.name}
        </div>
        <div style={{ color: '#FF4500', fontWeight: 900, fontSize: '1.2rem' }}>
          ${product.price}
        </div>
        <button 
          onClick={() => onAdd(product)}
          style={{
            width: '100%', marginTop: '0.8rem', padding: '0.7rem',
            background: '#FF4500', color: '#fff', border: 'none',
            borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          AGREGAR +
        </button>
      </div>
    </div>
  );
}

export default function ChatBot() {
  const [isOpen, setIsOpen]   = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  
  const { addToCart } = useCartStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter      = useRef(1);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const handleSend = useCallback(async (customText?: string) => {
    const text = (customText || input).trim();
    if (!text || typing) return;
    if (!customText) setInput('');
    
    setMessages(prev => [...prev, { id: idCounter.current++, text, sender: 'user' }]);
    setTyping(true);

    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, phone: 'web-user' })
      });
      const output = await r.json();
      
      const recommendedProduct = products.find(p => 
        typeof output.text === 'string' && typeof p.name === 'string' && output.text.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
      );

      setMessages(prev => [
        ...prev, 
        { 
          id: idCounter.current++, 
          text: output.text, 
          sender: 'bot',
          product: recommendedProduct
        }
      ]);
    } catch (error) {
      setMessages(prev => [...prev, { id: idCounter.current++, text: "🚨 Error de conexión con la central.", sender: 'bot' }]);
    } finally {
      setTyping(false);
    }
  }, [input, typing]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[6rem] right-6 w-[380px] max-w-[calc(100vw-3rem)] h-[580px] max-h-[calc(100vh-8rem)] z-[9999] rounded-[24px] flex flex-col bg-[#050505] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden origin-bottom-right"
          >
            {/* Command Header */}
            <div className="p-5 border-b border-white/5 bg-white/2 backdrop-blur-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center text-xl shadow-[0_0_20px_var(--accent)]">🚨</div>
                <div>
                  <div className="font-black text-[0.8rem] tracking-widest text-white uppercase">DISPATCHER 911</div>
                  <div className="text-[0.6rem] text-[var(--accent)] font-bold tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                    SYSTEM ACTIVE
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>

            {/* Tactical Feed */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 no-scrollbar">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-0 animate-[fadeInUp_0.5s_forwards]">
                  <div className="text-4xl mb-4">🍟</div>
                  <div className="font-bold text-white mb-2 uppercase tracking-tight">¿Cuál es tu emergencia?</div>
                  <div className="text-white/40 text-xs max-w-[200px] mb-8">Nuestros agentes están listos para despachar tu antojo.</div>
                  
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {[
                      { l: '🔥 Combos', v: 'ver combos' },
                      { l: '🍗 Boneless', v: 'quiero boneless' },
                      { l: '🍟 Papas', v: 'ver papas' },
                      { l: '🥤 Bebidas', v: 'ver bebidas' }
                    ].map(btn => (
                      <button 
                        key={btn.v}
                        onClick={() => handleSend(btn.v)}
                        className="bg-white/5 border border-white/10 p-3 rounded-xl text-[0.7rem] font-bold text-white/60 hover:bg-white/10 hover:text-[var(--accent)] transition-all"
                      >
                        {btn.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-[20px] text-[0.9rem] max-w-[85%] leading-relaxed ${
                    msg.sender === 'user' ? 'bg-[var(--accent)] text-black font-bold rounded-br-none' : 'bg-white/5 text-white/90 rounded-bl-none border border-white/10'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.product && <ProductCard product={msg.product} onAdd={addToCart} />}
                  <div className="text-[0.6rem] text-white/20 mt-1 uppercase font-bold tracking-tighter">
                    {msg.sender === 'user' ? 'AUTHORIZED' : 'DISPATCH'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-1.5 ml-2">
                  <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Console */}
            <div className="p-4 border-t border-white/5 bg-white/2 backdrop-blur-xl">
              <div className="relative flex gap-2">
                <input 
                  value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Solicitar despacho..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--accent)] transition-all"
                />
                <button 
                  onClick={() => handleSend()}
                  className="bg-[var(--accent)] text-black w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,90,0,0.3)]"
                >
                  ↑
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable FAB */}
      <div className="fixed bottom-6 right-6 z-[10000] flex items-center justify-center group">
        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute right-full mr-4 bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            🔥 Pide aquí
          </div>
        )}

        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className={`relative w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 ${
            isOpen ? 'bg-white/10 text-white rotate-90 scale-90' : 'bg-[var(--accent)] text-black hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(255,90,0,0.6)]'
          }`}
        >
          {isOpen ? '✕' : <span className="text-3xl filter drop-shadow-md">🚨</span>}
          
          {/* Notification Dot */}
          {!isOpen && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#050505] shadow-[0_0_10px_rgba(255,0,0,0.8)] animate-pulse"></span>
          )}

          {/* Idle Glow Pulse */}
          {!isOpen && <div className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-30"></div>}
        </button>
      </div>
    </>
  );
}
