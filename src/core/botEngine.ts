import { getContext, updateContext } from "./context";
import { processWithRouter } from "./ai/multiModelRouter";
import { getUnifiedIntent } from "./intentDetector";
import { addToCart, clearCartContext, removeFromCartContext } from "./cartEngine";
import { dbSaveOrder } from "@/lib/db.server";
import { isGreetingOnly } from "./nluBaseline";
import type { Action, UICard, UICart, BotUI } from "./types";
import { getProductImage, products as staticProducts } from "@/data/products";
import { getBestUpsell } from "./offerAgent";
import { resolveAction, ActionDecision } from "./actionResolver";
import * as flowEngine from "@/ai/runtime/flowEngine";
import { getCustomerData, recordPurchase } from "@/lib/customerMemory";
import { getCacheKey, getCachedResponse, setCachedResponse, isInDegradedMode, recordAIFailure, recordAISuccess } from "@/lib/responseCache";

function getProductImageUrl(product: any): string {
  return product.image_url || product.imageUrl || product.image || getProductImage(product) || '';
}

/**
 * Executes deterministic business actions mapped from intents.
 */
function executeAction(action: string, entities: any, context: any, availableProducts: any[]) {
  switch (action) {
    case 'add_to_cart':
      if (entities?.product?.value) {
        const prod = availableProducts.find(p => 
          p.name.toLowerCase().includes(entities.product.value.toLowerCase())
        );
        if (prod) {
          addToCart(context, prod);
          return { success: true, message: `✅ Añadido: ${prod.name}` };
        }
      }
      return { success: false, message: "❌ No encontré el producto exacto" };
      
    case 'remove_from_cart':
      if (entities?.product?.value) {
        removeFromCartContext(context, entities.product.value);
        return { success: true, message: `🗑️ Quitamos ${entities.product.value} del carrito` };
      }
      return { success: false };

    case 'clear_cart':
      clearCartContext(context);
      return { success: true, message: "🧹 Carrito limpio" };

    case 'show_menu':
      return { success: true, message: "📋 Aquí tienes nuestro menú completo:" };

    case 'checkout':
      if (!context.cart?.items?.length) {
        return { success: true, message: "Tu carrito está vacío por ahora. Agrega algo antes de confirmar." };
      }
      return { success: true, message: `🚀 ¡Excelente! Vamos a cerrar tu pedido. Total: $${context.cart.total}` };

    case 'greet':
      return { success: true, message: "👋 ¡Hola! ¿Qué se te antoja hoy?" };

    case 'view_cart':
      const cartSummary = buildCartSummaryResponse(context);
      return {
        success: true,
        message: cartSummary.text,
        ui: cartSummary.ui,
        actions: cartSummary.actions
      };

    default:
      return { success: false };
  }
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

async function dbGetProductsSafe() {
  if (process.env.NODE_ENV === 'test') {
    return [
      { id: '1', name: "Combo Mixto 911", category: "combos", price: 249, available: true, stock: -1 },
      { id: '2', name: "Refresco", category: "bebidas", price: 25, available: true, stock: -1 },
      { id: '3', name: "Dip BBQ", category: "extras", price: 12, available: true, stock: -1 },
      { id: '7', name: "Papas 911 Loaded", category: "papas", price: 149, available: true, stock: -1 },
      { id: '8', name: "Boneless 250g", category: "proteina", price: 139, available: true, stock: -1 },
      { id: '9', name: "Alitas 6 piezas", category: "proteina", price: 125, available: true, stock: -1 }
    ];
  }

  try {
    const res = await fetch(`${BASE}/api/products?all=true`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    let products: any[] = [];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      products = data.products || data.data || [];
    } else {
      products = Array.isArray(data) ? data : [];
    }
    
    if (products.length === 0) {
      console.warn('[botEngine] No products returned from DB, using static data as last resort.');
      return staticProducts.map(p => ({ ...p, id: String(p.id), available: p.available !== false, category: p.category?.toLowerCase() }));
    }
    
    return products.map(p => ({
      ...p,
      id: String(p.id),
      available: p.available !== false && p.stock !== 0,
      category: p.category?.toLowerCase()
    }));
  } catch (err) {
    console.error('[botEngine] dbGetProductsSafe critical failure:', (err as Error)?.message);
    // Return static as emergency only
    return staticProducts.map(p => ({ ...p, id: String(p.id), available: p.available !== false, category: p.category?.toLowerCase() }));
  }
}

export async function getBotResponse({
  message,
  phone,
  tenantId,
  initialCart,
}: {
  message: string;
  phone?: string;
  tenantId?: string;
  initialCart?: any;
}) {
  const isWeb = phone === 'web-user';
  const cleanPhone = phone ? normalizePhone(phone) : 'anonymous';
  const activeTenantId = tenantId || 'snacks911';

  // 1. Resolve Tenant Context
  let businessName = 'Snacks 911';
  try {
    const { getTenantBySlug } = await import('@/lib/tenant/tenantResolver');
    const tenant = await getTenantBySlug(activeTenantId);
    if (tenant) {
      businessName = tenant.business_name;
    }
  } catch (e) {
    console.error('[botEngine] Error resolving tenant:', e);
  }

  // 2. Load Context & Products
  const context = getContext(cleanPhone, activeTenantId, businessName);
  
  // Sync context cart with initialCart (from web client or upstream)
  if (initialCart?.items) {
    context.cart = initialCart;
  }

  const allProducts = await dbGetProductsSafe();
  const availableProducts = allProducts.filter((p: any) => p.available !== false && p.stock !== 0);

  // 4. Shortcut: respond instantly to simple greetings without calling the AI
  if (isGreetingOnly(message)) {
    const customer = getCustomerData();
    const name = customer.name || '';
    const lastItems = customer.lastPurchasedIds || [];

    let greeting = '';
    const actions: Action[] = [];

    if (name) {
      greeting = lastItems.length > 0
        ? `¡Qué onda ${name}! 🔥 ¿Te doy lo de siempre o quieres probar algo nuevo?`
        : `¡Qué onda ${name}! 🔥 ¿Qué se te antoja hoy?`;
    } else {
      const genericGreetings = [
        `¡Hola! 👋 Bienvenid@ a ${businessName}. ¿Qué se te antoja hoy?`,
        `¡Qué onda! 🔥 Soy tu asistente de ${businessName}. ¿Qué se te antoja hoy?`,
        `¡Hey! Bienvenid@ a ${businessName}. Dime qué te provoca y te lo preparo. 🍟`,
      ];
      greeting = genericGreetings[Math.floor(Math.random() * genericGreetings.length)];
    }

    if (lastItems.length > 0) {
      actions.push({ id: 'reorder', label: '🔄 Lo de siempre', type: 'recommend', value: 'quiero lo de siempre' });
    }
    
    actions.push({ id: 'greet-combos', label: '🔥 Ver combos', type: 'show_category', value: 'ver combos' });
    actions.push({ id: 'greet-menu', label: '📋 Ver menú', type: 'show_category', value: 'ver menu' });

    return {
      text: greeting,
      cart: context.cart,
      type: 'buttons',
      actions: actions,
      ui: lastItems.length > 0 ? {
        cards: lastItems.map((id: any) => {
          const p = allProducts.find((prod: any) => String(prod.id) === String(id));
          return p ? {
            id: String(p.id),
            title: p.name,
            description: 'Lo que pediste la última vez ✨',
            price: p.price,
            imageUrl: getProductImageUrl(p)
          } : null;
        }).filter(Boolean).slice(0, 2)
      } : null
    };
  }

  // 4.1 Guided clarification for vague intents
  const vagueKeywords = ['quiero algo', 'qué recomiendas', 'que recomiendas', 'tengo hambre', 'recomiendame algo', 'recomiéndame algo', 'que hay de bueno', 'que tienes'];
  const isVagueDetection = vagueKeywords.some(k => message.toLowerCase().includes(k)) && 
                           !allProducts.some((p: any) => message.toLowerCase().includes(p.name.toLowerCase()));

  if (isVagueDetection && context.state !== 'awaiting_vague_clarification') {
    updateContext(cleanPhone, { state: 'awaiting_vague_clarification' });
    return {
      text: '¿Se te antoja algo más 🔥 salado o dulce?',
      cart: context.cart,
      type: 'buttons',
      actions: [
        { id: 'vague-salado', label: 'Salado 🍟', type: 'recommend', value: 'salado' },
        { id: 'vague-dulce', label: 'Dulce 🍫', type: 'recommend', value: 'dulce' },
      ],
      ui: null
    };
  }

  if (context.state === 'awaiting_vague_clarification') {
    const isSweet = /dulce|postre|azucar/i.test(message);
    const isSalty = /salado|papas|alitas|boneless|hambre|comida/i.test(message);

    if (isSweet || isSalty) {
      const category = isSweet ? 'postre' : 'combos';
      const filtered = allProducts.filter((p: any) => p.category === category && p.available).slice(0, 4);
      updateContext(cleanPhone, { state: 'inicio' });
      return {
        text: isSweet 
          ? '¡Excelente elección! Aquí tienes nuestros postres más top para quitarte el antojo: 🍫'
          : '¡Uff, perfecto! Para ese hambre feroz, te recomiendo estos combos: 🔥',
        cart: context.cart,
        type: 'products',
        actions: [
          { id: 'view-menu', label: '📋 Ver todo el menú', type: 'show_category', value: 'ver menú' },
        ],
        ui: {
          cards: filtered.map((p: any) => ({
            id: String(p.id),
            title: p.name,
            description: p.description,
            price: p.price,
            imageUrl: getProductImageUrl(p)
          }))
        }
      };
    }
  }

  // 4.2 Complement follow-up shortcut (y algo más, algo más, qué más)
  const isComplementFollowUp = /^(y\s+)?(algo|qu[eé])\s+m[aá]s\b|^(algo|qu[eé])\s+adicional|para\s+acompa[ñn]ar|y\s+qu[eé]\s+(me\s+)?(recomiendas|sugieres|pones|das)/i.test(message) &&
    context.cart?.items?.length > 0;

  if (isComplementFollowUp) {
    const complements = getSmartComplements(context.cart.items, availableProducts);

    const cartNames = context.cart.items.map((i: any) => i.name).join(' y ').toLowerCase();
    const hasProtein = context.cart.items.some((i: any) => {
      const p = availableProducts.find((prod: any) => String(prod.id) === String(i.productId || i.id));
      return p?.category === 'proteina' || p?.category === 'boneless' || p?.category === 'alitas';
    });

    const complementText = hasProtein
      ? `🔥 Para acompañar tus ${cartNames.split(' y ')[0]} te recomiendo salsas, papas o algo de tomar:`
      : complements.length > 0
        ? `🔥 Para complementar tu pedido te sugiero:`
        : '🔥 ¿Algo más para tu pedido? Te muestro opciones:';

    const fallbackComplements = complements.length > 0
      ? complements
      : getSmartComplements([], availableProducts).slice(0, 4);

    return {
      text: complementText,
      cart: context.cart,
      type: 'products',
      actions: [
        { id: 'view-cart', label: '🛒 Ver carrito', type: 'view_cart', value: 'ver carrito' },
        { id: 'checkout', label: '📦 Pedir ya', type: 'checkout', value: 'confirmar pedido' },
      ],
      ui: { cards: fallbackComplements.map((p: any) => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: p.price,
        imageUrl: getProductImageUrl(p)
      })) }
    };
  }

  // --- ACTION RESOLUTION LAYER (NLU + Deterministic Logic) ---
  const unifiedIntent = await getUnifiedIntent(message);
  
  // A. Confirmation Interceptor
  if (context.actionDecision?.requiresConfirmation && (unifiedIntent.intent === 'aceptacion' || message.toLowerCase() === 'si')) {
    console.log(`[botEngine] Confirmation RECEIVED for action: ${context.actionDecision.action}`);
    context.actionDecision.requiresConfirmation = false;
    context.actionDecision.safeToExecute = true;
    const result = executeAction(context.actionDecision.action, context.actionDecision.entities, context, availableProducts);
    if (!context.pendingActions || context.pendingActions.length === 0) {
      return { text: result?.message || `¡Listo! Hecho.`, cart: context.cart, type: 'text' };
    }
  }

  const actionDecision = resolveAction(unifiedIntent);
  context.actionDecision = actionDecision;
  if (actionDecision.secondaryActions?.length) context.pendingActions = actionDecision.secondaryActions;

  // B. Deterministic Action Execution Loop
  let executionLog: string[] = [];
  let transactionalActionExecuted = false;

  if (actionDecision.safeToExecute) {
    const result = executeAction(actionDecision.action, actionDecision.entities, context, availableProducts);
    if (result?.success) {
      if (result.message) executionLog.push(result.message);
      if (['add_to_cart', 'remove_from_cart', 'clear_cart'].includes(actionDecision.action)) transactionalActionExecuted = true;
    }
    
    if (context.pendingActions) {
      for (const nextAction of [...context.pendingActions]) {
        const subResult = executeAction(nextAction, actionDecision.entities, context, availableProducts);
        if (subResult?.success) {
          if (subResult.message) executionLog.push(subResult.message);
          if (['add_to_cart', 'remove_from_cart', 'clear_cart'].includes(nextAction)) transactionalActionExecuted = true;
          context.pendingActions = context.pendingActions.filter(a => a !== nextAction);
        }
      }
    }

    const definitiveActions = ['checkout', 'greet', 'view_cart'];
    if (definitiveActions.includes(actionDecision.action) && !transactionalActionExecuted && unifiedIntent.confidence >= 0.85) {
      let response: any = { text: executionLog.join('\n') || '¡Listo! Hecho.', cart: context.cart, type: 'text' };
      
      if (actionDecision.action === 'view_cart') {
        const cartSummary = buildCartSummaryResponse(context);
        response.ui = cartSummary.ui;
        response.actions = cartSummary.actions;
        response.type = 'buttons';
      } else if (actionDecision.action === 'checkout') {
        response.action = 'checkout';
      }
      
      return response;
    }
  }

  // --- Confirmation Handling ---
  if (actionDecision.requiresConfirmation) {
    return {
      text: actionDecision.reason ? `😅 No estoy 100% seguro. ¿Me confirmas que quieres ${actionDecision.action}?` : `😅 ¿Me confirmas tu pedido?`,
      cart: context.cart,
      type: 'buttons',
      actions: [{ id: 'yes', label: '✅ Sí', type: 'show_category', value: 'si' }, { id: 'no', label: '❌ No', type: 'dismiss', value: 'no' }]
    };
  }

  if (initialCart && Array.isArray(initialCart.items)) {
    const items = initialCart.items
      .map((item: any) => ({
        id: String(item.id || item.productId || ''),
        productId: String(item.productId || item.id || ''),
        name: item.name || 'Producto',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity || item.qty) || 1,
        qty: Number(item.qty || item.quantity) || 1,
      }))
      .filter((item: any) => item.id && item.quantity > 0);

    context.cart = {
      items,
      total: Number(initialCart.total) || items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
    };
  }


  const cartSummaryRequest = /(ver\s+)?(mi\s+)?(carrito|cuenta|orden|pedido)|qu[eé]\s+llevo|cu[aá]nto\s+(llevo|es|ser[ií]a|va)|total/i.test(message);
  if (cartSummaryRequest) {
    return buildCartSummaryResponse(context);
  }

  // Shortcuts moved to top of getBotResponse to take precedence over Action Resolution Layer

  // -------------------------------------------

  const quickIntent = unifiedIntent.intent as any;
  const cacheKey = getCacheKey(message, quickIntent, context);
  if (cacheKey && !context.cart?.items?.length) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      console.log(`[botEngine] Cache HIT: ${cacheKey}`);
      return { ...cached, cart: context.cart };
    }
  }

  // 4.4 Degraded Mode
  if (isInDegradedMode()) {
    const fallback = getLocalFallbackResponse(message, availableProducts);
    const degradedText = '🔥 Te muestro opciones rápidas mientras procesamos todo';
    if (fallback) {
      return {
        text: `${degradedText}\n\n${fallback.text}`,
        cart: context.cart,
        type: fallback.cards ? 'products' : 'buttons',
        actions: fallback.actions || [],
        ui: fallback.cards ? { cards: fallback.cards } : null,
      };
    }
    const topProducts = availableProducts
      .filter((p: any) => p.category === 'combos')
      .slice(0, 4)
      .map((p: any) => ({
        id: String(p.id), title: p.name,
        description: p.description || '',
        price: p.price, imageUrl: getProductImageUrl(p)
      }));
    return {
      text: degradedText,
      cart: context.cart,
      type: 'products',
      actions: [],
      ui: { cards: topProducts }
    };
  }

  // 5. Transactional AI with multi-model routing
  const routerResult = await processWithRouter(
    message,
    context.cart?.items || [],
    availableProducts,
    businessName,
    executionLog
  );
  const aiResponse = routerResult.response;

  console.log(
    `[botEngine] AI model: ${routerResult.modelUsed} | intent: ${routerResult.detectedIntent || '?'} | confidence: ${routerResult.confidence.toFixed(2)} | latency: ${routerResult.latencyMs}ms`
  );

  // Track success/failure for degraded mode (ONLY on true AI errors/timeouts)
  if (routerResult.isError) {
    recordAIFailure();
  } else {
    recordAISuccess();
  }

  // When router falls back to generic logic or returns low confidence, use layered fallback
  // Note: we trust 'rule-based' if confidence is high (preloaded hits)
  if (routerResult.confidence < 0.6) {
    // Layer 1: Keyword-based local fallback (explicit product/category mentions)
    const keywordFallback = getLocalFallbackResponse(message, availableProducts);
    if (keywordFallback) {
      return {
        text: keywordFallback.text,
        cart: context.cart,
        type: keywordFallback.cards ? 'products' : 'buttons',
        actions: keywordFallback.actions || [],
        ui: keywordFallback.cards ? { cards: keywordFallback.cards } : null
      };
    }

    // Layer 2: Context-aware inference (use conversation history)
    const contextFallback = inferContextualResponse(
      message,
      context,
      availableProducts,
      routerResult.detectedIntent
    );
    if (contextFallback) {
      return contextFallback;
    }
  }

  // 6. Execute AI Actions
  for (const action of aiResponse.actions) {
    switch (action.type) {
      case 'ADD_TO_CART':
        if (action.productId) {
          const product = availableProducts.find((p: any) => String(p.id) === String(action.productId));
          if (product) {
            const qty = action.quantity || 1;
            for (let i = 0; i < qty; i++) addToCart(context, product);
          }
        }
        break;
      case 'REMOVE_FROM_CART':
        if (action.productId && context.cart?.items) {
          const itemIdx = context.cart.items.findIndex(i => String(i.productId || i.id) === String(action.productId));
          if (itemIdx > -1) {
            const item = context.cart.items[itemIdx];
            context.cart.items.splice(itemIdx, 1);
            context.cart.total -= item.price;
          }
        }
        break;
      case 'CLEAR_CART':
        clearCartContext(context);
        break;
      case 'CHECKOUT':
        if (context.cart?.items) {
          const ids = context.cart.items.map((i: any) => String(i.productId || i.id));
          recordPurchase(ids);
        }
        context.state = 'checkout';
        break;
    }
  }

  // 7. Persist Context
  updateContext(cleanPhone, { 
    cart: context.cart, 
    state: context.state,
    lastUserMessage: message,
    lastIntent: routerResult.detectedIntent
  });

  // 8. Dynamic Upsells
  let upsellCard = null;
  const isAddAction = aiResponse.actions.some((a: any) => a.type === 'ADD_TO_CART');
  if (isAddAction && context.cart?.items?.length > 0) {
    const upsell = await getBestUpsell(context.cart.items, undefined, availableProducts);
    if (upsell) {
      const p = availableProducts.find((prod: any) => String(prod.id) === String(upsell.productId));
      if (p) {
        upsellCard = {
          id: String(p.id),
          title: p.name,
          description: upsell.message,
          price: p.price,
          imageUrl: getProductImageUrl(p)
        };
      }
    }
  }

  // 9. UI elements
  const ui = buildChatUI(message, availableProducts, context, aiResponse, upsellCard);
  const actions = buildChatActions(message, context, aiResponse, availableProducts);

  const finalResponse = {
    text: aiResponse.response_text,
    cart: context.cart,
    type: (actions.length > 0 || ui?.cards?.length) ? 'buttons' : 'text',
    actions: actions,
    ui: ui,
    products: ui?.cards?.map((c: any) => ({ name: c.title })) || [],
    intent: routerResult.detectedIntent
  };

  // 10. Cache
  if (cacheKey && !isAddAction && !context.cart?.items?.length) {
    setCachedResponse(cacheKey, finalResponse);
    console.log(`[botEngine] Cache SET: ${cacheKey}`);
  }

  return finalResponse;
}

