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
import { getTenantConfig } from "@/config";
import { type TenantConfig, defaultUpsellConfig } from "./config/featureFlags";

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

// ═══════════════════════════════════════════════════════════════════════════
// Deterministic Message Pipeline
// ═══════════════════════════════════════════════════════════════════════════
//
// Phases:
//   1. resolveIntent     — pure NLU + communicative intent detection
//   2. selectSkill       — intent → skill mapping (pure)
//   3. runSkill          — skill execution (may be async)
//   4. validateResult    — output safety validation (pure)
//   5. buildResponse     — final response assembly (pure)

import type { Intent } from './types';

// ─── Pipeline Types ──────────────────────────────────────────────────────

type PipelineSkill =
  | 'greeting'
  | 'negative'
  | 'block_empty_cart'
  | 'modular'
  | 'repeatOrder'
  | 'scarcity'
  | 'upsell'
  | 'comboRecommendation'
  | 'cheapRecommendation'
  | 'fallback'
  | 'productFlow';

interface IntentResult {
  intent: string;
  detectedRestrictions: string[];
}

interface SkillResult {
  text: string;
  nextState: any;
  cart: any;
  type: string;
  actions?: any;
}

interface ValidationResult {
  valid: boolean;
  sanitizedText?: string;
  reason?: string;
}

interface PipelineInput {
  message: string;
  conversationState: any;
  safeProducts: any[];
  allProducts: any[];
  inventory?: {
    lowStock: any[];
    highStock: any[];
    outOfStock: any[];
  };
  user?: {
    isReturning: boolean;
  };
  memory?: any;
  intent?: string;
  config?: TenantConfig;
}

// ─── Phase 1: Intent Detection ───────────────────────────────────────────

function resolveIntent(message: string, context: any): IntentResult {
  // Pre-checks: communicative intent detection (not business logic)
  if (isGreetingOnly(message)) {
    return { intent: 'GREETING', detectedRestrictions: [] };
  }

  const normalized = message.trim().toLowerCase();
  const negativeInputs = ['no', 'nop', 'nel', 'no gracias'];
  if (negativeInputs.includes(normalized)) {
    return { intent: 'NEGATIVE', detectedRestrictions: [] };
  }

  const confirmWords = ['si', 'sí', 'va', 'dale', 'lo quiero'];
  if (confirmWords.includes(normalized) && !context.cart?.items?.length) {
    return { intent: 'CONFIRM_EMPTY_CART', detectedRestrictions: [] };
  }

  const nlu = detectIntent(message, context);
  const detectedRestrictions = nlu.allergies || [];

  if (nlu.intent === 'rechazo_fuerte' || nlu.intent === 'rechazo') {
    const words = message.toLowerCase().split(/\s+/);
    detectedRestrictions.push(...words.filter((w: string) => w.length > 4));
  }

  let finalIntent: string = nlu.intent;

  // Product detection override
  const productKeywords = ['boneless', 'alitas', 'papas', 'combo', 'banderilla', 'refresco', 'bebida', 'postre', 'brownie'];
  const hasProduct = productKeywords.some(kw => normalized.includes(kw));

  if (hasProduct && ['RECOMMEND', 'SHOW_MENU', 'UNKNOWN'].includes(finalIntent)) {
    finalIntent = 'PRODUCT_QUERY';
  }

  return { intent: finalIntent, detectedRestrictions };
}

// ─── Phase 2: Skill Selection ────────────────────────────────────────────

export function selectSkill(intent: string, strategy: Strategy = "default"): PipelineSkill {
  const productIntents = ["ADD_TO_CART", "PRODUCT_QUERY", "ORDER_ITEM"];
  if (productIntents.includes(intent)) {
    return "productFlow";
  }

  if (strategy !== "default") {
    switch (strategy) {
      case "repeat_order": return "repeatOrder";
      case "scarcity_push": return "scarcity";
      case "upsell_high_margin": return "upsell";
      case "combo_push": return "comboRecommendation";
      case "budget_mode": return "cheapRecommendation";
      case "recovery": return "fallback";
      // "explore_menu" can fall through to intent routing or be mapped if needed later
    }
  }

  switch (intent) {
    case 'GREETING':
      return 'greeting';
    case 'NEGATIVE':
      return 'negative';
    case 'CONFIRM_EMPTY_CART':
      return 'block_empty_cart';
    default:
      return 'modular';
  }
}

