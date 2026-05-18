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

  if (/(ver\s+)?(mi\s+)?(carrito|cuenta|orden|pedido)|qu[eé]\s+llevo|cu[aá]nto\s+(llevo|es|ser[ií]a|va)|total/i.test(lowerMsg)) {
    if (store.cart.length === 0) {
      return { text: "Tu carrito está vacío 😅. ¿Quieres ver combos o bebidas?" };
    }

    const total = store.getTotal();
    const lines = store.cart.map(item => `• ${item.qty}x ${item.name} - $${item.price * item.qty}`);

    return {
      text: `Tu cuenta va así:\n${lines.join('\n')}\n\nTotal: $${total}\n\n¿Quieres agregar algo más o cerramos tu pedido?`,
      actions: [
        { id: 'web-summary-drinks', label: '🥤 Agregar bebida', type: 'show_category', value: 'ver bebidas' },
        { id: 'web-summary-checkout', label: '📦 Pedir ya', type: 'checkout', value: 'Finalizar pedido' },
      ],
      ui: {
        cart: {
          total,
          itemCount: store.cart.reduce((sum, item) => sum + item.qty, 0),
        },
      },
    };
  }

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
        const currentState = useChatStore.getState();
        return { 
          text: `¡Listo! Agregué **${product.name}** a tu pedido. 🔥 ¿Algo más o quieres finalizar?`,
          action: 'add_to_cart',
          product,
          ui: {
            cart: {
              total: currentState.getTotal(),
              itemCount: currentState.cart.reduce((sum, item) => sum + item.qty, 0)
            }
          }
        };
      }
    }
  }

  // 2. AI FALLBACK (Gemini API - Full Logic Restoration)
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        phone: 'web-user',
        cart: {
          items: store.cart,
          total: store.getTotal(),
        },
      })
    });
    const data = await res.json();

    if (data.cart?.items?.length) {
      const syncedCart = data.cart.items.map((item: any) => ({
        id: String(item.id || item.productId),
        name: item.name,
        description: item.description || '',
        price: Number(item.price) || 0,
        category: item.category || 'general',
        image: item.image || '',
        ingredients: item.ingredients || [],
        qty: Number(item.qty || item.quantity) || 1,
      }));
      useChatStore.getState().syncCart(syncedCart);
    }
    
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