// ─── Smart Complement Engine ─────────────────────────────────────────────────
/**
 * Maps cart contents to complementary product categories.
 * Rules:
 *   boneless/alitas → dips, fries, drinks
 *   combo          → add-ons only (no more mains)
 *   papas          → salsas, bebidas, postres
 *   bebidas        → papas, postres, extras
 *   default        → papas, bebidas, extras
 */
function getSmartComplements(cartItems: any[], availableProducts: any[]): any[] {
  const cartIds = new Set(cartItems.map((i: any) => String(i.productId || i.id)));

  // Determine cart categories
  const cartCategories = new Set<string>();
  for (const item of cartItems) {
    const p = availableProducts.find((prod: any) => String(prod.id) === String(item.productId || item.id));
    if (p?.category) cartCategories.add(p.category);
  }

  // Map cart categories → complementary categories (ordered by relevance)
  let complementCategories: string[];

  if (cartCategories.has('proteina')) {
    // proteina: suggest papas, dips (extras), bebida
    complementCategories = ['papas', 'extras', 'bebidas'];
  } else if (cartCategories.has('combos')) {
    // combo: suggest extra dip, postre
    complementCategories = ['extras', 'postres'];
  } else if (cartCategories.has('papas')) {
    complementCategories = ['extras', 'bebidas', 'postres'];
  } else if (cartCategories.has('bebidas')) {
    complementCategories = ['papas', 'postres', 'extras'];
  } else {
    // Default → only relevant snack-related items
    complementCategories = ['papas', 'bebidas', 'extras'];
  }

  // Collect products from complementary categories, excluding items already in cart
  const complements: any[] = [];
  const usedIds = new Set<string>();

  for (const cat of complementCategories) {
    if (complements.length >= 4) break;
    const candidates = availableProducts.filter((p: any) =>
      p.category === cat &&
      !cartIds.has(String(p.id)) &&
      !usedIds.has(String(p.id)) &&
      p.available !== false
    );
    for (const p of candidates) {
      if (complements.length >= 4) break;
      complements.push(p);
      usedIds.add(String(p.id));
    }
  }

  return complements;
}

