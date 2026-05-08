/**
 * core/context.ts — Single source of truth for chatbot context.
 * All cart operations use getContext(userId) and updateContext(userId).
 */

import { OrderState } from './orderFlow';
import { Cart, CartItem, UserContext as CoreUserContext } from './types';

export interface UserContext extends CoreUserContext {
  phone: string;
  lastIntent?: string;
  lastCategory?: string;
  constraints?: string[];
  lastProductsShown?: string[];
  lastInteraction: number;
  recommendedProducts?: any[];
  lastAddedProductId?: string | number;
  lastAddTimestamp?: number;
  flowState?: OrderState;
}

const sessionStore = new Map<string, UserContext>();

/**
 * Validates a cart structure.
 */
export function isValidCart(cart: any): cart is Cart {
  return (
    cart &&
    typeof cart === 'object' &&
    Array.isArray(cart.items) &&
    typeof cart.total === 'number'
  );
}

/**
 * Retrieves or creates a session for the given phone number.
 */
export function getContext(phone: string): UserContext {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (!sessionStore.has(cleanPhone)) {
    sessionStore.set(cleanPhone, {
      userId: cleanPhone,
      phone: cleanPhone,
      state: 'inicio',
      cart: { items: [], total: 0 },
      lastInteraction: Date.now(),
      recommendedProducts: []
    });
  }
  
  const ctx = sessionStore.get(cleanPhone)!;
  ctx.lastInteraction = Date.now();

  // Enforce valid structure
  if (!isValidCart(ctx.cart)) {
    console.warn("[CONTEXT] Resetting invalid cart for:", cleanPhone);
    ctx.cart = { items: [], total: 0 };
  }

  return ctx;
}

/**
 * Updates context for a given phone number with partial data.
 */
export function updateContext(phone: string, data: Partial<UserContext>): void {
  const ctx = getContext(phone);

  if (data.cart && !isValidCart(data.cart)) {
    console.warn("[CONTEXT] Rejected invalid cart update for:", phone);
    delete data.cart;
  }

  sessionStore.set(phone, {
    ...ctx,
    ...data,
    cart: data.cart || ctx.cart,
    lastInteraction: Date.now()
  });
}

/**
 * Clears the session's cart (keeps other data).
 */
export function clearContext(phone: string): void {
  const ctx = getContext(phone);
  ctx.cart.items = [];
  ctx.cart.total = 0;
}

/**
 * Completely removes session (use on order completion).
 */
export function deleteContext(phone: string): void {
  sessionStore.delete(phone);
}
