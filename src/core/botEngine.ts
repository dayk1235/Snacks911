import { dbGetProducts, dbSaveOrder } from "@/lib/db";
import { getCustomerProfileFromDB } from '@/lib/server/supabaseServer';
import { getEntryRecommendation } from './offerAgent';
import { getAIResponse } from "@/lib/whatsapp/aiService";
import { detectIntent } from './intentDetector';
import { filterProducts, isProductSafe } from '@/core/allergyFilter';

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

function parseMultiIntent(message: string, products: any[]) {
  const lower = message.toLowerCase();
  
  // Extract include keywords (after "con", "quiero", "dame", or just at start)
  // Matches things like "quiero papas", "dame alitas", "papas"
  const includeMatch = lower.match(/\b(?:con|quiero|dame)\s+([a-z\s]+?)(?=\s+(?:pero|sin)\s+|$)/i) || 
                       lower.match(/^([a-z\s]+?)(?=\s+(?:sin|pero sin)\s+|$)/i);
  
  let includeWords: string[] = [];
  if (includeMatch) {
    includeWords = includeMatch[1].trim().split(/\s+/).filter(w => w.length > 2);
  }
  
  // Extract exclude keywords (after "sin", "pero sin")
  const excludeMatch = lower.match(/(?:sin|pero sin)\s+([a-z\s]+?)(?:\s+|$)/i);
  let excludeWords: string[] = [];
  if (excludeMatch) {
    excludeWords = excludeMatch[1].trim().split(/\s+/).filter(w => w.length > 2);
  }
  
  // If no specific include/exclude keywords found, return null
  if (!includeWords.length && !excludeWords.length) return null;
  
  // Filter products
  const filtered = products.filter(p => {
    const nameAndIngredients = `${p.name} ${(p.ingredients || []).join(' ')}`.toLowerCase();
    
    // Must include at least one include word (if specified)
    if (includeWords.length) {
      const hasInclude = includeWords.some(word => nameAndIngredients.includes(word));
      if (!hasInclude) return false;
    }
    
    // Must NOT include any exclude word
    if (excludeWords.length) {
      const hasExclude = excludeWords.some(word => nameAndIngredients.includes(word));
      if (hasExclude) return false;
    }
    
    return true;
  });
  
  return {
    products: filtered.slice(0, 4),
    includeWords,
    excludeWords
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export async function getBotResponse({ message, phone }: { message: string; phone?: string }) {
  console.log("[ENGINE USED:", "MODULAR");
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
  // GLOBAL ALLERGY FILTER
  const safeProducts = filterProducts(products, profile?.restrictions || []);

  const lower = message.toLowerCase();
  const { intent } = detectIntent(message);

  // MULTI-INTENT: Parse "quiero X pero sin Y"
  const multiIntent = parseMultiIntent(message, safeProducts);
  
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

  // MULTI-INTENT: Handle "quiero X pero sin Y"
  if (multiIntent && multiIntent.products.length > 0) {
    let response = greeting;
    response += `¡Claro! Te sugiero estas opciones:\n\n`;
    
    for (const p of multiIntent.products) {
      response += `🍗 ${p.name} - $${p.price}\n`;
    }
    
    response += `\n¿Cuál te gustaría ordenar? 😏`;
    return response;
  }
  
  // 1. ALERGIAS
  if (/alergi|alérgi/i.test(message)) {
    // Extract allergen from current message
    let currentAllergen = '';
    const match = message.match(/a\s+(.+)/i);
    if (match) {
      currentAllergen = match[1]
        .toLowerCase()
        .replace(/^la\s+|^el\s+|^los\s+|^las\s+/gi, '')
        .replace(/(soy|tengo|sufro de)/gi, '')
        .replace(/(alergia a|alergico a|alérgico a)/gi, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim();
    }

    // Build response
    let response = greeting;

    if (profile?.restrictions?.length) {
      response += `Tienes registradas las siguientes alergias: ${profile.restrictions.join(', ')}. Tomamos todas las precauciones.`;
    } else if (currentAllergen) {
      response += `¡Entendido! Eres alérgico a "${currentAllergen}". Lo anotamos para tu seguridad. 🛡️`;
    }

    // Filter safe products using all restrictions
    const allRestrictions = [...(profile?.restrictions || [])];
    if (currentAllergen && !allRestrictions.includes(currentAllergen)) {
      allRestrictions.push(currentAllergen);
    }

      const localSafe = safeProducts.filter(p => isProductSafe(p, allRestrictions)).slice(0, 5);

    if (localSafe.length > 0) {
      response += `\n\nTe recomendamos estos productos seguros:\n\n`;
      for (const p of localSafe) {
        response += `🍗 ${p.name} - $${p.price}\n`;
      }
      response += `\n¿Cuál te gustaría ordenar? 😏`;
    } else {
      response += `\n\nNo tenemos opciones compatibles con tus restricciones 😔`;
    }

    return response;
  }

  // 2. FAVORITO
  if (/favorito|preferido/i.test(message)) {
    const favProduct = safeProducts.find(p => p.name === profile?.favorite_product);
    const isCompatibleFav = favProduct && isProductSafe(favProduct, profile?.restrictions || []);
    return `${greeting}${profile?.favorite_product && isCompatibleFav ? `Tu combo favorito es: ${profile.favorite_product} 🌟` : 'Aún no tengo tu favorito registrado.'}`;
  }

  const wantsCombos =
    lower.includes('combo') ||
    lower.includes('combos') ||
    lower.includes('solo combos');

  if (wantsCombos) {
    const combos = Array.from(
      new Map(
        safeProducts
          .filter(p => p.category === 'combos')
          .map(p => [p.name, p])
      ).values()
    );

    const filtered = combos.filter(p =>
      isProductSafe(p, profile?.restrictions)
    );

    let comboText = `${greeting}🔥 NUESTROS COMBOS 🔥\n\n`;

    for (const p of filtered) {
      comboText += `🍗 ${p.name} - $${p.price}\n`;
    }

    comboText += "\n¿Cuál quieres?";

    return comboText;
  }

  // 3. SOLO COMBOS
  let currentProducts = safeProducts;

  const isOrderIntent = /quiero|dame|ordenar|pedir/i.test(message);
  const isConfirming = (lower.includes("si") || lower.includes("sí")) && phone;
  
  const foundProduct = currentProducts.find(p => lower.includes(p.name.toLowerCase()));
  
  // FALLBACK TRIGGER: Only if NO intent AND NO safe products available
  const isGenericIntent = intent === 'other' || !intent;
  const shouldUseAI = isGenericIntent && safeProducts.length === 0;

  // Fix: Only confirm if order actually exists in memory
  const isConfirmingWithOrder = isConfirming && memory.has(phone);

  const context = {
    menu_items: safeProducts.map(p => ({
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

  if (isConfirmingWithOrder) {
    const order = memory.get(phone);
    // No need to check !order since isConfirmingWithOrder ensures it exists
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

  // If isConfirming was true but no order existed, treat as normal message
  if (isConfirming && !isConfirmingWithOrder) {
    // Fall through to normal processing
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

      if (rec && !isProductSafe(rec, profile?.restrictions || [])) {
      console.log('[botEngine] BLOCKED unsafe recommendation:', rec.name);
      rec = safeProducts[0] || null;
    }

    if (rec) {
      const isFav = profile?.favorite_product?.toLowerCase() === rec.name.toLowerCase();
      return `${greeting}${isFav ? '🌟 Basado en tu favorito, te recomiendo:' : '💡 Te recomiendo probar:'}\n\n${rec.name} - $${rec.price}\n${rec.description || ''}\n\n¿Te gustaría ordenar este?`;
    }
  }

  let text = `${greeting}🔥 MENÚ Snacks 911 🔥\n\n`;
  const favProduct = safeProducts.find(p => p.name === profile?.favorite_product);
  if (favProduct && isProductSafe(favProduct, profile?.restrictions || [])) text += `Te recomendamos tu favorito: ${favProduct.name} 🌟\n\n`;

  for (const p of currentProducts) {
    if (isProductSafe(p, profile?.restrictions) && p.name !== profile?.favorite_product) {
      text += `🍗 ${p.name} - $${p.price}\n`;
    }
  }
  text += "\n¿Qué te gustaría ordenar? 😏";

  // If we have products, always show them (never trigger generic fallback)
  if (safeProducts.length > 0) {
    return text;
  }

  // Only reach here if no products available
  if (shouldUseAI) {
    console.log('[AI DEBUG] input:', message);
    console.log('[AI DEBUG] allergies:', profile?.restrictions || []);
    console.log('[AI DEBUG] products:', safeProducts.map(p => p.name));

    let aiRes = null;

    try {
      aiRes = await getAIResponse(context);
      console.log('[AI DEBUG] response:', aiRes?.message_to_user || 'NO_RESPONSE');
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