function buildCartSummaryResponse(context: any) {
  const items = context.cart?.items || [];

  if (!items.length) {
    return {
      text: 'Tu carrito está vacío por ahora. ¿Quieres ver combos, boneless o bebidas?',
      cart: context.cart,
      type: 'buttons',
      actions: [
        { id: 'empty-combos', label: '🔥 Ver combos', type: 'show_category', value: 'ver combos' },
        { id: 'empty-bebidas', label: '🥤 Ver bebidas', type: 'show_category', value: 'ver bebidas' },
      ],
      ui: null,
    };
  }

  const total = items.reduce((sum: number, item: any) => {
    const qty = Number(item.quantity || item.qty) || 1;
    return sum + (Number(item.price) || 0) * qty;
  }, 0);

  context.cart.total = total;

  const lines = items.map((item: any) => {
    const qty = Number(item.quantity || item.qty) || 1;
    const price = Number(item.price) || 0;
    return `• ${qty}x ${item.name} - $${price * qty}`;
  });

  return {
    text: `Tu cuenta va así:\n${lines.join('\n')}\n\nTotal: $${total}\n\n¿Quieres agregar algo más o cerramos tu pedido?`,
    cart: context.cart,
    type: 'buttons',
    actions: [
      { id: 'summary-drinks', label: '🥤 Agregar bebida', type: 'show_category', value: 'ver bebidas' },
      { id: 'summary-checkout', label: '📦 Pedir ya', type: 'checkout', value: 'confirmar pedido' },
    ],
    ui: {
      cart: {
        total,
        itemCount: items.reduce((sum: number, item: any) => sum + (Number(item.quantity || item.qty) || 1), 0),
      },
    },
  };
}

