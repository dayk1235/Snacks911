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

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/la |el |los |las |un |una /g, '')
    .trim();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function isCompatible(product: any, restrictions: string[] = []) {
  if (!restrictions.length) return true;

  const ingredients = product.ingredients || [];
  const text = `${product.name} ${product.description || ''}`.toLowerCase();

  return !restrictions.some(r => {
    const clean = r.toLowerCase();
    return (
      text.includes(clean) ||
      ingredients.some((i: string) => i.toLowerCase().includes(clean))
    );
  });
}

export async function getBotResponse({ message, phone }: { message: string; phone?: string }) {
  const cleanPhone = phone ? normalizePhone(phone) : undefined;
  let profile = null;

  if (cleanPhone) {
    try {
      profile = await getCustomerProfileFromDB(cleanPhone);
    } catch {
      profile = null;
    }
  }
  console.log('[botEngine] PROFILE:', profile);
  console.log('[DEBUG PROFILE]', profile);

  const products = await dbGetProducts();
  return buildPersonalizedResponse(message, cleanPhone, products, profile);
}

async function buildPersonalizedResponse(message: string, phone: string | undefined, products: any[], profile?: any) {
  const lower = message.toLowerCase();
  const { intent } = detectIntent(message);
  
  const isGreeting =
    lower === 'hola' ||
    lower.includes('hola') ||
    lower.includes('buenas') ||
    lower.includes('hey');

  if (isGreeting) {
    if (profile?.name) {
      return `¡Hola ${profile.name}! 👋\n¿Quieres ver el menú o te recomiendo algo? 🔥`;
    } else {
      return `¡Hola! 👋\n¿Quieres ver el menú o te recomiendo algo? 🔥`;
    }
  }
  
  // Greeting
  let greeting = '';
  if (profile?.name) {
    greeting = `¡Hola ${profile.name}! 👋\n\n`;
  }

  // 1. ALERGIAS
  if (/alergi|alérgi/i.test(message)) {
    if (profile?.restrictions?.length) {
      return `${greeting}Tienes registradas las siguientes alergias: ${profile.restrictions.join(', ')}. Tomamos todas las precauciones.`;
    }
    return `${greeting}No tenemos alergias registradas para ti. ¿Quieres añadir alguna?`;
  }

  // 2. FAVORITO
  if (/favorito|preferido/i.test(message)) {
    const favProduct = products.find(p => p.name === profile?.favorite_product);
    const isCompatibleFav = favProduct && isCompatible(favProduct, profile?.restrictions || []);
    return `${greeting}${profile?.favorite_product && isCompatibleFav ? `Tu combo favorito es: ${profile.favorite_product} 🌟` : 'Aún no tengo tu favorito registrado.'}`;
  }

  const wantsCombos =
    lower.includes('combo') ||
    lower.includes('combos') ||
    lower.includes('solo combos');

  if (wantsCombos) {
    const combos = Array.from(
      new Map(
        products
          .filter(p => p.category === 'combos')
          .map(p => [p.name, p])
      ).values()
    );

    const filtered = combos.filter(p =>
      isCompatible(p, profile?.restrictions)
    );

    let comboText = `${greeting}🔥 NUESTROS COMBOS 🔥\n\n`;

    for (const p of filtered) {
      comboText += `🍗 ${p.name} - $${p.price}\n`;
    }

    comboText += "\n¿Cuál quieres?";

    return comboText;
  }

  // 3. SOLO COMBOS
  let currentProducts = products;

  const isOrderIntent = /quiero|dame|ordenar|pedir/i.test(message);
  const isConfirming = (lower.includes("si") || lower.includes("sí")) && phone;
  
  const foundProduct = currentProducts.find(p => lower.includes(p.name.toLowerCase()));
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

  if (!currentProducts || currentProducts.length === 0) return "Ahorita no tengo productos disponibles 😔";

  if (foundProduct) {
    const qty = extractQty(message);
    if (qty && phone) {
      const total = foundProduct.price * qty;
      memory.set(phone, { product: foundProduct, qty });
      return `${greeting}🧾 Pedido:\n${qty} x ${foundProduct.name}\n\nTotal: $${total}\n\n¿Confirmas? (sí/no)`;
    }
    return `${greeting}🔥 ${foundProduct.name}\nPrecio: $${foundProduct.price}\n\n¿Cuántas quieres?`;
  }

  // 4. RECOMENDACIONES Y MENÚ
  if (['duda', 'hambre', 'exploracion'].includes(intent) || /recomienda|sugiere/i.test(message)) {
    let rec = await getEntryRecommendation(intent, profile);

    if (rec && !isCompatible(rec, profile?.restrictions)) {
      console.log('[botEngine] BLOCKED unsafe recommendation:', rec.name);

      const safeProducts = products.filter(p =>
        isCompatible(p, profile?.restrictions)
      );

      rec = safeProducts[0] || null;
    }

    if (rec) {
      const isFav = profile?.favorite_product?.toLowerCase() === rec.name.toLowerCase();
      return `${greeting}${isFav ? '🌟 Basado en tu favorito, te recomiendo:' : '💡 Te recomiendo probar:'}\n\n${rec.name} - $${rec.price}\n${rec.description || ''}\n\n¿Te gustaría ordenar este?`;
    }
  }

  let text = `${greeting}🔥 MENÚ Snacks 911 🔥\n\n`;
  const favProduct = products.find(p => p.name === profile?.favorite_product);
  if (favProduct && isCompatible(favProduct, profile?.restrictions || [])) text += `Te recomendamos tu favorito: ${favProduct.name} 🌟\n\n`;

  for (const p of currentProducts) {
    if (isCompatible(p, profile?.restrictions) && p.name !== profile?.favorite_product) {
      text += `🍗 ${p.name} - $${p.price}\n`;
    }
  }
  text += "\n¿Qué te gustaría ordenar? 😏";

  const simpleMessage =
    intent === 'browsing' ||
    intent === 'exploracion' ||
    intent === 'hambre' ||
    intent === 'duda' ||
    message.length < 20;

  if (simpleMessage) {
    return '¡Hola! 👋 ¿Quieres ver el menú o te recomiendo algo?';
  }

  if (shouldUseAI) {
    let aiRes = null;

    try {
      aiRes = await getAIResponse(context);
    } catch (e) {
      console.error('[AI FALLBACK]', e);
    }

    if (aiRes?.message_to_user) return `${greeting}${aiRes.message_to_user}`;

    if (!aiRes) {
      return '¿Te muestro el menú o buscas algo en especial? 🔥';
    }
  }

  return text;
}
