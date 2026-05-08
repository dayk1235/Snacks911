/**
 * lib/upsell/upsellEngine.ts
 *
 * Context-aware upsell engine for Snacks 911.
 *
 * Rules (evaluated in priority order, max 1 suggestion per conversation):
 *   1. No beverage in cart              → suggest Coca-Cola $25
 *   2. "somos dos" / "para dos"         → suggest extra papas $60
 *   3. Wings (alitas) in cart           → suggest extra aderezo $15
 *   4. Boneless in cart                 → suggest bebida $25
 *   5. After 8pm & postre available     → suggest postre
 *
 * Idempotency: once a suggestion is shown for a session, it is never repeated.
 * All accept/reject events are persisted in `upsell_events` for analytics.
 */

const isServer = typeof window === 'undefined';

// ─── Utility ──────────────────────────────────────────────────────────────────
async function getAdmin() {
  if (!isServer) return null;
  const { getSupabaseAdmin } = await import('@/lib/db.server');
  return getSupabaseAdmin();
}
import { normalizeText } from '@/lib/utils/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpsellRuleId =
  | 'no_beverage'
  | 'party_of_two'
  | 'wings_sauce'
  | 'boneless_drink'
  | 'late_night_dessert';

export interface UpsellSuggestion {
  ruleId: UpsellRuleId;
  productName: string;
  price: number;
  message: string;
  /** Synthetic product stub to push into cart on accept */
  cartItem: {
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
  };
}