// ─── Context-Aware Fallback Inference ────────────────────────────────────────
/**
 * When the AI fails and keyword matching doesn't hit, use conversation
 * context (cart contents, last intent, last message) to infer what the
 * user probably wanted and respond appropriately.
 *
 * Returns null if no inference can be made.
 */
function inferContextualResponse(
  message: string,
  context: any,
  availableProducts: any[],
  detectedIntent?: string,
): any | null {
  const hasCart = context.cart?.items?.length > 0;
  const lastIntent = context.lastIntent;
  const lastMsg = (context.lastUserMessage || '').toLowerCase();
  const m = message.toLowerCase().trim();

  const toCard = (p: any) => ({
    id: String(p.id),
    title: p.name,
    description: p.description || '',
    price: p.price,
    imageUrl: getProductImageUrl(p)
  });

  // ── Case 1: Cart NOT empty → treat as ADD_COMPLEMENT ──────────────────
  if (hasCart) {
    const complements = getSmartComplements(context.cart.items, availableProducts);

    if (complements.length > 0) {
      return {
        text: '🔥 ¿Quieres agregar algo más a tu pedido? Te recomiendo:',
        cart: context.cart,
        type: 'products',
        actions: [
          { id: 'ctx-cart', label: '🛒 Ver carrito', type: 'view_cart', value: 'ver carrito' },
          { id: 'ctx-checkout', label: '📦 Pedir ya', type: 'checkout', value: 'confirmar pedido' },
        ],
        ui: { cards: complements.map(toCard) }
      };
    }

    // Cart has items but no complements available → checkout prompt
    return {
      text: 'Tienes items en tu carrito. ¿Procedemos con el pedido? 🛒',
      cart: context.cart,
      type: 'buttons',
      actions: [
        { id: 'ctx-cart2', label: '🛒 Ver carrito', type: 'view_cart', value: 'ver carrito' },
        { id: 'ctx-chk2', label: '📦 Pedir ya', type: 'checkout', value: 'confirmar pedido' },
      ],
      ui: null
    };
  }

  // ── Case 2: Last intent was BROWSE → CONTINUE_BROWSING ───────────────
  if (lastIntent === 'BROWSE' || /menu|carta|combos|que (hay|tienen)/.test(lastMsg)) {
    const combos = availableProducts
      .filter((p: any) => p.category === 'combos' && p.available !== false)
      .slice(0, 4);

    return {
      text: '📋 Sigues explorando el menú. Aquí más opciones:',
      cart: context.cart,
      type: 'products',
      actions: [
        { id: 'ctx-menu', label: '📋 Ver menú completo', type: 'show_category', value: 'ver menu' },
      ],
      ui: { cards: combos.map(toCard) }
    };
  }

  // ── Case 3: Last state was checkout → CHECKOUT follow-up ──────────────
  if (context.state === 'checkout' || lastIntent === 'CHECKOUT') {
    return {
      text: '¿Confirmamos tu pedido? Estoy listo para procesarlo. 📦',
      cart: context.cart,
      type: 'buttons',
      actions: [
        { id: 'ctx-confirm', label: '✅ Confirmar pedido', type: 'checkout', value: 'confirmar pedido' },
        { id: 'ctx-cancel', label: '🗑️ Cancelar', type: 'dismiss', value: 'cancelar' },
      ],
      ui: null
    };
  }

  // ── Case 4: Last message mentioned a specific product ─────────────────
  const lastProductMentions = availableProducts.filter((p: any) =>
    p.name && lastMsg.includes(p.name.toLowerCase())
  );
  if (lastProductMentions.length > 0) {
    return {
      text: `¿Te refieres a ${lastProductMentions[0].name}? Lo agrego si quieres. 👇`,
      cart: context.cart,
      type: 'products',
      actions: lastProductMentions.slice(0, 3).map((p: any) => ({
        id: `ctx-add-${p.id}`,
        label: `+ ${p.name} $${p.price}`,
        type: 'add_to_cart',
        value: `agrega ${p.name}`,
        payload: { productId: String(p.id), name: p.name, price: p.price },
        price: p.price,
        image: getProductImageUrl(p),
      })),
      ui: { cards: lastProductMentions.slice(0, 3).map(toCard) }
    };
  }

  // ── Case 5: Greeting-like short message without clear intent ──────────
  if (m.length < 10 && !/[a-z]{3,}/i.test(m)) {
    return {
      text: '¿En qué puedo ayudarte? Dime qué se te antoja y te lo preparo. 🔥',
      cart: context.cart,
      type: 'buttons',
      actions: [
        { id: 'ctx-combos', label: '🔥 Combos', type: 'show_category', value: 'ver combos' },
        { id: 'ctx-menu2', label: '📋 Menú', type: 'show_category', value: 'ver menú' },
      ],
      ui: null
    };
  }

  // ── Final Fallback: Structured Question ─────────────────────────────────────
  return {
    text: "🔥 ¿Qué se te antoja?\n1) Alitas\n2) Boneless\n3) Papas",
    cart: context.cart,
    type: 'buttons',
    actions: [
      { id: 'opt-alitas', label: '🍗 Alitas', type: 'show_category', value: 'ver alitas' },
      { id: 'opt-boneless', label: '💪 Boneless', type: 'show_category', value: 'ver boneless' },
      { id: 'opt-papas', label: '🍟 Papas', type: 'show_category', value: 'ver papas' },
    ],
    ui: null
  };
}

