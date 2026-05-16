import { detectIntent, parseEntitiesRecord } from './intentDetector';
import { products } from '@/data/products';
import { useChatStore } from '@/stores/chatStore';

export type ConversationMode = 'idle' | 'browsing' | 'ordering' | 'confirming';

export interface BotResponse {
  text: string;
  action?: 'add_to_cart' | 'show_menu' | 'checkout' | 'clear_cart';
  product?: any;
  actions?: any[];
  ui?: any;
}

export async function handleChatMessage(message: string): Promise<BotResponse> {
  const store = useChatStore.getState();
  const intentResult = detectIntent(message);
  const entities = parseEntitiesRecord(intentResult.entities);

  const lowerMsg = message.toLowerCase();

  // 1. HARDCODED INTENTS (Conversational Sales Flow)
  if (intentResult.intent === 'CONFIRM_ORDER' || lowerMsg.includes('finalizar') || lowerMsg === 'pagar') {
    if (store.cart.length === 0) {
      return { text: "Tu carrito está vacío 😅. ¿Qué se te antoja pedir?" };
    }
    return { 
      text: "¡Excelente elección! 🍗 Generando tu resumen para WhatsApp...",
      action: 'checkout'
    };
  }

  if (intentResult.intent === 'ADD_TO_CART' || intentResult.intent === 'pedido') {
    if (entities.products.length > 0) {
      const searchStr = entities.products[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const product = products.find(p => {
        const nameLower = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return nameLower === searchStr || nameLower.includes(searchStr) || searchStr.includes(nameLower.split(' ')[0]);
      });
      
      if (product) {
        store.addToCart(product);
        return { 
          text: `¡Listo! Agregué **${product.name}** a tu pedido. 🔥 ¿Algo más o quieres finalizar?`,
          action: 'add_to_cart',
          product
        };
      }
    }
  }

  // 2. AI FALLBACK (Gemini API - Full Logic Restoration)
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, phone: 'web-user' })
    });
    const data = await res.json();
    
    // Check if the AI suggested a product or if it's in the UI
    const suggestedProduct = products.find(p => 
      data.text.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    );

    return { 
      ...data, // Keep all AI fields (actions, ui, etc)
      product: suggestedProduct || (data.ui?.cards ? products.find(p => p.name === data.ui.cards[0].title) : null)
    };
  } catch (error) {
    return { text: "Perdón 😅, mi conexión está fallando. ¿Podemos intentar de nuevo?" };
  }
}

/**
 * Generates the WhatsApp link with the current cart summary
 */
export function generateWhatsAppLink(cart: any[], total: number): string {
  const businessNumber = process.env.NEXT_PUBLIC_WA_NUMBER || '5215500000000';
  
  let message = `*NUEVO PEDIDO - SNACKS 911* 🚨\n\n`;
  cart.forEach(item => {
    message += `• ${item.name} x${item.qty} - $${item.price * item.qty}\n`;
  });
  message += `\n*TOTAL: $${total}*\n`;
  message += `\n_Pedido realizado desde la web_ 🍟`;

  return `https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`;
}
