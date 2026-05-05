import { dbGetProducts, dbSaveOrder } from "@/lib/db";
import { getCustomerProfileFromDB } from '@/lib/server/supabaseServer';
import { getEntryRecommendation } from './offerAgent';
import { getAIResponse } from "@/lib/whatsapp/aiService";
import { detectIntent } from './intentDetector';

const memory = new Map<string, { product: any; qty: number }>();

function extractQty(text: string) {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function isCompatible(product: any, restrictions: string[] = []) {
  if (!restrictions.length) return true;
  const productText = `${product.name} ${product.description || ''}`.toLowerCase();
  return !restrictions.some(r => productText.includes(r.toLowerCase()));
}

export async function getBotResponse({ message, phone }: { message: string; phone?: string }) {
  let profile;
  if (phone) {
    try {
      profile = await getCustomerProfileFromDB(phone);
    } catch (e) {
      console.error("[getBotResponse] Error fetching profile:", e);
    }
  }

  const products = await dbGetProducts();
  return buildPersonalizedResponse(message, phone, products, profile);
}

async function buildPersonalizedResponse(message: string, phone: string | undefined, products: any[], profile?: any) {
  const lower = message.toLowerCase();
  const { intent } = detectIntent(message);

  const isOrderIntent = /quiero|dame|ordenar|pedir/i.test(message);
  const isConfirming = (lower.includes("si") || lower.includes("sí")) && phone;

  const foundProduct = products.find(p => lower.includes(p.name.toLowerCase()));
  const shouldUseAI = !isConfirming && !foundProduct && !isOrderIntent && intent === 'other';

  const context = {
    menu_items: products.map(p => ({
      name: p.name,
      price: p.price,
      category: p.category
    })),
    modifiers: [],
    announcements_active: [],
    promos_active: [],
    cart_state: [],
    customer_message: message
  };

  // 1. Greeting
  let greeting = '';
  if (profile?.name) {
    greeting = `¡Hola ${profile.name}! 👋\n\n`;
  }

  if (/alergi|alérgi/i.test(message)) {
    if (profile?.restrictions?.length) {
      return `${greeting}Tienes registradas las siguientes alergias: ${profile.restrictions.join(', ')}. Tomamos todas las precauciones.`;
    }
    return `${greeting}No tenemos alergias registradas para ti. ¿Quieres añadir alguna?`;
  }

  if (isConfirming && phone) {
    const order = memory.get(phone);
    if (!order) return "No tengo tu pedido 😅 inténtalo otra vez";

    try {
      await dbSaveOrder({
        id: '',
        status: 'pending',
        channel: 'WHATSAPP',
        whatsappConfirmed: true,
        items: [{ productId: '', productName: order.product.name, quantity: order.qty, price: order.product.price }],
        total: order.product.price * order.qty,
        createdAt: new Date().toISOString(),
        customerName: profile?.name || 'WhatsApp',
        customerPhone: phone
      });
      memory.delete(phone);
      return "✅ Pedido confirmado. En breve te contactamos 🙌";
    } catch (e) {
      console.error("Error saving order:", e);
      return "Tuve un problema guardando tu pedido 😔";
    }
  }

  if (!products || products.length === 0) return "Ahorita no tengo productos disponibles 😔";

  if (foundProduct) {
    const qty = extractQty(message);
    if (qty && phone) {
      const total = foundProduct.price * qty;
      memory.set(phone, { product: foundProduct, qty });
      return `${greeting}🧾 Pedido:\n${qty} x ${foundProduct.name}\n\nTotal: $${total}\n\n¿Confirmas? (sí/no)`;
    }
    return `${greeting}🔥 ${foundProduct.name}\nPrecio: $${foundProduct.price}\n\n¿Cuántas quieres?`;
  }

  // 2. Recommendations
  if (['duda', 'hambre', 'exploracion'].includes(intent) || /recomienda|sugiere/i.test(message)) {
    const rec = await getEntryRecommendation(intent, profile);
    if (rec && isCompatible(rec, profile?.restrictions)) {
      const isFav = profile?.favoriteProduct?.toLowerCase() === rec.name.toLowerCase();
      return `${greeting}${isFav ? '🌟 Basado en tu favorito, te recomiendo:' : '💡 Te recomiendo probar:'}\n\n${rec.name} - $${rec.price}\n${rec.description || ''}\n\n¿Te gustaría ordenar este?`;
    }
  }

  // 3. Default Menu
  let text = `${greeting}🔥 MENÚ Snacks 911 🔥\n\n`;
  if (profile?.favoriteProduct) text += `Te recomendamos tu favorito: ${profile.favoriteProduct} 🌟\n\n`;

  for (const p of products) {
    if (isCompatible(p, profile?.restrictions)) {
      text += `🍗 ${p.name} - $${p.price}\n`;
    }
  }
  text += "\n¿Qué te gustaría ordenar? 😏";

  if (shouldUseAI) {
    try {
      const ai = await getAIResponse(context);
      if (ai?.message_to_user) return `${greeting}${ai.message_to_user}`;
    } catch { }
  }

  return text;
}