// ─── Local Fallback Response Engine ──────────────────────────────────────────
/**
 * When the AI is unavailable, this function detects intent from keywords
 * and returns a structured response using rule-based logic.
 * Returns null if no match is found.
 */
function getLocalFallbackResponse(
  message: string,
  availableProducts: any[]
): { text: string; cards?: any[]; actions?: any[] } | null {
  const m = message.toLowerCase().trim();

  const toCard = (p: any) => ({
    id: String(p.id),
    title: p.name,
    description: p.description || '',
    price: p.price,
    imageUrl: getProductImageUrl(p)
  });

  // Combos
  if (/combo|combos/.test(m)) {
    const cards = availableProducts.filter((p: any) => p.category === 'combos').slice(0, 4).map(toCard);
    return { text: '🔥 Aquí tienes nuestros combos más rifados:', cards };
  }

  // Salsas / Sauces
  if (/salsa|salsas|dip|dips|aderezo/.test(m)) {
    const cards = availableProducts.filter((p: any) => p.category === 'extras').slice(0, 4).map(toCard);
    return { text: '🌶️ Estas son nuestras salsas y aderezos:', cards };
  }

  // Alitas
  if (/alita|alitas/.test(m)) {
    const cards = availableProducts.filter((p: any) => p.name.toLowerCase().includes('alita') || p.category === 'proteina').slice(0, 4).map(toCard);
    return { text: '🍗 ¡Las alitas más crujientes del barrio!', cards };
  }

  // Boneless
  if (/boneless/.test(m)) {
    const cards = availableProducts.filter((p: any) => p.name.toLowerCase().includes('boneless')).slice(0, 4).map(toCard);
    return { text: '💪 ¡Boneless recién hechos para ti!', cards };
  }

  // Papas
  if (/papa|papas/.test(m)) {
    const cards = availableProducts.filter((p: any) => p.category === 'papas').slice(0, 4).map(toCard);
    return { text: '🍟 Papas crujientes y bien sazonadas:', cards };
  }

  // Bebidas
  if (/bebida|refresco|tomar|beber/.test(m)) {
    const cards = availableProducts.filter((p: any) => p.category === 'bebidas').slice(0, 4).map(toCard);
    return { text: '🥤 ¡Algo frío para acompañar!', cards };
  }

  // Postres
  if (/postre|brownie|dulce/.test(m)) {
    const cards = availableProducts.filter((p: any) => p.category === 'postres').slice(0, 4).map(toCard);
    return { text: '🍰 ¡El cierre perfecto para tu pedido!', cards };
  }

  // Vague hunger
  if (/quiero algo|tengo hambre|que recomiendas|recomiendame/.test(m)) {
    return {
      text: '¿Se te antoja algo más 🔥 salado o dulce?',
      actions: [
        { id: 'fb-salado', label: 'Salado 🍟', type: 'recommend', value: 'salado' },
        { id: 'fb-dulce', label: 'Dulce 🍫', type: 'recommend', value: 'dulce' },
      ]
    };
  }

  // Menu / all products
  if (/menu|carta|ver todo/.test(m)) {
    const cards = availableProducts.filter((p: any) => p.category === 'combos').slice(0, 4).map(toCard);
    return {
      text: '📋 Aquí tienes nuestros combos estrella. ¿Te animas?',
      cards,
      actions: [{ id: 'fb-menu', label: '📋 Ver todo el menú', type: 'show_category', value: 'ver menú' }]
    };
  }

  // Complement / follow-up
  if (/^(y\s+)?(algo|qu[eé])\s+m[aá]s|algo\s+adicional|para\s+acompa[ñn]ar|acompa[ñn]ar/i.test(m)) {
    const complements = availableProducts
      .filter((p: any) => ['papas', 'bebidas', 'postres', 'extras'].includes(p.category))
      .slice(0, 4)
      .map(toCard);
    return {
      text: '🔥 Para acompañar, te recomiendo:',
      cards: complements,
      actions: [
        { id: 'fb-view-cart', label: '🛒 Ver carrito', type: 'view_cart', value: 'ver carrito' },
      ]
    };
  }

  // No match — return null so the original AI error message is shown as last resort
  return null;
}


