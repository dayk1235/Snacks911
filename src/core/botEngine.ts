import { getCustomerProfileFromDB, dbSaveOrder, createUuid, saveAiLog, checkCartAbandonment } from "@/lib/db.server";
import { getEntryRecommendation } from "./offerAgent";
// const isTest = process.env.NODE_ENV === "test"; // Removed: Use direct check
import { getAIResponse } from "@/lib/whatsapp/aiService";
import { detectIntent } from "./intentDetector";
import { filterProducts, isProductSafe } from "@/core/allergyFilter";
import { extractFoodIntent, rankProductsByIntent } from "@/core/contextRanker";
import { addToCart, getCartSummary } from "./cartEngine";
import { getContext, clearContext, updateContext } from './context';
import { handleMessageModular, INITIAL_STATE } from "./responseEngine";
import { registerErrorEvent, getSystemMode, type SystemMode } from "./selfHealingEngine";
import { isGreetingOnly } from "./nluBaseline";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const ABANDONMENT_WINDOW_MS = 2 * 60_000; // 2 minutes

const memory = new Map<string, { product: any; qty: number }>();

function extractQty(text: string) {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/la |el |los |las |un |una /g, "")
    .trim();
}

function parseMultiIntent(message: string, safeProducts: any[]) {
  const lower = message.toLowerCase();

  // Extract include keywords (after "con", "quiero", "dame", or just at start)
  // Matches things like "quiero papas", "dame alitas", "papas"
  const includeMatch =
    lower.match(
      /\b(?:con|quiero|dame|busco)\s+([a-z\s]+?)(?=\s+(?:pero|sin|alergico|no puedo)\s+|$)/i,
    ) ||
    lower.match(/^([a-z\s]+?)(?=\s+(?:sin|pero sin|alergico|no puedo)\s+|$)/i);

  let includeWords: string[] = [];
  if (includeMatch) {
    includeWords = includeMatch[1]
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  // Extract exclude keywords (after "sin", "pero sin")
  const excludeMatch = lower.match(/(?:sin|pero sin)\s+([a-z\s]+?)(?:\s+|$)/i);
  let excludeWords: string[] = [];
  if (excludeMatch) {
    excludeWords = excludeMatch[1]
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  // If no specific include/exclude keywords found, return null
  if (!includeWords.length && !excludeWords.length) return null;

  // Filter products using the centralized isProductSafe logic
  const filtered = safeProducts.filter((p) => {
    // 1. Must NOT include any exclude word (treat as temporary allergy)
    if (excludeWords.length > 0) {
      if (!isProductSafe(p, excludeWords)) return false;
    }

    // 2. Must include at least one include word (if specified)
    if (includeWords.length > 0) {
      // For searching inclusion, we still check name + ingredients
      const searchSpace =
        `${p.name} ${p.description || ""} ${(p.ingredients || []).join(" ")}`.toLowerCase();
      const hasInclude = includeWords.some((word) =>
        searchSpace.includes(word),
      );
      if (!hasInclude) return false;
    }

    return true;
  });

  return {
    products: filtered.slice(0, 4),
    includeWords,
    excludeWords,
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

async function dbGetProductsSafe() {
  const fallback = [
    { id: '1', name: 'Papas Loaded', price: 69, category: 'papas', imageUrl: '', available: true, description: '', ingredients: [] },
    { id: '2', name: 'Refresco 600ml', price: 25, category: 'bebidas', imageUrl: '', available: true, description: '', ingredients: [] },
    { id: '3', name: 'Brownie con Helado', price: 59, category: 'postres', imageUrl: '', available: true, description: '', ingredients: [] },
    { id: '4', name: 'Combo 911', price: 119, category: 'combos', imageUrl: '', available: true, description: '', ingredients: [] },
    { id: '5', name: 'Boneless', price: 129, category: 'boneless', imageUrl: '', available: true, description: '10 piezas de boneless', ingredients: [] },
    { id: '6', name: 'Combo Mixto', price: 189, category: 'combos', imageUrl: '', available: true, description: 'Boneless + Papas', ingredients: [] },
  ];

  try {
    const res = await fetch(`${BASE}/api/products?all=true`);
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
    
    // Auto-unwrap if object contains products array
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (Array.isArray(data.products)) return data.products;
      if (Array.isArray(data.data)) return data.data;
    }
    
    return Array.isArray(data) ? data : fallback;
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error('[botEngine] dbGetProductsSafe failed:', err);
    }
    return fallback;
  }
}

function classifyError(error: unknown): string {
  const msg = String(error).toLowerCase();
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnrefused')) return 'NETWORK';
  if (msg.includes('auth') || msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized')) return 'AUTH';
  if (msg.includes('supabase') || msg.includes('database') || msg.includes('sql')) return 'DATABASE';
  if (msg.includes('timeout') || msg.includes('timed out')) return 'TIMEOUT';
  if (msg.includes('parse') || msg.includes('syntax') || msg.includes('json')) return 'PARSE';
  return 'UNKNOWN';
}

export async function getBotResponse({
  message,
  phone,
  tenantId,
}: {
  message: string;
  phone?: string;
  tenantId?: string;
}) {
  const isWeb = phone === 'web-user';
  const cleanPhone = phone ? normalizePhone(phone) : "anonymous";
  const activeTenantId = tenantId || 'snacks911'; // Fallback for existing tests
  const traceId = `${cleanPhone}-${activeTenantId}-${Date.now()}`;

  if (process.env.NODE_ENV !== "test") {
    console.log(JSON.stringify({
      event: 'PIPELINE_START',
      phone: cleanPhone,
      isWeb,
      traceId,
      timestamp: Date.now(),
    }));
  }

  try {
    // 0. Resolve Tenant Info
    let businessName = 'Snacks 911';
    try {
      const { getTenantBySlug } = await import('@/lib/tenant/tenantResolver');
      const tenant = await getTenantBySlug(activeTenantId);
      if (tenant) {
        businessName = tenant.business_name;
      }
    } catch (e) {
      console.warn("[botEngine] Tenant resolution failed, using default");
    }

    const context = getContext(cleanPhone, activeTenantId, businessName);

  // Fetch memory before generating response (Skip if no base URL or in test)
  let memoryData: any = {};
  if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NODE_ENV !== 'test') {
    try {
      const memoryRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/memory?phone=${cleanPhone}`
      );
      if (memoryRes.ok) {
        memoryData = await memoryRes.json();
      }
    } catch (e) {
      console.error(JSON.stringify({
        event: 'MEMORY_FETCH_ERROR',
        phone: cleanPhone,
        error: String(e),
        timestamp: Date.now(),
      }));
    }
  }

  if (isGreetingOnly(message)) {
    if (context?.cart?.items?.length > 5) {
      context.cart = { items: [], total: 0 };
    }

    return {
      text: `¡Hola! 👋\n¿Quieres ver el menú o te recomiendo algo de *${context.businessName}*? 🔥`,
      intent: 'SHOW_MENU',
      cart: context.cart,
      type: 'text',
      nextState: context
    };
  }

  // Context already loaded via getContext(cleanPhone) above
  // Check for negative inputs before processing
  const negativeInputs = ['no', 'nop', 'nel', 'no gracias'];
  if (negativeInputs.includes(message.trim().toLowerCase())) {
    return {
      text: 'Perfecto 👍\n\n¿Quieres ver el menú o algo más?',
      intent: 'NEGATIVE',
      cart: context.cart,
      type: 'text',
      nextState: context
    };
  }

  // Check for confirmation words without context
  const confirmWords = ['si', 'sí', 'va', 'dale', 'lo quiero'];
  if (confirmWords.includes(message.trim().toLowerCase())) {
    if (!context.cart.items.length) {
      return {
        text: 'Primero agrega algo a tu pedido 😅',
        intent: 'UNKNOWN',
        cart: context.cart,
        type: 'text',
        nextState: context
      };
    }
  }

  // 1. Context & Profile
  let profile = null;
  if (cleanPhone && cleanPhone !== "anonymous") {
    try {
      profile = await getCustomerProfileFromDB(cleanPhone);
    } catch {
      profile = null;
    }
  }

  // 1. Detect Intent and Restrictions
  const nlu = detectIntent(message, context);
  let intent = nlu.intent;

  // MERGE: User stated allergies + Intent-detected restrictions (e.g. "sin salchicha")
  // Also treat strong rejection keywords as temporary restrictions if they match product names
  const detectedRestrictions = nlu.allergies || [];
  if (intent === "rechazo_fuerte" || intent === "rechazo") {
    const words = message.toLowerCase().split(/\s+/);
    // Add words that might be products to restrictions
    detectedRestrictions.push(...words.filter((w) => w.length > 4));
  }

  const allRestrictions = [
    ...new Set([...(profile?.restrictions || []), ...detectedRestrictions]),
  ];

  // 4. Fetch & Filter (Strict Safety Layer)
  let products = await dbGetProductsSafe();
  if (!Array.isArray(products)) {
    console.warn("[botEngine] products is not an array, defaulting to empty");
    products = [];
  }
  const safeProducts = filterProducts(products as any, allRestrictions);

  if (process.env.NODE_ENV !== "test") {
    console.log(JSON.stringify({
      event: 'PRODUCTS_FILTERED',
      total: products.length,
      safe: safeProducts.length,
      timestamp: Date.now(),
    }));
    console.log(JSON.stringify({
      event: 'RESTRICTIONS',
      restrictions: allRestrictions,
      timestamp: Date.now(),
    }));
  }

  // 5. Generate Response using the NEW Modular Sales Engine
  // Map UserContext to ConversationState to satisfy handleMessageModular requirements
  const conversationState = {
    ...INITIAL_STATE,
    ...context,
    stage: context.flowState || (context as any).state || INITIAL_STATE.stage,
    allergies: allRestrictions,
  } as any; // Cast as any to avoid strict structural mismatch if interfaces vary slightly

  const modularRes = await handleMessageModular(
    message,
    conversationState,
    {} as import("./types").ProductRefs,
    undefined,
    products as any
  );
  
  let responseText = modularRes.text;

  // Use memory to personalize response
  if (memoryData?.favorite_product) {
    responseText = `🔥 Sé que te gusta ${memoryData.favorite_product}\n\n` + responseText;
  }

  const finalIntent = modularRes.nextState.lastIntent || intent;

  // Estimate tokens and cost (non-blocking)
  const tokens_input = Math.ceil(message.length / 4);
  const tokens_output = Math.ceil(responseText.length / 4);
  const cost = (tokens_input + tokens_output) * 0.000002;

  if (process.env.NODE_ENV !== "test") {
    console.log(`[COST] $${cost.toFixed(6)} | Tokens: ${tokens_input + tokens_output} | Intent: ${finalIntent}`);
  }

  // Fire-and-forget persistence
  if (process.env.NODE_ENV !== "test") {
    import("@/lib/db.server").then(({ saveAiCost }) => {
      saveAiCost({
        user_id: cleanPhone,
        tokens_input,
        tokens_output,
        cost,
        intent: finalIntent
      }).catch(e => console.error("[COST SAVE ERROR]", e));
    }).catch(() => {});
  }

  // 6. FINAL SAFETY VALIDATION: Ensure response text doesn't mention prohibited products
  const safeProductsArr = Array.isArray(products) ? products : [];
  const prohibitedProducts = safeProductsArr.filter(
    (p: any) => !safeProducts.some((sp: any) => sp.id === p.id),
  );

  for (const p of prohibitedProducts) {
    const namePattern = new RegExp(`\\b${p.name}\\b`, "gi");
    if (namePattern.test(responseText)) {
      console.warn(JSON.stringify({
        event: 'SAFETY_WARNING',
        product: p.name,
        action: 'sanitizing',
        timestamp: Date.now(),
      }));
      // Replacement logic or just a warning for now? The user said "Validar que la respuesta no contenga"
      // I will replace it with a generic "opción segura" if it leaks
      responseText = responseText.replace(namePattern, "[opción segura]");
    }
  }

  if (cleanPhone) {
    updateContext(cleanPhone, { lastIntent: intent });
  }

  if (process.env.NODE_ENV !== "test") {
    console.log(JSON.stringify({
      traceId,
      userId: cleanPhone,
      channel: phone === 'web-user' ? 'web' : 'whatsapp',
      input: message,
      intent,
      flowState: modularRes.nextState?.stage || null,
      cart: modularRes.nextState?.cart || [],
      total: modularRes.nextState?.cartTotal || 0,
      productsShown: modularRes.nextState?.lastProductsShown || [],
      timestamp: Date.now()
    }, null, 2));
  }

  try {
    await saveAiLog({
      traceId,
      userId: cleanPhone,
      channel: phone === 'web-user' ? 'web' : 'whatsapp',
      input: message,
      intent,
      flowState: modularRes.nextState?.stage,
      cart: modularRes.nextState?.cart,
      total: modularRes.nextState?.cartTotal,
      productsShown: modularRes.nextState?.lastProductsShown
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "test") {
      console.error(JSON.stringify({
        event: 'LOG_SAVE_FAILED',
        error: String(e),
        timestamp: Date.now(),
      }));
    }
  }

  // Fire-and-forget: check for abandoned cart (non-blocking)
  if (process.env.NODE_ENV !== "test" && intent !== 'CONFIRM_ORDER' && intent !== 'VIEW_CART') {
    checkCartAbandonment(cleanPhone, ABANDONMENT_WINDOW_MS).then(async (result) => {
      if (result.abandoned) {
        try {
          await saveAiLog({
            traceId: `${cleanPhone}-${Date.now()}`,
            userId: cleanPhone,
            channel: phone === 'web-user' ? 'web' : 'whatsapp',
            input: message,
            intent: 'ABANDONED_CART',
            flowState: null,
            cart: [],
            total: result.cartValue || 0,
            productsShown: [],
            sessionStatus: 'ABANDONED',
          });
          console.log(JSON.stringify({
            event: 'ABANDONED_CART_DETECTED',
            userId: cleanPhone,
            cartValue: result.cartValue,
            lastCartAt: result.lastCartAt,
            timestamp: Date.now(),
          }));
        } catch (abandonErr) {
          console.error(JSON.stringify({
            event: 'ABANDONED_LOG_FAILED',
            error: String(abandonErr),
            timestamp: Date.now(),
          }));
        }
      }
    }).catch(() => {});
  }

    return {
      text: responseText, 
      intent,
      cart: modularRes.nextState.cart,
      type: modularRes.type,
      actions: modularRes.actions,
      nextState: modularRes.nextState
    };
  } catch (error) {
    const errorType = classifyError(error);
    if (process.env.NODE_ENV !== "test") {
      console.error(JSON.stringify({
        event: 'FATAL_ERROR',
        errorType,
        error: String(error),
        traceId,
        phone: cleanPhone,
        timestamp: Date.now(),
      }));
    } else {
      console.error("[TEST FATAL ERROR]:", error);
    }

    registerErrorEvent(errorType, 'botEngine');

    try {
      await saveAiLog({
        traceId,
        userId: cleanPhone,
        channel: phone === 'web-user' ? 'web' : 'whatsapp',
        input: message,
        intent: 'ERROR',
        flowState: null,
        cart: [],
        total: 0,
        productsShown: [],
        error: `[${errorType}] ${String(error)}`,
      });
    } catch (logError) {
      console.error(JSON.stringify({
        event: 'LOG_SAVE_FAILED',
        error: String(logError),
        timestamp: Date.now(),
      }));
    }

    const systemMode = await getSystemMode();

    console.warn(JSON.stringify({
      event: 'SYSTEM_MODE_CHANGE',
      mode: systemMode,
      timestamp: Date.now(),
    }));

    const fallbackMap: Record<SystemMode, string> = {
      NORMAL: '¡Hola! 🔥 ¿En qué te puedo ayudar hoy?',
      SAFE_MODE: '⚡ Tuvimos un detalle, pero seguimos 🔥\n👉 Combo Mixto 911 — $249\n¿Te lo preparo?',
      EMERGENCY_MODE: '🔥 Snacks 911 — $249 el combo más pedido. Escríbenos por WhatsApp: 55-8450-7458',
    };

    return {
      text: fallbackMap[systemMode],
      intent: "ERROR",
      cart: { items: [], total: 0 },
      type: "text",
      nextState: getContext(cleanPhone)
    };
  }
}

export async function buildPersonalizedResponse(
  message: string,
  phone: string | undefined,
  safeProducts: any[],
  profile: any,
  totalCount: number,
  allRestrictions: string[],
  context?: any,
) {
  const lower = message.toLowerCase();

  // 1. Intent Detection (Intent only, allergies already handled in pipeline)
  const { intent } = detectIntent(message);

  if ((intent === "CONFIRM_ORDER" || intent === "VIEW_CART") && phone) {
    const ctx = getContext(phone);
    if (!ctx.cart.items || ctx.cart.items.length === 0) {
      return "No tienes productos en tu pedido todavía 😅\n¿Quieres agregar algo?";
    }
  }

  // 2. Context Ranking (Strictly using safeProducts)
  const foodIntent = extractFoodIntent(message);
  console.log(JSON.stringify({
    event: 'FOOD_INTENT',
    intent: foodIntent,
    phone: phone || 'anonymous',
    timestamp: Date.now(),
  }));

  const rankedProducts = rankProductsByIntent(safeProducts, foodIntent);
  console.log(JSON.stringify({
    event: 'RANKING',
    safeCount: safeProducts.length,
    rankedCount: rankedProducts.length,
    timestamp: Date.now(),
  }));
  console.log(JSON.stringify({
    event: 'TOP_PRODUCTS',
    top5: rankedProducts.slice(0, 5).map((p) => p.name),
    timestamp: Date.now(),
  }));

  if (intent === "ADD_TO_CART" && phone) {
    const ctx = getContext(phone);
    const productToAdd = rankedProducts[0] || safeProducts[0];

    if (productToAdd) {
      addToCart(ctx, productToAdd);
      return `Agregado a tu pedido ✅\nTotal: $${ctx.cart.total}\n\n¿Quieres algo más?`;
    }
  }

  if (intent === "VIEW_CART" && phone) {
    const ctx = getContext(phone);
    return getCartSummary(ctx) + "\n\n¿Confirmamos?";
  }

  if (intent === "CONFIRM_ORDER" && phone) {
    const ctx = getContext(phone);
    if (ctx.cart.items.length > 0) {
      await dbSaveOrder({
        id: createUuid(),
        status: "pending",
        channel: "WHATSAPP",
        total: ctx.cart.total,
        createdAt: new Date().toISOString(),
        customerPhone: phone,
        customerName: profile?.name || "WhatsApp User",
        whatsappConfirmed: true,
        items: ctx.cart.items.map((i: any) => ({
          productId: String(i.id),
          productName: i.name,
          quantity: i.qty,
          price: i.price
        }))
      });
      clearContext(phone);
      return "✅ Pedido confirmado. En breve te contactamos 🙌";
    }
  }

  // MULTI-INTENT: Parse "quiero X pero sin Y"
  const multiIntent = parseMultiIntent(message, safeProducts);

  const isGreeting = isGreetingOnly(message);

  if (isGreeting) {
    if (profile?.name) {
      return `¡Hola ${profile.name}! 👋\n¿Quieres ver el menú o te recomiendo algo? 🔥`;
    } else {
      return `¡Hola! 👋\n¿Quieres ver el menú o te recomiendo algo? 🔥`;
    }
  }

  // Greeting Logic: Only show if no context or >10 minutes
  const TEN_MINUTES = 10 * 60 * 1000;
  const lastInteraction = context?.lastInteraction || 0;
  const isNewSession = !context?.lastIntent || (Date.now() - lastInteraction > TEN_MINUTES);

  let greeting = "";
  if (isNewSession) {
    if (profile?.name) {
      greeting = `¡Hola ${profile.name}! 👋\n\n`;
    } else {
      greeting = `¡Hola! 👋\n\n`;
    }
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
    let currentAllergen = "";
    const match = message.match(/a\s+(.+)/i);
    if (match) {
      currentAllergen = match[1]
        .toLowerCase()
        .replace(/^la\s+|^el\s+|^los\s+|^las\s+/gi, "")
        .replace(/(soy|tengo|sufro de)/gi, "")
        .replace(/(alergia a|alergico a|alérgico a)/gi, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim();
    }

    // Filter safe products using all restrictions
    const allRestrictions = [...(profile?.restrictions || [])];
    if (currentAllergen && !allRestrictions.includes(currentAllergen)) {
      allRestrictions.push(currentAllergen);

      // PERSIST TO SUPABASE
      if (phone) {
        const { upsertCustomerProfile } =
          await import("@/lib/server/supabaseServer");
        try {
          await upsertCustomerProfile({
            phone: phone,
            restrictions: allRestrictions,
          });
          console.log(JSON.stringify({
            event: 'RESTRICTION_PERSISTED',
            phone: phone,
            restriction: currentAllergen,
            timestamp: Date.now(),
          }));
        } catch (e) {
          console.warn(JSON.stringify({
            event: 'RESTRICTION_PERSIST_FAILED',
            error: String(e),
            phone: phone,
            timestamp: Date.now(),
          }));
        }
      }
    }

    // Build response
    let response = greeting;

    if (profile?.restrictions?.length) {
      response += `Tienes registradas las siguientes alergias: ${profile.restrictions.join(", ")}. Tomamos todas las precauciones.`;
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
    const favProduct = safeProducts.find(
      (p) => p.name === profile?.favorite_product,
    );
    const isCompatibleFav =
      favProduct && isProductSafe(favProduct, allRestrictions);
    return `${greeting}${profile?.favorite_product && isCompatibleFav ? `Tu combo favorito es: ${profile.favorite_product} 🌟` : "Aún no tengo tu favorito registrado."}`;
  }

  const wantsCombos =
    lower.includes("combo") ||
    lower.includes("combos") ||
    lower.includes("solo combos");

  if (wantsCombos) {
    const filtered = safeProducts.filter((p) => p.category === "combos");

    // Ensure uniqueness by name
    const uniqueFiltered = Array.from(
      new Map(filtered.map((p) => [p.name, p])).values(),
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
  const foundProduct = safeProducts.find((p) =>
    lower.includes(p.name.toLowerCase()),
  );

  // FALLBACK TRIGGER: Only if NO intent AND NO safe products available
  const isGenericIntent = intent === "other" || !intent;
  const shouldUseAI = isGenericIntent && safeProducts.length === 0;

  // Fix: Only confirm if order actually exists in memory
  const isConfirmingWithOrder = isConfirming && memory.has(phone);

  const aiContext = {
    menu_items: safeProducts.map((p) => ({
      name: p.name,
      price: p.price,
      category: p.category,
    })),
    modifiers: [],
    announcements_active: [],
    promos_active: [],
    cart_state: [],
    customer_message: message,
  };

  if (isConfirmingWithOrder) {
    const order = memory.get(phone);
    if (!order)
      return "Ups, no encontré tu pedido pendiente. ¿Qué te gustaría ordenar?";

    try {
      await dbSaveOrder({
        id: "",
        status: "pending",
        channel: "WHATSAPP",
        whatsappConfirmed: true,
        items: [
          {
            productId: "",
            productName: order.product.name,
            quantity: order.qty,
            price: order.product.price,
          },
        ],
        total: order.product.price * order.qty,
        createdAt: new Date().toISOString(),
        customerName: profile?.name || "WhatsApp",
        customerPhone: phone,
      });
      memory.delete(phone);
      return "✅ Pedido confirmado. En breve te contactamos 🙌";
    } catch (e) {
      console.error(JSON.stringify({
        event: 'ORDER_SAVE_ERROR',
        error: String(e),
        phone: phone,
        timestamp: Date.now(),
      }));
      return "Tuve un problema guardando tu pedido 😔";
    }
  }

  if (safeProducts.length === 0)
    return "Ahorita no tengo productos disponibles compatibles con tus restricciones 😔";

  if (foundProduct) {
    console.log(JSON.stringify({
      event: 'DIRECT_SELECTION',
      product: foundProduct.name,
      phone: phone || 'anonymous',
      timestamp: Date.now(),
    }));
    const qty = extractQty(message);
    if (qty && phone) {
      const total = foundProduct.price * qty;
      memory.set(phone, { product: foundProduct, qty });
      return `${greeting}🧾 Pedido:\n${qty} x ${foundProduct.name}\n\nTotal: $${total}\n\n¿Confirmas? (sí/no)`;
    }
    return `${greeting}🔥 ${foundProduct.name}\nPrecio: $${foundProduct.price}\n\n¿Cuántas quieres?`;
  }

  if (
    ["duda", "hambre", "exploracion", "RECOMMEND", "SHOW_MENU", "SHOW_CATEGORY"].includes(intent) ||
    /recomienda|sugiere|no se/i.test(message)
  ) {
    const preferList = ["SHOW_MENU", "SHOW_CATEGORY", "exploracion", "list_products"].includes(intent);
    let rec: any = preferList ? null : await getEntryRecommendation(intent, profile, safeProducts);

    // VALIDACIÓN CRÍTICA: Si rec NO está en safeProducts → RECALCULAR
    if (rec && !safeProducts.some((p) => p.id === rec.id)) {
      console.log(JSON.stringify({
        event: 'RECALCULATING_SAFE_PRODUCT',
        product: rec.name,
        reason: 'not in safeProducts',
        timestamp: Date.now(),
      }));
      // rankedProducts ya viene de safeProducts, es seguro usar el primero
      rec = rankedProducts[0] || null;
    }

    let responseText = "";

    if (rec) {
      console.log(JSON.stringify({
        event: 'FINAL_RECOMMENDATION',
        product: rec.name,
        timestamp: Date.now(),
      }));
      const isFav =
        profile?.favorite_product?.toLowerCase() === rec.name.toLowerCase();
      responseText = `${greeting}${isFav ? "🌟 Basado en tu favorito, te recomiendo:" : "💡 Te recomiendo probar:"}\n\n${rec.name} - $${rec.price}\n${rec.description || ""}\n\n¿Te gustaría ordenar este?`;
    } else {
      // Build menu text
      let text = `${greeting}🔥 MENÚ ${context.businessName} 🔥\n\n`;
      const favProduct = safeProducts.find(
        (p) => p.name === profile?.favorite_product,
      );
      if (favProduct)
        text += `Te recomendamos tu favorito: ${favProduct.name} 🌟\n\n`;

      for (const p of safeProducts) {
        if (p.name !== profile?.favorite_product) {
          text += `🍗 ${p.name} - $${p.price}\n`;
        }
      }
      text += "\n¿Qué te gustaría ordenar? 😏";
      responseText = text;
    }

    // AI Fallback if needed
    const isGenericIntent = intent === "other" || !intent;
    if (
      (safeProducts.length === 0 || isGenericIntent) &&
      !rec &&
      !foundProduct
    ) {
      try {
        const aiRes = await getAIResponse({
          menu_items: safeProducts.map((p) => ({
            name: p.name,
            price: p.price,
            category: p.category,
          })),
          customer_message: message,
          modifiers: [],
          announcements_active: [],
          promos_active: [],
          cart_state: [],
        });
        if (aiRes?.message_to_user)
          responseText = `${greeting}${aiRes.message_to_user}`;
      } catch (e) {
        console.error(JSON.stringify({
          event: 'AI_FALLBACK_ERROR',
          error: String(e),
          timestamp: Date.now(),
        }));
      }
    }

    // DEBUG MODE: Append info if "DEBUG" is in the message
    if (message.toUpperCase().includes("DEBUG")) {
      const debugInfo = `\n\n--- 🛠 DEBUG MODE ---\n✅ Safe: ${safeProducts.length}/${totalCount}\n🎯 Rec: ${rec?.name || "None"}\n🛡 Filters: ${allRestrictions.join(", ") || "None"}`;
      responseText += debugInfo;
    }

    return responseText;
  }

  return `${greeting}Ahorita no tengo productos disponibles compatibles con tus restricciones 😔`;
}
