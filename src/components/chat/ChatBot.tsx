'use client';

/**
 * src/components/chat/ChatBot.tsx — Conversational Sales Assistant.
 * 
 * Redesigned with Product Cards for higher conversion.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { handleMessageModular, INITIAL_STATE, type ConversationState } from '@/core';
import { products, getProductImage, type Product } from '@/data/products';
import { useCartStore } from '@/lib/cartStore';

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
  const [state, setState]     = useState<ConversationState>(INITIAL_STATE);
  
  const { addToCart } = useCartStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter      = useRef(1);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || typing) return;
    const text = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { id: idCounter.current++, text, sender: 'user' }]);
    setTyping(true);

    try {
      // Modular engine call
      const output = await handleMessageModular(text, state, {
        comboName: '🔥 Combo 911',
        comboPrice: 119,
        papasName: 'Papas Loaded',
        papasPrice: 69,
        bebidaName: 'Refresco',
        bebidaPrice: 25,
        postreName: 'Brownie',
        postrePrice: 59,
        comboBonelessName: '🍗 Combo Boneless',
        comboBonelessPrice: 99,
        ahorroBoneless: 40,
        currentTotal: state.cartTotal,
        hasPapas: state.cart.includes('Papas Loaded'),
        hasBebida: state.cart.some(i => i.includes('Refresco')),
        hasPostre: state.cart.some(i => i.includes('Brownie')),
      });

      setState(output.nextState);
      
      // If a product was recommended, find it in data
      const recommendedProduct = products.find(p => 
        output.text.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
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
      console.error('ChatBot Error:', error);
      setMessages(prev => [...prev, { id: idCounter.current++, text: "Ups, algo salió mal. Intenta de nuevo.", sender: 'bot' }]);
    } finally {
      setTyping(false);
    }
  }, [input, state, typing]);

  return (
    <>
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', left: '1.5rem', width: '360px', maxWidth: 'calc(100vw - 3rem)',
          height: '520px', maxHeight: 'calc(100vh - 8rem)', zIndex: 9999, borderRadius: '24px',
          display: 'flex', flexDirection: 'column', background: '#000', border: '1px solid #222',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}>
          {/* Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem' }}>🔥 SNACKS 911</div>
              <div style={{ fontSize: '0.7rem', color: '#22c55e' }}>● EN LÍNEA</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: '#111', border: 'none', color: '#666', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ 
                  padding: '0.8rem 1.1rem', 
                  borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', 
                  background: msg.sender === 'user' ? '#FF4500' : '#111', 
                  fontSize: '0.88rem', lineHeight: 1.5 
                }}>
                  {msg.text}
                </div>
                {msg.product && <ProductCard product={msg.product} onAdd={addToCart} />}
              </div>
            ))}
            {typing && <div style={{ fontSize: '0.8rem', color: '#444' }}>Escribiendo...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '1rem', borderTop: '1px solid #111', display: 'flex', gap: '0.5rem' }}>
            <input 
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Pregunta por un combo..."
              style={{ flex: 1, padding: '0.8rem 1.1rem', background: '#111', border: '1px solid #222', borderRadius: '14px', color: '#fff', outline: 'none' }} 
            />
            <button onClick={handleSend} style={{ width: '42px', background: '#FF4500', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 900 }}>↑</button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setIsOpen(!isOpen)} style={{
        position: 'fixed', bottom: '1.5rem', left: '1.5rem', zIndex: 9999,
        width: '56px', height: '56px', borderRadius: '50%', background: '#FF4500',
        border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer',
        boxShadow: '0 8px 30px rgba(255,69,0,0.4)'
      }}>
        {isOpen ? '✕' : '🔥'}
      </button>
    </>
  );
}