/**
 * Maps user message keywords → data-level product category.
 * Ensures "salsas" → 'extras', "alitas" → 'proteina', etc.
 */
function detectCategoryMention(message: string): string {
  const n = message;
  if (/salsa|salsas|dip|dips|aderezo|aderezos|extra|extras/i.test(n)) return 'extras';
  if (/alitas|boneless|proteina/i.test(n)) return 'proteina';
  if (/papas|loaded/i.test(n)) return 'papas';
  if (/banderilla|dedos|salchila/i.test(n)) return 'banderillas';
  if (/bebida|bebidas|refresco|tomar|beber/i.test(n)) return 'bebidas';
  if (/postre|brownie|helado/i.test(n)) return 'postres';
  return 'combos';
}

function buildChatUI(
  message: string,
  availableProducts: any[],
  context: any,
  aiResponse: any,
  upsellCard: any = null
): BotUI | null {
  const ui: BotUI = {};
  const nMsg = message.toLowerCase().trim();
  const hasCart = context.cart?.items?.length > 0;

  // Cart summary when items exist
  if (hasCart) {
    const items = context.cart.items.map((item: any) => ({
      id: String(item.productId || item.id),
      name: item.name || 'Producto',
      price: item.price || 0,
      quantity: item.quantity || 1,
    }));
    ui.cart = {
      total: context.cart.total || 0,
      itemCount: items.length,
    };
  }

  // Product cards when user asks for menu/combos/categories
  const isMenuQuery = /menu|carta|combos|que (hay|tienen|venden)|muestrame|enseñame|productos|alitas|boneless|papas|banderilla|bebida|bebidas|refresco|tomar|beber|postre|salsa|salsas|dip|dips|aderezo|aderezos|extra|extras/i.test(nMsg);
  const isAddQuery = /quiero|dame|agrega|pon|añade|me das|pidamos|ordenar/i.test(nMsg);

  if (isMenuQuery) {
    const cat = detectCategoryMention(nMsg);
    let matchedProducts = availableProducts
      .filter((p: any) => p.category === cat && p.id)
      .slice(0, 4);
      
    // Fallback to static products if DB returned none for this category
    if (matchedProducts.length === 0) {
      matchedProducts = staticProducts
        .filter((p: any) => p.category === cat)
        .slice(0, 4);
    }
      
    if (matchedProducts.length > 0) {
      ui.cards = matchedProducts.map((p: any) => ({
        id: String(p.id),
        title: p.name || '',
        description: p.description || '',
        price: p.price,
        imageUrl: getProductImageUrl(p),
      }));
    }
  }

  // Also show combo cards when cart has items (upsell opportunity)
  if (hasCart && !ui.cards && isAddQuery) {
    // If we have a contextual upsell, prioritize it
    if (upsellCard) {
      ui.cards = [upsellCard];
      
      // Try to find one more complementary item to reach "Max 2"
      const smartExtras = getSmartComplements(context.cart.items, availableProducts)
        .filter((p: any) => String(p.id) !== String(upsellCard.id))
        .slice(0, 1);

      if (smartExtras.length > 0) {
        ui.cards.push(...smartExtras.map((p: any) => ({
          id: String(p.id),
          title: p.name,
          description: p.description,
          price: p.price,
          imageUrl: getProductImageUrl(p)
        })));
      }
    } else {
      const smartExtrasDefault = getSmartComplements(context.cart.items, availableProducts).slice(0, 3);
      if (smartExtrasDefault.length > 0) {
        ui.cards = smartExtrasDefault.map((p: any) => ({
          id: String(p.id),
          title: p.name || '',
          description: p.description || '',
          price: p.price,
          imageUrl: getProductImageUrl(p),
        }));
      }
    }
  }

  return Object.keys(ui).length > 0 ? ui : null;
}

