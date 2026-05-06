import { dbGetProducts, dbSaveOrder } from "@/lib/db";
import { getCustomerProfileFromDB } from '@/lib/server/supabaseServer';
import { getEntryRecommendation } from './offerAgent';
import { getAIResponse } from "@/lib/whatsapp/aiService";
import { detectIntent } from './intentDetector';
import { filterProducts, isProductSafe } from '@/core/allergyFilter';
import { extractFoodIntent, rankProductsByIntent } from '@/core/contextRanker';

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

function parseMultiIntent(message: string, safeProducts: any[]) {
  const lower = message.toLowerCase();
  
  // Extract include keywords (after "con", "quiero", "dame", or just at start)
  // Matches things like "quiero papas", "dame alitas", "papas"
  const includeMatch = lower.match(/\b(?:con|quiero|dame|busco)\s+([a-z\s]+?)(?=\s+(?:pero|sin|alergico|no puedo)\s+|$)/i) || 
                       lower.match(/^([a-z\s]+?)(?=\s+(?:sin|pero sin|alergico|no puedo)\s+|$)/i);
  
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
  
  // Filter products using the centralized isProductSafe logic
  const filtered = safeProducts.filter(p => {
    // 1. Must NOT include any exclude word (treat as temporary allergy)
    if (excludeWords.length > 0) {
      if (!isProductSafe(p, excludeWords)) return false;
    }
    
    // 2. Must include at least one include word (if specified)
    if (includeWords.length > 0) {
      // For searching inclusion, we still check name + ingredients
      const searchSpace = `${p.name} ${p.description || ''} ${(p.ingredients || []).join(' ')}`.toLowerCase();
      const hasInclude = includeWords.some(word => searchSpace.includes(word));
      if (!hasInclude) return false;
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
  console.log("[botEngine] PIPELINE START");
  const cleanPhone = phone ? normalizePhone(phone) : undefined;
  
  // 1. Context & Profile
  let profile = null;
  if (cleanPhone) {
    try {
      profile = await getCustomerProfileFromDB(cleanPhone);
    } catch {
      profile = null;
    }
  }

  // 1. Detect Intent and Restrictions
  const nlu = detectIntent(message);
  const intent = nlu.intent;
  
  // MERGE: User stated allergies + Intent-detected restrictions (e.g. "sin salchicha")
  // Also treat strong rejection keywords as temporary restrictions if they match product names
  const detectedRestrictions = nlu.allergies || [];
  if (intent === 'rechazo_fuerte' || intent === 'rechazo') {
    const words = message.toLowerCase().split(/\s+/);
    // Add words that might be products to restrictions
    detectedRestrictions.push(...words.filter(w => w.length > 4)); 
  }

  const allRestrictions = [...new Set([...(profile?.restrictions || []), ...detectedRestrictions])];

  // 4. Fetch & Filter (Strict Safety Layer)
  const products = await dbGetProducts();
  const safeProducts = filterProducts(products as any, allRestrictions);
  
  console.log(`[botEngine] Total: ${products.length} | Safe: ${safeProducts.length}`);
  console.log(`[botEngine] Restrictions:`, allRestrictions);

  // 5. Generate Response using ONLY safeProducts
  let responseText = await buildPersonalizedResponse(message, cleanPhone, safeProducts, profile, products.length, allRestrictions);

  // 6. FINAL SAFETY VALIDATION: Ensure response text doesn't mention prohibited products
  const prohibitedProducts = products.filter(p => !safeProducts.some(sp => sp.id === p.id));
  
  for (const p of prohibitedProducts) {
    const namePattern = new RegExp(`\\b${p.name}\\b`, 'gi');
    if (namePattern.test(responseText)) {
      console.warn(`[SAFETY] Prohibited product "${p.name}" mentioned in response. Sanitizing...`);
      // Replacement logic or just a warning for now? The user said "Validar que la respuesta no contenga"
      // I will replace it with a generic "opción segura" if it leaks
      responseText = responseText.replace(namePattern, '[opción segura]');
    }
  }

  return responseText;
}

async function buildPersonalizedResponse(
  message: string, 
  phone: string | undefined, 
  safeProducts: any[], 
  profile: any, 
  totalCount: number, 
  allRestrictions: string[]
) {
  const lower = message.toLowerCase();
  
  // 1. Intent Detection (Intent only, allergies already handled in pipeline)
  const { intent } = detectIntent(message);

  // 2. Context Ranking (Strictly using safeProducts)
  const foodIntent = extractFoodIntent(message);
  console.log("[INTENT]", foodIntent);
  
  const rankedProducts = rankProductsByIntent(safeProducts, foodIntent);
  console.log("[RANKING] safe:", safeProducts.length, "→ ranked:", rankedProducts.length);
  console.log("[TOP PRODUCTS]", rankedProducts.slice(0, 5).map(p => p.name));
  
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

    // Filter safe products using all restrictions
    const allRestrictions = [...(profile?.restrictions || [])];
    if (currentAllergen && !allRestrictions.includes(currentAllergen)) {
      allRestrictions.push(currentAllergen);
      
      // PERSIST TO SUPABASE
      if (phone) {
        const { upsertCustomerProfile } = await import('@/lib/server/supabaseServer');
        try {
          await upsertCustomerProfile({
            phone: phone,
            restrictions: allRestrictions
          });
          console.log(`[botEngine] Persisted new restriction for ${phone}: ${currentAllergen}`);
        } catch (e) {
          console.warn('[botEngine] Failed to persist restriction', e);
        }
      }
    }

    // Build response
    let response = greeting;

    if (profile?.restrictions?.length) {
      response += `Tienes registradas las siguientes alergias: ${profile.restrictions.join(', ')}. Tomamos todas las precauciones.`;
    } else if (currentAllergen) {
      response += `¡Entendido! Eres alérgico a "${currentAllergen}". Lo anotamos para tu seguridad. 🛡️`;
    }

    const localSafe = safeProducts.slice(0, 5);

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
    const isCompatibleFav = favProduct && isProductSafe(favProduct, allRestrictions);
    return `${greeting}${profile?.favorite_product && isCompatibleFav ? `Tu combo favorito es: ${profile.favorite_product} 🌟` : 'Aún no tengo tu favorito registrado.'}`;
  }

  const wantsCombos =
    lower.includes('combo') ||
    lower.includes('combos') ||
    lower.includes('solo combos');

  if (wantsCombos) {
    const filtered = safeProducts.filter(p => p.category === 'combos');

    // Ensure uniqueness by name
    const uniqueFiltered = Array.from(
      new Map(filtered.map(p => [p.name, p])).values()
    );

    let comboText = `${greeting}🔥 NUESTROS COMBOS 🔥\n\n`;

    for (const p of uniqueFiltered) {
      comboText += `🍗 ${p.name} - $${p.price}\n`;
    }

    comboText += "\n¿Cuál quieres?";

    return comboText;
  }

  // 3. PRODUCT RECOMMENDATION & MENU
  const isConfirming = (lower.includes("si") || lower.includes("sí")) && phone;
  const foundProduct = safeProducts.find(p => lower.includes(p.name.toLowerCase()));
  
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
    if (!order) return "Ups, no encontré tu pedido pendiente. ¿Qué te gustaría ordenar?";
    
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

  if (safeProducts.length === 0) return "Ahorita no tengo productos disponibles compatibles con tus restricciones 😔";

  if (foundProduct) {
    console.log('[botEngine] DIRECT SELECTION:', foundProduct.name);
    const qty = extractQty(message);
    if (qty && phone) {
      const total = foundProduct.price * qty;
      memory.set(phone, { product: foundProduct, qty });
      return `${greeting}🧾 Pedido:\n${qty} x ${foundProduct.name}\n\nTotal: $${total}\n\n¿Confirmas? (sí/no)`;
    }
    return `${greeting}🔥 ${foundProduct.name}\nPrecio: $${foundProduct.price}\n\n¿Cuántas quieres?`;
  }

  if (['duda', 'hambre', 'exploracion'].includes(intent) || /recomienda|sugiere/i.test(message)) {
    let rec: any = await getEntryRecommendation(intent, profile, safeProducts);

    // VALIDACIÓN CRÍTICA: Si rec NO está en safeProducts → RECALCULAR
    if (rec && !safeProducts.some(p => p.id === rec.id)) {
      console.log('[botEngine] ⚠️ REC NOT IN safeProducts:', rec.name, '- Recalculating from rankedProducts...');
      // rankedProducts ya viene de safeProducts, es seguro usar el primero
      rec = rankedProducts[0] || null;
    }

    let responseText = '';

    if (rec) {
      console.log('[botEngine] FINAL RECOMMENDATION:', rec.name);
      const isFav = profile?.favorite_product?.toLowerCase() === rec.name.toLowerCase();
      responseText = `${greeting}${isFav ? '🌟 Basado en tu favorito, te recomiendo:' : '💡 Te recomiendo probar:'}\n\n${rec.name} - $${rec.price}\n${rec.description || ''}\n\n¿Te gustaría ordenar este?`;
    } else {
      // Build menu text
      let text = `${greeting}🔥 MENÚ Snacks 911 🔥\n\n`;
      const favProduct = safeProducts.find(p => p.name === profile?.favorite_product);
      if (favProduct) text += `Te recomendamos tu favorito: ${favProduct.name} 🌟\n\n`;

      for (const p of safeProducts) {
        if (p.name !== profile?.favorite_product) {
          text += `🍗 ${p.name} - $${p.price}\n`;
        }
      }
      text += "\n¿Qué te gustaría ordenar? 😏";
      responseText = text;
    }

    // AI Fallback if needed
    const isGenericIntent = intent === 'other' || !intent;
    if ((safeProducts.length === 0 || isGenericIntent) && !rec && !foundProduct) {
       try {
         const aiRes = await getAIResponse({
           menu_items: safeProducts.map(p => ({ name: p.name, price: p.price, category: p.category })),
           customer_message: message,
           modifiers: [], announcements_active: [], promos_active: [], cart_state: []
         });
         if (aiRes?.message_to_user) responseText = `${greeting}${aiRes.message_to_user}`;
       } catch (e) {
         console.error('[AI FALLBACK]', e);
       }
    }

    // DEBUG MODE: Append info if "DEBUG" is in the message
    if (message.toUpperCase().includes('DEBUG')) {
      const debugInfo = `\n\n--- 🛠 DEBUG MODE ---\n✅ Safe: ${safeProducts.length}/${totalCount}\n🎯 Rec: ${rec?.name || 'None'}\n🛡 Filters: ${allRestrictions.join(', ') || 'None'}`;
      responseText += debugInfo;
    }

    return responseText;
  }

  return `${greeting}Ahorita no tengo productos disponibles compatibles con tus restricciones 😔`;
}