export interface CartItem {
  id?: string;
  productId?: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface HandleUpsellResult {
  accepted: boolean;
  updatedCart?: Cart;
  nextMessage: string;
}

// ─── Spanish accept / reject words ───────────────────────────────────────────

const ACCEPT_WORDS = new Set([
  'si', 'sí', 'dale', 'ok', 'va', 'bueno', 'claro', 'porfa',
  'por favor', 'sale', 'ándale', 'andale', 'sip', 'yep', 'yeah', 'yes',
  'agrega', 'agrégalo', 'ponlo', 'quiero', 'me late',
]);

const REJECT_WORDS = new Set([
  'no', 'nel', 'nop', 'nope', 'gracias', 'no gracias', 'paso',
  'sin', 'omitir', 'omite', 'no quiero', 'mejor no', 'nadamas',
  'nada mas', 'suficiente', 'estoy bien',
]);

// ─── Utility ──────────────────────────────────────────────────────────────────

function hasCategory(items: CartItem[], ...cats: string[]): boolean {
  return items.some(i =>
    cats.some(c => String(i.category || '').toLowerCase().includes(c.toLowerCase()))
  );
}

function hasName(items: CartItem[], ...keywords: string[]): boolean {
  return items.some(i =>
    keywords.some(k => String(i.name || '').toLowerCase().includes(k.toLowerCase()))
  );
}

function hasBeverage(items: CartItem[]): boolean {
  return (
    hasCategory(items, 'bebida', 'bebidas', 'drink') ||
    hasName(items, 'coca', 'refresco', 'sprite', 'fanta', 'manzanita', 'agua', 'bebida')
  );
}

function hasPostre(items: CartItem[]): boolean {
  return (
    hasCategory(items, 'postre', 'dessert') ||
    hasName(items, 'brownie', 'helado', 'postre', 'churro')
  );
}

function alreadySuggested(history: string[], ruleId: UpsellRuleId): boolean {
  return history.includes(ruleId);
}

// ─── Rule evaluators ──────────────────────────────────────────────────────────

function ruleNoBeverage(cart: Cart, history: string[]): UpsellSuggestion | null {
  if (alreadySuggested(history, 'no_beverage')) return null;
  if (cart.items.length === 0) return null;
  if (hasBeverage(cart.items)) return null;

  return {
    ruleId: 'no_beverage',
    productName: 'Coca-Cola 400ml',
    price: 25,
    message: '🥤 ¿Le agregamos una *Coca-Cola* para acompañar tu pedido? Solo $25 más.',
    cartItem: {
      id: 'coca-cola-upsell',
      productId: 'coca-cola-upsell',
      name: 'Coca-Cola 400ml',
      price: 25,
      quantity: 1,
      category: 'bebidas',
    },
  };
}

function rulePartyOfTwo(cart: Cart, history: string[], conversationText: string): UpsellSuggestion | null {
  if (alreadySuggested(history, 'party_of_two')) return null;

  const lower = normalizeText(conversationText);
  const partyPhrases = [
    'somos dos', 'para dos', 'para 2', 'dos personas',
    'mi pareja', 'mi novio', 'mi novia', 'mi amigo', 'mi amiga',
    'compartir', 'compartimos',
  ];

  const isPartyOfTwo = partyPhrases.some(p => lower.includes(p));
  if (!isPartyOfTwo) return null;

  // Check they don't already have extra papas
  const papaCount = cart.items.filter(i =>
    String(i.category || '').toLowerCase().includes('papas') ||
    String(i.name || '').toLowerCase().includes('papas')
  ).length;
  if (papaCount >= 2) return null;

  return {
    ruleId: 'party_of_two',
    productName: 'Papas Gajo Extra',
    price: 60,
    message: '🍟 ¡Si son dos, con unas *Papas Gajo extra* ($60) no les falta nada! ¿Las agregamos?',
    cartItem: {
      id: 'papas-gajo-extra-upsell',
      productId: 'papas-gajo-extra-upsell',
      name: 'Papas Gajo Extra',
      price: 60,
      quantity: 1,
      category: 'papas',
    },
  };
}

function ruleWingsSauce(cart: Cart, history: string[]): UpsellSuggestion | null {
  if (alreadySuggested(history, 'wings_sauce')) return null;

  const hasWings =
    hasCategory(cart.items, 'proteina') ||
    hasName(cart.items, 'alita', 'wing', 'alitas');

  if (!hasWings) return null;

  // Don't suggest if they already have a sauce extra
  const hasSauce = hasName(cart.items, 'aderezo', 'salsa', 'dip');
  if (hasSauce) return null;

  return {
    ruleId: 'wings_sauce',
    productName: 'Aderezo Extra',
    price: 15,
    message: '🧀 ¿Quieres un *Aderezo Extra* para tus alitas? Solo $15. ¡Las hace mucho mejores!',
    cartItem: {
      id: 'aderezo-extra-upsell',
      productId: 'aderezo-extra-upsell',
      name: 'Aderezo Extra',
      price: 15,
      quantity: 1,
      category: 'extras',
    },
  };
}

function ruleBonelessDrink(cart: Cart, history: string[]): UpsellSuggestion | null {
  if (alreadySuggested(history, 'boneless_drink')) return null;

  const hasBoneless = hasName(cart.items, 'boneless');
  if (!hasBoneless) return null;
  if (hasBeverage(cart.items)) return null;

  return {
    ruleId: 'boneless_drink',
    productName: 'Refresco 400ml',
    price: 25,
    message: '🥤 Los Boneless con refresco son *perfectos*. ¿Agregamos uno por $25?',
    cartItem: {
      id: 'refresco-boneless-upsell',
      productId: 'refresco-boneless-upsell',
      name: 'Refresco 400ml',
      price: 25,
      quantity: 1,
      category: 'bebidas',
    },
  };
}

function ruleLateNightDessert(
  cart: Cart,
  history: string[],
  hour: number,
  availableProductNames: string[],
): UpsellSuggestion | null {
  if (alreadySuggested(history, 'late_night_dessert')) return null;
  if (hour < 20) return null; // Only after 8pm
  if (hasPostre(cart.items)) return null;

  // Check if any dessert is available
  const dessertNames = ['brownie', 'helado', 'postre', 'churro'];
  const availableDessert = availableProductNames.find(name =>
    dessertNames.some(d => name.toLowerCase().includes(d))
  );
  if (!availableDessert) return null;

  return {
    ruleId: 'late_night_dessert',
    productName: availableDessert,
    price: 59,
    message: `🍫 Ya es tarde y se antoja algo dulce. ¿Le pongo un *${availableDessert}* para cerrar con broche de oro? ($59)`,
    cartItem: {
      id: 'postre-late-upsell',
      productId: 'postre-late-upsell',
      name: availableDessert,
      price: 59,
      quantity: 1,
      category: 'postres',
    },
  };
}

// ─── Main: getUpsellSuggestions ───────────────────────────────────────────────

/**
 * Evaluates all upsell rules and returns at most one suggestion.
 *
 * @param cart              Current cart from UserContext
 * @param history           Array of ruleIds already shown this session (from context)
 * @param hour              Current hour (0-23, local server time)
 * @param conversationText  Full raw message text for party-of-two detection
 * @param availableProducts List of available product names from DB (for dessert rule)
 */
export async function getUpsellSuggestions(
  cart: Cart,
  history: string[],
  hour: number,
  conversationText = '',
  availableProducts: string[] = [],
): Promise<UpsellSuggestion | null> {
  // Evaluate rules in priority order — return first match
  return (
    rulePartyOfTwo(cart, history, conversationText) ??
    ruleWingsSauce(cart, history) ??
    ruleBonelessDrink(cart, history) ??
    ruleNoBeverage(cart, history) ??
    ruleLateNightDessert(cart, history, hour, availableProducts) ??
    null
  );
}

// ─── handleUpsellResponse ─────────────────────────────────────────────────────

/**
 * Parses the customer's reply to an upsell prompt.
 * Returns accepted flag, optional updated cart, and a response message.
 *
 * DOES NOT mutate the cart directly — caller must apply updatedCart to context.
 */
export function handleUpsellResponse(
  sessionId: string,
  message: string,
  suggestion: UpsellSuggestion,
  currentCart: Cart,
): HandleUpsellResult {
  const normalized = normalizeText(message.trim());

  const accepted =
    ACCEPT_WORDS.has(normalized) ||
    normalized.includes(suggestion.productName.toLowerCase().split(' ')[0]);

  const rejected =
    REJECT_WORDS.has(normalized) ||
    normalized === '0' ||
    normalized.startsWith('no ');

  // Explicit decline
  if (rejected && !accepted) {
    trackUpsellEvent(sessionId, suggestion.ruleId, false, suggestion.price).catch(() => {});
    return {
      accepted: false,
      nextMessage: '👌 Perfecto. ¿Quieres confirmar tu pedido o agregar algo más?',
    };
  }

  // Accepted (or ambiguous — lean toward accept for conversion)
  if (accepted) {
    const updatedItems = [...currentCart.items, suggestion.cartItem];
    const updatedCart: Cart = {
      items: updatedItems,
      total: currentCart.total + suggestion.price,
    };

    trackUpsellEvent(sessionId, suggestion.ruleId, true, suggestion.price).catch(() => {});

    return {
      accepted: true,
      updatedCart,
      nextMessage: `✅ ¡Listo! *${suggestion.productName}* (+$${suggestion.price}) agregado.\n\n¿Confirmamos tu pedido?`,
    };
  }

  // Unrecognized — ask once more
  return {
    accepted: false,
    nextMessage: `¿Quieres agregar *${suggestion.productName}* ($${suggestion.price})? Responde *sí* o *no*.`,
  };
}

// ─── Supabase analytics ───────────────────────────────────────────────────────

/**
 * Persists an upsell accept/reject event for conversion analytics.
 * Non-blocking — errors are silently logged.
 */
export async function trackUpsellEvent(
  sessionId: string,
  ruleId: UpsellRuleId,
  accepted: boolean,
  amount: number,
): Promise<void> {
  if (!isServer) return; // Browser tracking should go through an API route if needed
  try {
    const supabase = await getAdmin();
    if (!supabase) return;
    await supabase.from('upsell_events').insert({
      session_id: sessionId,
      rule_id: ruleId,
      accepted,
      amount,
    });
  } catch (err) {
    console.error('[upsellEngine] trackUpsellEvent error:', err);
  }
}
