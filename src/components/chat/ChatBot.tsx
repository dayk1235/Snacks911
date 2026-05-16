import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { products, getProductImage, type Product } from '@/data/products';
import { useChatStore } from '@/stores/chatStore';
import { handleChatMessage, generateWhatsAppLink } from '@/core/conversationEngine';
import { motion, AnimatePresence } from 'framer-motion';

interface Msg { 
  id: number; 
  text: string; 
  sender: 'bot' | 'user' | 'system'; 
  product?: Product;
  actions?: { label: string; value: string }[];
  ui?: { cards?: any[] };
}

// ─── Sub-Component: Product Card Message ─────────────────────────────────────
function ProductCard({ product, onAdd, delay = 0 }: { product: Product; onAdd: (p: Product) => void, delay?: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2 bg-white/[0.03] rounded-[20px] overflow-hidden border border-white/10 w-full max-w-[200px] shadow-xl backdrop-blur-sm"
    >
      <div className="relative h-[110px] bg-black/40">
        <Image 
          src={getProductImage(product)} 
          alt={product.name} 
          fill 
          className="object-cover"
          sizes="200px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="p-4">
        <div className="font-black text-[0.9rem] text-white mb-1 uppercase tracking-tight leading-tight">
          {product.name}
        </div>
        <div className="text-[var(--color-primary)] font-black text-lg mb-3">
          ${product.price}
        </div>
        <motion.button
          onClick={() => onAdd(product)}
          className="w-full py-2 bg-white text-black border-none rounded-xl font-black text-[0.65rem] uppercase tracking-widest cursor-pointer hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-md"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
        >
          AGREGAR +
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function ChatBot() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [activityIndex, setActivityIndex] = useState(0);
  const [ctaIndex, setCtaIndex] = useState(0);
  
  const { cart, addToCart, externalMessage, clearExternalMessage, getTotal } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter      = useRef(1);

  const FAKE_ACTIVITIES = [
    "🔥 Carlos pidió boneless",
    "🔥 Ana pidió combo 911",
    "🔥 Luis pidió papas",
    "🔥 Sofía pidió alitas",
    "🔥 Diego pidió combo mixto",
  ];

  const CTAS = ["🔥 ¿Qué se te antoja?", "🚨 Pide por aquí", "⚡ Activar mi antojo"];

  // Listen for external messages (from Menu/Hero)
  useEffect(() => {
    if (externalMessage) {
      handleSend(externalMessage);
      clearExternalMessage();
    }
  }, [externalMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex(prev => (prev + 1) % FAKE_ACTIVITIES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCtaIndex(prev => (prev + 1) % CTAS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, typing]);

  const handleSend = useCallback(async (customText?: string) => {
    const text = (customText || input).trim();
    if (!text || typing) return;
    if (!customText) setInput('');
    
    setMessages(prev => [...prev, { id: idCounter.current++, text, sender: 'user' }]);
    setTyping(true);

    try {
      const response = await handleChatMessage(text);
      
      // If the engine says "checkout", handle it
      if (response.action === 'checkout') {
        const link = generateWhatsAppLink(cart, getTotal());
        setMessages(prev => [
          ...prev, 
          { id: idCounter.current++, text: response.text, sender: 'bot' }
        ]);
        window.open(link, '_blank');
        return;
      }

      setMessages(prev => [
        ...prev, 
        { 
          id: idCounter.current++, 
          text: response.text, 
          sender: 'bot',
          product: response.product,
          actions: response.actions,
          ui: response.ui
        }
      ]);
    } catch (error) {
      setMessages(prev => [...prev, { id: idCounter.current++, text: "🚨 La central está saturada. Intenta de nuevo.", sender: 'bot' }]);
    } finally {
      setTyping(false);
    }
  }, [input, typing, cart, getTotal]);

  return (
    <div className="w-full h-full flex flex-col bg-transparent">
      {/* Live Activity Banner (Premium subtle) */}
      <div className="px-8 py-3 overflow-hidden shrink-0">
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-full px-4 py-1.5 w-fit mx-auto">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          <AnimatePresence mode="wait">
            <motion.div
              key={activityIndex}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              className="text-[0.6rem] font-bold text-white/30 tracking-[1.5px] uppercase"
            >
              {FAKE_ACTIVITIES[activityIndex]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-10 py-6 flex flex-col gap-8 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-10">
            <div className="text-5xl mb-4 filter drop-shadow-lg">🍟</div>
            <div className="font-black text-white text-lg mb-2 uppercase tracking-[2px]">¿Cuál es tu emergencia?</div>
            <div className="text-white/40 text-xs max-w-[220px] mb-8 uppercase tracking-widest font-bold">
              Despachando antojos a la velocidad de la luz.
            </div>
            
            <div className="grid grid-cols-2 gap-3 w-full max-w-[300px]">
              {[
                { l: '🔥 Combos', v: 'ver combos' },
                { l: '🍗 Boneless', v: 'quiero boneless' },
                { l: '🍟 Papas', v: 'ver papas' },
                { l: '🥤 Bebidas', v: 'ver bebidas' }
              ].map(btn => (
                <motion.button
                  key={btn.v}
                  onClick={() => handleSend(btn.v)}
                  className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl text-[0.7rem] font-black text-white/70 hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white transition-all shadow-md uppercase tracking-widest"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
                >
                  {btn.l}
                </motion.button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`px-6 py-4 rounded-[28px] text-[0.95rem] max-w-[85%] leading-[1.6] shadow-lg ${
              msg.sender === 'user' 
                ? 'bg-gradient-to-br from-[var(--color-primary)] to-[#ff7b00] text-white font-bold rounded-tr-none shadow-[0_10px_30px_rgba(255,90,0,0.2)]' 
                : 'bg-white/[0.05] text-white/90 rounded-tl-none border border-white/10 backdrop-blur-md'
            }`}>
              {msg.text}
            </motion.div>
            {msg.product && !msg.ui?.cards && (
              <div className="mt-4 w-full flex justify-start">
                <ProductCard product={msg.product} onAdd={addToCart} />
              </div>
            )}
            {msg.ui?.cards && msg.ui.cards.length > 0 && (
              <div className="mt-4 w-full flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x">
                {msg.ui.cards.map((card: any, idx: number) => {
                  // Fallback: Si no está en el catálogo estático por diferencias de mayúsculas/minúsculas o porque es un producto nuevo en BD, usamos la data del 'card' del botEngine.
                  const p = products.find(prod => prod.name.toLowerCase() === card.title.toLowerCase()) || {
                    id: card.id || String(idx),
                    name: card.title,
                    price: card.price,
                    category: 'general',
                    description: card.description || '',
                    image: card.imageUrl,
                    ingredients: []
                  };
                  return p ? (
                    <div key={idx} className="snap-start shrink-0">
                      <ProductCard product={p as Product} onAdd={addToCart} delay={0.1 + (idx * 0.1)} />
                    </div>
                  ) : null;
                })}
              </div>
            )}
            {msg.actions && msg.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 w-full justify-start">
                {msg.actions.map((action, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => handleSend(action.value || action.label)}
                    className="chat-action-btn ghost"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
                  >
                    {action.label}
                  </motion.button>
                ))}
              </div>
            )}
            <div className={`text-[0.55rem] text-white/20 mt-3 uppercase font-black tracking-[2px] ${msg.sender === 'user' ? 'mr-2' : 'ml-2'}`}>
              {msg.sender === 'user' ? 'SENT' : 'BOT'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2 ml-4 mb-4">
            <span className="w-1.5 h-1.5 bg-[var(--color-primary)]/40 rounded-full animate-bounce"></span>
            <span className="w-1.5 h-1.5 bg-[var(--color-primary)]/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-1.5 bg-[var(--color-primary)]/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Console (Premium Glass) */}
      <div className="px-10 pb-10 pt-4 shrink-0">
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[32px] p-2.5 shadow-2xl">
          {cart.length > 0 && (
            <div className="mb-4 flex items-center justify-between px-5 pt-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
                <span className="text-[0.65rem] font-black text-white/60 uppercase tracking-widest">
                  {cart.length} ítems en despacho
                </span>
              </div>
              <motion.button
                onClick={() => handleSend("Finalizar pedido")}
                className="text-[0.65rem] font-black text-[var(--color-primary)] uppercase tracking-widest"
                whileHover={{ scale: 1.05, x: 2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
              >
                CERRAR ORDEN →
              </motion.button>
            </div>
          )}
          
          <div className="relative flex items-center gap-3">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={CTAS[ctaIndex]}
              className="flex-1 bg-transparent border-none rounded-2xl px-5 py-4 text-[0.95rem] text-white placeholder:text-white/20 focus:outline-none focus:ring-0 transition-all"
            />
            <motion.button
              onClick={() => handleSend()}
              disabled={typing}
              className="chat-send-btn bg-white text-black"
              whileHover={!typing ? { scale: 1.1 } : undefined}
              whileTap={!typing ? { scale: 0.9 } : undefined}
              transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            </motion.button>
          </div>
        </div>
        <p className="text-center mt-6 text-[0.6rem] font-bold tracking-[2px] text-white/10 uppercase">
          SECURE ENCRYPTED CHANNEL
        </p>
      </div>
    </div>
  );
}