function buildChatActions(
  message: string,
  context: any,
  aiResponse: any,
  availableProducts: any[]
): Action[] {
  const actions: Action[] = [];

  // 0. Handle CLARIFY intent (High Priority)
  if (context.lastIntent === 'CLARIFY') {
    return [
      { id: 'opt-alitas', label: '🍗 Alitas', type: 'show_category', value: 'ver alitas' },
      { id: 'opt-boneless', label: '💪 Boneless', type: 'show_category', value: 'ver boneless' },
      { id: 'opt-papas', label: '🍟 Papas', type: 'show_category', value: 'ver papas' },
    ];
  }
  const nMsg = message.toLowerCase().trim();
  const hasCart = context.cart?.items?.length > 0;
  const aiAdded = aiResponse.actions?.some((a: any) => a.type === 'ADD_TO_CART');
  const isMenuQuery = /menu|carta|combos|que (hay|tienen|venden)|muestrame/i.test(nMsg);
  const isAddQuery = /quiero|dame|agrega|pon|añade|me das|pidamos/i.test(nMsg);

  // If AI added items to cart, show cart actions
  if (aiAdded || (hasCart && !isMenuQuery)) {
    if (hasCart || aiAdded) {
      actions.push({ id: 'view-cart', label: '🛒 Ver carrito', type: 'view_cart', value: 'ver carrito' });
      actions.push({ id: 'checkout', label: '📦 Pedir ya', type: 'checkout', value: 'confirmar pedido' });
    }
  }

  // Menu/combos quick browse actions
  if (isMenuQuery) {
    const cat = detectCategoryMention(nMsg);
    if (cat === 'extras') {
      actions.push({ id: 'show-menu', label: '📋 Ver menú completo', type: 'show_category', value: 'ver menu' });
    } else {
      actions.push({ id: 'show-combos', label: '🔥 Combos', type: 'show_category', value: 'ver combos' });
      actions.push({ id: 'show-menu', label: '📋 Todo el menú', type: 'show_category', value: 'ver menú' });
    }
  }

  // Add quick product buttons when asking for recommendations
  if (/recomiend|sugiere|que me recomiendas|que sugieres|no se/i.test(nMsg)) {
    const popular = availableProducts
      .filter((p: any) => p.category === 'combos' && p.id)
      .slice(0, 3);
    popular.forEach((p: any) => {
      actions.push({
        id: `add-${p.id}`,
        label: `+ ${p.name} $${p.price}`,
        type: 'add_to_cart',
        value: `agrega ${p.name}`,
        payload: { productId: String(p.id), name: p.name, price: p.price },
        price: p.price,
        image: getProductImageUrl(p),
      } as Action);
    });
  }

  // If cart has items but user didn't just add, show checkout  
  if (hasCart && !aiAdded && !isMenuQuery && !isAddQuery) {
    if (!actions.some(a => a.type === 'checkout')) {
      actions.push({ id: 'checkout-end', label: '✅ Confirmar y pedir', type: 'checkout', value: 'confirmar pedido' });
    }
    actions.push({ id: 'clear-cart', label: '🗑️ Vaciar carrito', type: 'dismiss', value: 'vaciar carrito' });
  }

  return actions;
}
