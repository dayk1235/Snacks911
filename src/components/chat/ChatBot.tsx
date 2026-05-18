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
  actions?: { id?: string; label: string; value: string; type?: string; payload?: any; image?: string }[];
  ui?: { cards?: any[]; cart?: { total: number; itemCount: number } };
}

// ─── Sub-Component: Product Card Message ─────────────────────────────────────
function ProductCard({ product, onAdd, delay = 0 }: { product: Product; onAdd: (p: Product) => void, delay?: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay, ease: [0.16, 1, 0.3, 1] }}
      className="mt-2 group relative bg-white/[0.03] backdrop-blur-xl rounded-[24px] overflow-hidden border border-white/10 w-full max-w-[210px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-[var(--color-primary)]/40 hover:shadow-[0_25px_60px_rgba(255,60,0,0.15)]"
    >
      {/* Inner Tactical Border */}
      <div className="absolute inset-[1px] border border-white/5 rounded-[23px] pointer-events-none z-10" />
      
      <div className="relative h-[120px] bg-black/40 overflow-hidden">
        <Image 
          src={product.image || getProductImage(product)} 
          alt={product.name} 
          fill 
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="210px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Tactical Badge */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full z-20">
          <span className="text-[0.5rem] font-black text-white/50 tracking-widest uppercase">Dispatcher Verified</span>
        </div>
      </div>

      <div className="p-4 relative z-20">
        <div className="font-display font-black text-[1.1rem] text-white mb-0.5 uppercase tracking-tight leading-tight">
          {product.name}
        </div>
        <div className="flex items-baseline gap-1.5 mb-4">
          <span className="text-[var(--color-primary)] font-mono font-black text-xl">
            ${product.price}
          </span>
          <span className="text-[0.6rem] font-bold text-white/20 uppercase tracking-tighter">MXN</span>
        </div>
        
        <motion.button
          onClick={() => onAdd(product)}
          className="w-full py-2.5 bg-white text-black border-none rounded-xl font-display font-black text-[0.75rem] uppercase tracking-widest cursor-pointer hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-[0_4px_12px_rgba(255,255,255,0.1)] relative overflow-hidden"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <span className="relative z-10">AGREGAR +</span>
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

  const handleAction = useCallback((action: { label: string; value: string; type?: string; payload?: any; image?: string }) => {
    if (action.type === 'checkout') {
      handleSend('Finalizar pedido');
      return;
    }

    if (action.type === 'add_to_cart' && action.payload) {
      addToCart({
        id: String(action.payload.productId || action.payload.id),
        name: action.payload.name || action.label.replace(/^\+\s*/, ''),
        description: action.payload.description || '',
        price: Number(action.payload.price) || 0,
        category: action.payload.category || 'general',
        image: action.image || action.payload.image || '',
        ingredients: action.payload.ingredients || [],
      } as Product);
      return;
    }

    handleSend(action.value || action.label);
  }, [addToCart, handleSend]);

  return (
    <div className="w-full h-full flex flex-col bg-transparent">
      {/* Live Activity Banner (Tactical HUD) */}
      <div className="px-8 py-4 overflow-hidden shrink-0 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-full px-5 py-2 w-fit mx-auto backdrop-blur-md shadow-inner">
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0 shadow-[0_0_12px_rgba(34,197,94,0.8)]"></span>
            <span className="absolute w-4 h-4 bg-green-500/20 rounded-full animate-ping"></span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activityIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-[0.65rem] font-mono font-bold text-white/40 tracking-[2px] uppercase"
            >
              {FAKE_ACTIVITIES[activityIndex]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-10 py-6 flex flex-col gap-8 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-4">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mb-8"
            >
              <div className="text-6xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">🍕</div>
              <div className="absolute -inset-4 bg-[var(--color-primary)]/10 rounded-full blur-2xl -z-10 animate-pulse"></div>
            </motion.div>
            
            <div className="font-display font-black text-white text-3xl mb-3 uppercase tracking-wider leading-none">
              ¿CUÁL ES TU <span className="text-[var(--color-primary)]">EMERGENCIA?</span>
            </div>
            <div className="font-mono text-white/30 text-[0.65rem] max-w-[280px] mb-10 uppercase tracking-[3px] font-bold leading-relaxed">
              DESPACHANDO ANTOJOS A LA VELOCIDAD DE LA LUZ.
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-[340px]">
              {[
                { l: '🔥 COMBOS', v: 'ver combos' },
                { l: '🍗 BONELESS', v: 'quiero boneless' },
                { l: '🍟 PAPAS', v: 'ver papas' },
                { l: '🥤 BEBIDAS', v: 'ver bebidas' }
              ].map((btn, i) => (
                <motion.button
                  key={btn.v}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  onClick={() => handleSend(btn.v)}
                  className="group relative bg-white/[0.02] border border-white/10 p-5 rounded-2xl text-[0.7rem] font-display font-black text-white/60 hover:text-white transition-all overflow-hidden"
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 tracking-[2.5px]">{btn.l}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`relative px-6 py-4 rounded-[24px] text-[0.98rem] max-w-[85%] leading-[1.65] shadow-2xl overflow-hidden ${
              msg.sender === 'user' 
                ? 'bg-gradient-to-br from-[var(--color-primary)] to-[#ff7b00] text-white font-bold rounded-tr-none shadow-[0_15px_35px_rgba(255,90,0,0.25)]' 
                : 'bg-white/[0.04] text-white/90 rounded-tl-none border border-white/10 backdrop-blur-xl'
            } whitespace-pre-line`}>
              {msg.sender === 'bot' && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-primary)] opacity-60" />
              )}
              {msg.text}
            </motion.div>
            {msg.product && !msg.ui?.cards && (
              <div className="mt-2 pt-2 pb-12 w-full flex justify-start">
                <ProductCard product={msg.product} onAdd={addToCart} />
              </div>
            )}
            {msg.ui?.cart && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-5 w-full max-w-[320px] rounded-[24px] border border-[var(--color-primary)]/30 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent p-5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-[0.6rem] font-mono font-black uppercase tracking-[3px] text-[var(--color-primary)] mb-1">
                      ESTADO DE ORDEN
                    </span>
                    <span className="text-[0.6rem] font-bold text-white/30 uppercase tracking-[1.5px]">
                      {msg.ui.cart.itemCount} PRODUCTOS EN LISTA
                    </span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse shadow-[0_0_10px_var(--color-primary)]"></div>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-black text-white tracking-tighter">
                    ${msg.ui.cart.total}
                  </span>
                  <span className="text-[0.7rem] font-mono font-bold text-white/40 uppercase">MXN TOTAL</span>
                </div>
              </motion.div>
            )}
            {msg.ui?.cards && msg.ui.cards.length > 0 && (
              <div className="mt-2 -mx-4 px-4 pt-4 pb-16 w-[calc(100%+32px)] flex overflow-x-auto gap-4 no-scrollbar snap-x">
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
              <div className="mt-4 flex flex-wrap gap-2.5 w-full justify-start">
                {msg.actions.map((action, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => handleAction(action)}
                    className="px-5 py-2.5 bg-white/[0.03] border border-white/10 rounded-full text-[0.65rem] font-mono font-bold text-white/50 uppercase tracking-[2px] hover:bg-white hover:text-black hover:border-white transition-all cursor-pointer shadow-md"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
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

      {/* Input Console (Premium Command Center) */}
      <div className="px-10 pb-8 pt-4 shrink-0 relative">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 shadow-2xl relative overflow-hidden group">
          {/* Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          {cart.length > 0 && (
            <div className="mb-3 flex items-center justify-between px-6 pt-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
                  <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] animate-pulse [animation-delay:0.2s]"></span>
                </div>
                <span className="text-[0.6rem] font-mono font-black text-white/40 uppercase tracking-[2px]">
                  LISTA DE DESPACHO: <span className="text-white/80">{cart.reduce((sum, item) => sum + item.qty, 0)} ITEMS</span> · <span className="text-[var(--color-primary)]">${getTotal()}</span>
                </span>
              </div>
              <motion.button
                onClick={() => handleSend("Finalizar pedido")}
                className="text-[0.65rem] font-display font-black text-[var(--color-primary)] uppercase tracking-[3px] hover:text-white transition-colors"
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                CONFIRMAR ORDEN →
              </motion.button>
            </div>
          )}
          
          <div className="relative flex items-center gap-3 z-10">
            <div className="pl-5 text-white/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={typing ? "DESPACHADOR PROCESANDO..." : CTAS[ctaIndex].toUpperCase()}
              className="flex-1 bg-transparent border-none rounded-2xl py-5 text-[0.95rem] font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-0 transition-all uppercase tracking-wide"
            />
            <motion.button
              onClick={() => handleSend()}
              disabled={typing || !input.trim()}
              className={`mr-2 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                input.trim() ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-white/20'
              }`}
              whileHover={input.trim() && !typing ? { scale: 1.05, rotate: 5 } : undefined}
              whileTap={input.trim() && !typing ? { scale: 0.95 } : undefined}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            </motion.button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-6 px-4">
          <p className="text-[0.55rem] font-mono font-black tracking-[4px] text-white/10 uppercase">
            SECURE CHANNEL ID: 911-DS-PRM
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[0.55rem] font-mono font-black tracking-[2px] text-white/30 uppercase">
              {typing ? 'PROCESSING' : 'SYSTEM READY'}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${typing ? 'bg-orange-500 animate-pulse' : 'bg-green-500/50'}`}></span>
          </div>
        </div>
      </div>
    </div>
  );
}