// ─── Phase 3: Skill Execution ────────────────────────────────────────────

async function runSkill(
  skill: PipelineSkill,
  input: PipelineInput,
  strategy: Strategy = "default"
): Promise<SkillResult> {
  const ctx = input.conversationState;
  const emptyCart = { items: [] as any[], total: 0 };

  switch (skill) {
    case 'greeting': {
      if (ctx.cart?.items?.length > 5) {
        ctx.cart = emptyCart;
      }
      return {
        text: `¡Hola! 👋\n¿Quieres ver el menú o te recomiendo algo de *${ctx.businessName}*? 🔥`,
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }

    case 'negative': {
      return {
        text: 'Perfecto 👍\n\n¿Quieres ver el menú o algo más?',
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }

    case 'block_empty_cart': {
      return {
        text: 'Primero agrega algo a tu pedido 😅',
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }

    case 'repeatOrder': {
      const last = input.memory?.lastOrder || "tu pedido anterior";
      return {
        text: `¡Hola de nuevo! 👋 ¿Te preparo lo de siempre (${last}) o quieres ver el menú?`,
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }

    case 'scarcity': {
      const product = input.inventory?.lowStock?.[0];
      const prodName = product ? product.name : "nuestras especialidades";
      return {
        text: `¡Hola! 🏃‍♂️ Date prisa porque nos quedan los últimos ${prodName}. ¿Te agrego uno a tu orden?`,
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }

    case 'upsell': {
      const product = input.inventory?.highStock?.[0] || input.safeProducts[0];
      const prodName = product ? product.name : "algo delicioso";
      return {
        text: `¡Excelente elección! Para acompañar, te recomiendo especialmente nuestro ${prodName}. ¿Lo sumamos?`,
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }

    case 'comboRecommendation': {
      const combos = input.safeProducts.filter(p => p.category?.toLowerCase() === 'combos' || p.name.toLowerCase().includes('combo'));
      const combo = combos.length > 0 ? combos[0] : null;
      const comboName = combo ? combo.name : "uno de nuestros Combos Especiales";
      return {
        text: `Te sugiero ${comboName}, es una excelente opción. ¿Qué te parece?`,
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }

    case 'cheapRecommendation': {
      const sorted = [...input.safeProducts].filter(p => p.stock !== 0).sort((a, b) => (a.price || 0) - (b.price || 0));
      const cheapest = sorted.length > 0 ? sorted[0] : null;
      const prodName = cheapest ? cheapest.name : "una opción económica";
      return {
        text: `Si buscas algo más económico, te recomiendo ${prodName}. ¡Es súper rico y cuida tu bolsillo!`,
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }

    case 'fallback': {
      const msgLower = input.message.toLowerCase();
      const productKeywords = ['boneless', 'alitas', 'papas', 'combo', 'banderilla', 'dedos', 'queso', 'hamburguesa'];
      const matchedKw = productKeywords.find(kw => msgLower.includes(kw));
      
      let matchedProducts = input.safeProducts.filter(p => msgLower.includes(p.name.toLowerCase()));
      
      if (matchedProducts.length === 0 && matchedKw) {
        matchedProducts = input.safeProducts.filter(p => p.name.toLowerCase().includes(matchedKw));
      }

      const isProductRelated = input.intent === 'RECOMMEND' || input.intent === 'PRODUCT_QUERY' || input.intent === 'ADD_TO_CART' || input.intent === 'ORDER_ITEM';

      if (matchedProducts.length > 0 || isProductRelated) {
        return runSkill('productFlow', input, strategy);
      }

      return {
        text: `No te entendí bien 😅. Puedes escribir "Ver menú", "Pedir lo mismo de ayer", o simplemente decir "Hola". ¿Qué prefieres?`,
        nextState: ctx,
        cart: ctx.cart || emptyCart,
        type: 'text',
      };
    }
    case 'productFlow': {
      const msgLower = input.message.toLowerCase();
      const actionWords = ['quiero', 'dame', 'agrega', 'ponme', 'uno mas', 'otro', 'mas'];
      const hasActionWord = actionWords.some(w => msgLower.includes(w));
      const intentLower = (input.intent || '').toUpperCase();
      const shouldForceAdd = (intentLower === 'ADD_TO_CART') || (intentLower === 'PRODUCT_QUERY' && hasActionWord) || hasActionWord;

      let pToForceAdd: any = null;
      const matchedProducts = input.safeProducts.filter(p => {
        const name = p.name.toLowerCase();
        const cat = (p.category || '').toLowerCase();
        // Match if message contains full name, category, or any significant word from the name
        return msgLower.includes(name) || msgLower.includes(cat) || 
                name.split(/\s+/).some((word: string) => word.length > 3 && msgLower.includes(word));
      });
      
      if (matchedProducts.length > 0) {
         pToForceAdd = matchedProducts[0];
      } else {
         const productKeywords = ['boneless', 'alitas', 'papas', 'combo', 'banderilla', 'dedos', 'queso', 'hamburguesa'];
         const matchedKw = productKeywords.find(kw => msgLower.includes(kw));
         if (matchedKw) {
            const pList = input.safeProducts.filter(p => p.name.toLowerCase().includes(matchedKw));
            if (pList.length > 0) pToForceAdd = pList[0];
         }
      }

      // Fallback: "agrega otro" / "uno mas" with no product name → re-add last cart item
      if (!pToForceAdd && hasActionWord) {
        const cartItems = input.conversationState?.cart?.items || [];
        if (cartItems.length > 0) {
          const lastItem = cartItems[cartItems.length - 1];
          const fromCatalog = input.safeProducts.find(p => p.name === lastItem.name || p.id === lastItem.productId);
          pToForceAdd = fromCatalog || lastItem;
        }
      }

      if (shouldForceAdd && pToForceAdd) {
        let currentCartItems = [...(input.conversationState?.cart?.items || [])];
        let currentTotal = Number(input.conversationState?.cart?.total) || 0;
        if (isNaN(currentTotal)) currentTotal = 0;
        
        const price = Number(pToForceAdd.priceToShow || pToForceAdd.price) || 0;
        const existing = currentCartItems.find((i: any) => i.name === pToForceAdd.name);
        
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            currentCartItems.push({
              id: pToForceAdd.id,
              productId: pToForceAdd.id,
              name: pToForceAdd.name,
              quantity: 1,
              price: price,
              category: pToForceAdd.category
            });
        }
        currentTotal += price;

        const nextState = {
           ...input.conversationState,
           cart: {
              items: currentCartItems,
              total: currentTotal
           }
        };

        // Build smart upsell suggestion
        const upsellProduct = selectBestUpsell({
          currentProduct: pToForceAdd,
          allProducts: input.safeProducts,
          cart: nextState.cart,
          config: input.config
        });

        let responseText = `🔥 ${pToForceAdd.name} agregado — $${price}`;
        if (upsellProduct) {
          const upsellPrice = upsellProduct.priceToShow || upsellProduct.price;
          responseText += `\n¿Quieres agregar *${upsellProduct.name}* ($${upsellPrice})? Responde *sí* o *no*.`;
        } else {
          responseText += `\n¿Quieres algo más?`;
        }

        return {
          text: responseText,
          nextState: nextState,
          cart: nextState.cart,
          type: 'text'
        };
      }

      const modularRes = await handleMessageModular(
        input.message,
        input.conversationState,
        {} as import('./types').ProductRefs,
        undefined,
        input.allProducts as any,
      );

      let finalText = modularRes.text;
      const textLower = finalText.toLowerCase();
      
      const newItems = modularRes.nextState?.cart?.items || [];
      const oldItems = input.conversationState?.cart?.items || [];
      
      if (newItems.length > oldItems.length) {
         const addedItem = newItems[newItems.length - 1];
         if (!textLower.includes(addedItem.name.toLowerCase())) {
            finalText = `✅ Agregado: ${addedItem.name} ($${addedItem.price})\n\n${finalText}`;
         }
      } else {
         if (pToForceAdd) {
            if (!textLower.includes(pToForceAdd.name.toLowerCase())) {
               finalText = `✅ ${pToForceAdd.name} ($${pToForceAdd.priceToShow || pToForceAdd.price})\n\n${finalText}`;
            }
         }
      }

      return {
        text: finalText,
        nextState: modularRes.nextState,
        cart: modularRes.nextState.cart,
        type: modularRes.type || 'text',
        actions: modularRes.actions,
      };
    }

    default: {
      // Graceful reset: clear large carts on greeting intent (handled above)
      // Now route through the modular sales engine
      const modularRes = await handleMessageModular(
        input.message,
        input.conversationState,
        {} as import('./types').ProductRefs,
        undefined,
        input.allProducts as any,
      );

      return {
        text: modularRes.text,
        nextState: modularRes.nextState,
        cart: modularRes.nextState.cart,
        type: modularRes.type || 'text',
        actions: modularRes.actions,
      };
    }
  }
}

/**
 * Smart upsell selector to increase AOV.
 */
function selectBestUpsell(params: {
  currentProduct: any;
  allProducts: any[];
  cart: any;
  config?: TenantConfig;
}): any {
  const { currentProduct, allProducts, cart, config } = params;
  const upsellConf = config?.upsellConfig || defaultUpsellConfig;
  const marginScoringEnabled = config?.features?.margin_scoring ?? true; // Default true to preserve behavior
  const progressionEnabled = config?.features?.upsell_progression ?? true;
  const cartItems = cart?.items || [];
  const currentCategory = (currentProduct?.category || '').toLowerCase();

  const candidates = allProducts.filter(p => {
    // Rule: Must not suggest same product
    if (p.id === currentProduct?.id) return false;
    // Rule: Must not suggest same category
    if ((p.category || '').toLowerCase() === currentCategory) return false;
    // Rule: Must be available
    if (p.available === false || p.stock === 0) return false;

    // Rule: Avoid combo + papas/bebida redundancy (blocks validation failures)
    const cat = (p.category || '').toLowerCase();
    const curCat = currentCategory;
    if ((cat === 'combo' || cat === 'combos') && (curCat === 'papas' || curCat === 'bebida' || curCat === 'bebidas')) return false;
    if ((curCat === 'combo' || curCat === 'combos') && (cat === 'papas' || cat === 'bebida' || cat === 'bebidas')) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  const scored = candidates.map(p => {
    let categoryWeight = 0;
    const cat = (p.category || '').toLowerCase();
    
    // Analyze cart context for progression
    const cartCategories = cartItems.map((i: any) => (i.category || '').toLowerCase());
    const hasMain = cartCategories.some((c: string) => ['boneless', 'alitas', 'combo', 'combos'].includes(c)) || 
                    ['boneless', 'alitas', 'combo', 'combos'].includes(currentCategory);
    const hasDrink = cartCategories.some((c: string) => ['bebida', 'bebidas'].includes(c)) || 
                     ['bebida', 'bebidas'].includes(currentCategory);
    const hasSide = cartCategories.some((c: string) => ['papas'].includes(c)) || 
                    ['papas'].includes(currentCategory);
    const hasDessert = cartCategories.some((c: string) => ['postre', 'postres'].includes(c)) || 
                       ['postre', 'postres'].includes(currentCategory);

    // Rule 1: Progression (Main -> Drink -> Side -> Dessert)
    if (progressionEnabled) {
      if (hasMain && !hasDrink && (cat === 'bebida' || cat === 'bebidas')) {
        categoryWeight += 1000;
      } else if (hasDrink && !hasSide && cat === 'papas') {
        categoryWeight += 800;
      } else if (hasSide && !hasDessert && (cat === 'postre' || cat === 'postres')) {
        categoryWeight += 600;
      }
    }

    // Rule 2: Avoid repeating categories (Strong penalty)
    const catInCart = cartCategories.includes(cat);
    const repeatPenalty = catInCart ? -2000 : 0;

    // Maintain profit margin priority
    const price = Number(p.price) || 0;
    const cost = p.cost !== undefined ? Number(p.cost) : (price * 0.4);
    const margin = price - cost;

    // Final score combines margin (if enabled), progression weights and repeat penalties
    const marginWeight = marginScoringEnabled ? (upsellConf.marginWeight || 2) : 0;
    let score = (margin * marginWeight) + categoryWeight + repeatPenalty;
    if (isNaN(score)) score = 0;

    return { product: p, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return the highest scoring candidate that isn't completely penalized
  const winner = scored[0];
  const minScore = upsellConf.minScore ?? -100;
  return (winner && winner.score > minScore) ? winner.product : null;
}

// ─── Phase 4: Output Validation ──────────────────────────────────────────

export function validateResult(
  result: SkillResult,
  safeProducts: any[],
  allProducts: any[],
): ValidationResult {
  let sanitized = result.text;

  if (!sanitized || sanitized.trim().length === 0) {
    return { valid: false, reason: "empty_response" };
  }

  if (!Array.isArray(allProducts) || !Array.isArray(safeProducts)) {
    return { valid: true, sanitizedText: sanitized };
  }

  const lowerText = sanitized.toLowerCase();

  // 1. Detect combo duplication
  const comboCount = (lowerText.match(/combo/g) || []).length;
  if (comboCount > 0) {
    if (comboCount > 1) {
      return { valid: false, reason: "combo_duplication_multiple" };
    }
    if (lowerText.includes('papas')) {
      return { valid: false, reason: "combo_duplication_papas" };
    }
    if (lowerText.includes('bebida') || lowerText.includes('refresco')) {
      return { valid: false, reason: "combo_duplication_bebida" };
    }
  }

  // 2. Detect out-of-stock products in response
  const outOfStock = allProducts.filter(p => p.available === false || p.stock === 0);
  for (const p of outOfStock) {
    const pattern = new RegExp(`\\b${p.name}\\b`, 'gi');
    if (pattern.test(sanitized)) {
      return { valid: false, reason: "out_of_stock_suggested" };
    }
  }

  // 3. Detect invalid product names (prohibited products)
  const prohibited = allProducts.filter(
    (p: any) => !safeProducts.some((sp: any) => sp.id === p.id),
  );
  for (const p of prohibited) {
    const pattern = new RegExp(`\\b${p.name}\\b`, 'gi');
    if (pattern.test(sanitized)) {
      return { valid: false, reason: "invalid_product_name" };
    }
  }

  return { valid: true, sanitizedText: sanitized };
}

// ─── Phase 5: Response Assembly ──────────────────────────────────────────

function buildResponse(
  result: SkillResult,
  intent: string,
  memoryData?: any,
): any {
  let text = result.text;

  if (memoryData?.favorite_product) {
    text = `🔥 Sé que te gusta ${memoryData.favorite_product}\n\n` + text;
  }

  return {
    text,
    intent,
    cart: result.cart,
    type: result.type,
    actions: result.actions,
    nextState: result.nextState,
  };
}

// ─── Fallback ────────────────────────────────────────────────────────────

function fallbackResponse(): any {
  return {
    text: '¡Hola! 🔥 ¿En qué te puedo ayudar hoy?',
    intent: 'ERROR' as Intent,
    cart: { items: [], total: 0 },
    type: 'text',
    nextState: null,
  };
}

// ─── Composed Pipeline ───────────────────────────────────────────────────

const metrics = {
  track: (data: any) => {
    try {
      if (process.env.NODE_ENV !== 'test') {
        console.log(JSON.stringify({ event: 'METRICS_TRACK', ...data, timestamp: Date.now() }));
      }
    } catch (e) {
      // Must not break flow
    }
  }
};

export async function handleMessage(
  input: PipelineInput,
  memoryData?: any,
): Promise<any> {
  const { intent } = resolveIntent(
    input.message,
    input.conversationState,
  );

  const strategyContext: StrategyContext = {
    intent,
    memory: memoryData,
    inventory: input.inventory || { lowStock: [], highStock: [], outOfStock: [] },
    user: input.user || { isReturning: false },
    message: input.message,
    time: new Date(),
  };
  const strategy = decideStrategy(strategyContext) || "default";

  let skill = selectSkill(intent, strategy);

  try {
    metrics.track({ intent, strategy, skill });
  } catch (e) {
    // Ignore to not break flow
  }

  let result = await runSkill(skill, { ...input, memory: memoryData, intent }, strategy);
  let validation = validateResult(result, input.safeProducts, input.allProducts);

  if (!validation.valid) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(JSON.stringify({ event: 'VALIDATION_FAILED', reason: validation.reason, timestamp: Date.now() }));
    }
    
    // Recovery Phase (retry once)
    skill = selectSkill(intent, "recovery");
    result = await runSkill(skill, { ...input, memory: memoryData, intent }, "recovery");
    validation = validateResult(result, input.safeProducts, input.allProducts);

    if (!validation.valid) {
      return fallbackResponse();
    }
  }

  // Map internal pipeline intents to public intent values
  const PUBLIC_INTENT_MAP: Record<string, string> = {
    GREETING: 'SHOW_MENU',
    NEGATIVE: 'NEGATIVE',
    CONFIRM_EMPTY_CART: 'UNKNOWN',
  };
  const publicIntent = PUBLIC_INTENT_MAP[intent] || intent;
  const responseIntent =
    (skill === 'modular' || skill === 'productFlow')
      ? (result.nextState?.lastIntent as string) || publicIntent
      : publicIntent;

  return buildResponse(
    { ...result, text: validation.sanitizedText || result.text },
    responseIntent,
    memoryData,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Infrastructure Layer — wraps the pipeline with cross-cutting concerns
// ═══════════════════════════════════════════════════════════════════════════

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
  const cleanPhone = phone ? normalizePhone(phone) : 'anonymous';
  const activeTenantId = tenantId || 'snacks911';
  const traceId = `${cleanPhone}-${activeTenantId}-${Date.now()}`;

  if (process.env.NODE_ENV !== 'test') {
    console.log(JSON.stringify({
      event: 'PIPELINE_START',
      phone: cleanPhone,
      isWeb,
      traceId,
      timestamp: Date.now(),
    }));
  }

  try {
    // ── Tenant Resolution ─────────────────────────────────────────────
    let businessName = 'Snacks 911';
    try {
      const { getTenantBySlug } = await import('@/lib/tenant/tenantResolver');
      const tenant = await getTenantBySlug(activeTenantId);
      if (tenant) {
        businessName = tenant.business_name;
      } else if (process.env.NODE_ENV !== 'test') {
        console.warn(JSON.stringify({
          event: 'TENANT_NOT_FOUND',
          slug: activeTenantId,
          using: businessName,
          traceId,
          timestamp: Date.now(),
        }));
      }
    } catch (e) {
      const errorType = classifyError(e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (process.env.NODE_ENV !== 'test') {
        console.error(JSON.stringify({
          event: 'TENANT_RESOLUTION_ERROR',
          slug: activeTenantId,
          errorType,
          error: errorMsg,
          using: businessName,
          traceId,
          timestamp: Date.now(),
        }));
      }
      registerErrorEvent(errorType, 'botEngine:tenantResolution');
    }

    const config = getTenantConfig(activeTenantId);
    const context = getContext(cleanPhone, activeTenantId, businessName);

    // ── Memory Fetch ─────────────────────────────────────────────────
    let memoryData: any = {};
    if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NODE_ENV !== 'test') {
      try {
        const memoryRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/memory?phone=${cleanPhone}`,
        );
        if (memoryRes.ok) memoryData = await memoryRes.json();
      } catch (e) {
        console.error(JSON.stringify({
          event: 'MEMORY_FETCH_ERROR',
          phone: cleanPhone,
          error: String(e),
          timestamp: Date.now(),
        }));
      }
    }

    // ── Profile Fetch ────────────────────────────────────────────────
    let profile: any = null;
    if (cleanPhone && cleanPhone !== 'anonymous') {
      try {
        profile = await getCustomerProfileFromDB(cleanPhone);
      } catch {
        profile = null;
      }
    }

    // ── Restrictions Merge ───────────────────────────────────────────
    const intentCtx = resolveIntent(message, context);
    const detectedRestrictions = intentCtx.detectedRestrictions;
    const allRestrictions = [
      ...new Set([...(profile?.restrictions || []), ...detectedRestrictions]),
    ];

    // ── Product Fetch & Safety Filter ────────────────────────────────
    let products: any[] = await dbGetProductsSafe();
    if (!Array.isArray(products)) products = [];
    const safeProducts = filterProducts(products as any, allRestrictions);

    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({
        event: 'PRODUCTS_FILTERED',
        total: products.length,
        safe: safeProducts.length,
        timestamp: Date.now(),
      }));
    }

    // ── Build conversation state ─────────────────────────────────────
    const conversationState = {
      ...INITIAL_STATE,
      ...context,
      stage: context.flowState || (context as any).state || INITIAL_STATE.stage,
      allergies: allRestrictions,
    } as any;

    const inventory = {
      lowStock: products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5),
      highStock: products.filter(p => (p.stock || 0) >= 20),
      outOfStock: products.filter(p => (p.stock || 0) === 0)
    };
    const isReturning = !!profile;

    // ── Run Pipeline ─────────────────────────────────────────────────
    const response = await handleMessage(
      {
        message,
        conversationState,
        safeProducts,
        allProducts: products,
        inventory,
        user: { isReturning },
        config,
      },
      memoryData,
    );

    // ── Cost Estimate (non-blocking) ─────────────────────────────────
    const tokens_input = Math.ceil(message.length / 4);
    const tokens_output = Math.ceil(response.text.length / 4);
    const cost = (tokens_input + tokens_output) * 0.000002;

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[COST] $${cost.toFixed(6)} | Tokens: ${tokens_input + tokens_output} | Intent: ${response.intent}`);
    }

    if (process.env.NODE_ENV !== 'test') {
      import('@/lib/db.server').then(({ saveAiCost }) => {
        saveAiCost({
          user_id: cleanPhone,
          tokens_input,
          tokens_output,
          cost,
          intent: response.intent,
        }).catch((e: any) => console.error('[COST SAVE ERROR]', e));
      }).catch(() => {});
    }

    // ── Persist & Track ─────────────────────────────────────────────
    if (cleanPhone) {
      const persistData: any = { lastIntent: response.intent };
      
      // Persist cart from pipeline response back to context
      if (response.cart && Array.isArray(response.cart.items)) {
        persistData.cart = response.cart;
      } else if (response.nextState?.cart && Array.isArray(response.nextState.cart.items)) {
        persistData.cart = response.nextState.cart;
      }

      // Persist flow state
      if (response.nextState?.stage) {
        persistData.flowState = response.nextState.stage;
      }

      updateContext(cleanPhone, persistData);
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({
        traceId,
        userId: cleanPhone,
        channel: phone === 'web-user' ? 'web' : 'whatsapp',
        input: message,
        intent: response.intent,
        flowState: response.nextState?.stage || null,
        cart: response.nextState?.cart || [],
        total: response.nextState?.cartTotal || 0,
        productsShown: response.nextState?.lastProductsShown || [],
        timestamp: Date.now(),
      }, null, 2));
    }

    try {
      await saveAiLog({
        traceId,
        userId: cleanPhone,
        channel: phone === 'web-user' ? 'web' : 'whatsapp',
        input: message,
        intent: response.intent,
        flowState: response.nextState?.stage,
        cart: response.nextState?.cart,
        total: response.nextState?.cartTotal,
        productsShown: response.nextState?.lastProductsShown,
      });
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(JSON.stringify({
          event: 'LOG_SAVE_FAILED',
          error: String(e),
          timestamp: Date.now(),
        }));
      }
    }

    // ── Cart Abandonment Check (fire-and-forget) ────────────────────
    if (
      process.env.NODE_ENV !== 'test' &&
      response.intent !== 'CONFIRM_ORDER' &&
      response.intent !== 'VIEW_CART'
    ) {
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

    return response;
  } catch (error) {
    const errorType = classifyError(error);
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        event: 'FATAL_ERROR',
        errorType,
        error: String(error),
        traceId,
        phone: cleanPhone,
        timestamp: Date.now(),
      }));
    } else {
      console.error('[TEST FATAL ERROR]:', error);
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
      SAFE_MODE: '⚡ Tuvimos un detalle, pero seguimos 🔥\n¿En qué te puedo ayudar?',
      EMERGENCY_MODE: '🔥 Servicio disponible. Escríbenos por WhatsApp para atenderte de inmediato.',
    };

    return {
      text: fallbackMap[systemMode],
      intent: 'ERROR' as Intent,
      cart: { items: [], total: 0 },
      type: 'text',
      nextState: getContext(cleanPhone),
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

export type Strategy =
  | "repeat_order"
  | "upsell_high_margin"
  | "scarcity_push"
  | "combo_push"
  | "budget_mode"
  | "explore_menu"
  | "recovery"
  | "default";

export interface StrategyContext {
  intent: string;
  memory?: {
    lastOrder?: any;
    lastOrderAt?: Date | string | number;
  };
  inventory: {
    lowStock: any[];
    highStock: any[];
    outOfStock: any[];
  };
  user: {
    isReturning: boolean;
  };
  message: string;
  time: Date;
}

export function decideStrategy(ctx: StrategyContext): Strategy {
  const isEvening = ctx.time.getHours() >= 17;
  const hasLowStock = ctx.inventory.lowStock.length > 0;
  const hasHighStock = ctx.inventory.highStock.length > 0;
  const msgLower = ctx.message.toLowerCase();

  // If returning user + greeting + lastOrder -> "repeat_order"
  if (ctx.user.isReturning && ctx.intent === "greeting" && ctx.memory?.lastOrder) {
    return "repeat_order";
  }

  // If lowStock exists and time is evening -> "scarcity_push"
  if (hasLowStock && isEvening) {
    return "scarcity_push";
  }

  // If highStock exists and intent is recommendation -> "upsell_high_margin"
  if (hasHighStock && ctx.intent === "recommendation") {
    return "upsell_high_margin";
  }

  // If intent is recommendation -> "combo_push"
  if (ctx.intent === "recommendation") {
    return "combo_push";
  }

  // If message includes "barato" or "económico" -> "budget_mode"
  if (msgLower.includes("barato") || msgLower.includes("económico") || msgLower.includes("economico")) {
    return "budget_mode";
  }

  // If intent is confusion -> "recovery"
  if (ctx.intent === "confusion") {
    return "recovery";
  }

  // Otherwise -> "default"
  return "default";
}
