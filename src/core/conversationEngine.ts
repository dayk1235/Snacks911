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
    
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();

    // Sync cart state if the server modified it (transactional actions)
    if (data.cart?.items) {
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
      store.syncCart(syncedCart);
    }
    
    // Determine suggested product for UI if needed
    let suggestedProduct = null;
    if (data.ui?.cards?.length) {
      const card = data.ui.cards[0];
      suggestedProduct = products.find(p => p.name.toLowerCase() === card.title.toLowerCase());
    }

    return { 
      text: data.text,
      action: data.action,
      product: suggestedProduct || data.product,
      actions: data.actions,
      ui: data.ui
    };
  } catch (error) {
    console.error('[conversationEngine] Error:', error);
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
