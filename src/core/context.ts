/**
 * core/context.ts — Single source of truth for chatbot context.
 * All cart operations use getContext(userId) and updateContext(userId).
 */

import { OrderState } from './orderFlow';
import { Cart, CartItem, UserContext as CoreUserContext } from './types';

export type PaymentStatus = 'awaiting_payment' | 'payment_confirmed' | 'payment_expired';

export interface UserContext extends CoreUserContext {
  phone: string;
  tenantId: string;
  businessName: string;
  lastIntent?: string;
  lastCategory?: string;
  constraints?: string[];
  lastProductsShown?: string[];
  lastInteraction: number;
  recommendedProducts?: any[];
  lastAddedProductId?: string | number;
  lastAddTimestamp?: number;
  /** Processed action IDs for idempotency (last 50) */
  processedActionIds?: string[];
  flowState?: OrderState;
  paymentUrl?: string;
  conektaOrderId?: string;
  paymentExpiresAt?: string;
  paymentOrderId?: string;
  paymentStatus?: PaymentStatus;
  /** Rule IDs already shown this session — prevents repeating upsells */
  upsellShownRules?: string[];
  /** Serialized UpsellSuggestion waiting for customer reply */
  pendingUpsell?: any;
  /** Pending loyalty redemption data { points, amount, tempOrderId } */
  pendingLoyaltyDiscount?: { points: number; amount: number; tempOrderId: string };
  /** Flag to prevent repeating the loyalty prompt at checkout */
  loyaltyPromptShown?: boolean;
  /** Order ID currently being reviewed */
  lastReviewOrderId?: string;
  /** Pending referral discount amount */
  pendingReferralDiscount?: number;
  /** Referral code used */
  appliedReferralCode?: string;
  /** Flag to track if we've asked for a referral code in this session */
  referralPromptShown?: boolean;
}

const MAX_ACTION_IDS = 50;
const DEDUP_WINDOW_MS = 1000;

/**
 * Checks if an action has already been processed for this user.
 * Returns false and tracks it if not yet processed.
 */
export function checkAndTrackAction(ctx: UserContext, actionId: string): boolean {
  if (!actionId) return false;
  if (!ctx.processedActionIds) ctx.processedActionIds = [];
  if (ctx.processedActionIds.includes(actionId)) return true;
  ctx.processedActionIds.push(actionId);
  if (ctx.processedActionIds.length > MAX_ACTION_IDS) {
    ctx.processedActionIds = ctx.processedActionIds.slice(-MAX_ACTION_IDS);
  }
  return false;
}

/**
 * Returns true if the same product was added within the dedup window.
 * When true, the caller should increment quantity instead of adding a new item.
 */
export function isDuplicateAdd(ctx: UserContext, productId: string | number): boolean {
  const now = Date.now();
  return (
    ctx.lastAddedProductId != null &&
    String(ctx.lastAddedProductId) === String(productId) &&
    ctx.lastAddTimestamp != null &&
    now - ctx.lastAddTimestamp < DEDUP_WINDOW_MS
  );
}

/**
 * Records that a product was added to cart (for dedup tracking).
 */
export function trackProductAdd(ctx: UserContext, productId: string | number): void {
  ctx.lastAddedProductId = productId;
  ctx.lastAddTimestamp = Date.now();
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
 * Retrieves or creates a session for the given phone number and tenant.
 */
export function getContext(phone: string, tenantId?: string, businessName?: string): UserContext {
  const cleanPhone = phone.replace(/\D/g, '');
  const activeTenantId = tenantId || 'snacks911';
  const activeBusinessName = businessName || 'Snacks 911';
  
  if (!sessionStore.has(cleanPhone)) {
    sessionStore.set(cleanPhone, {
      userId: cleanPhone,
      phone: cleanPhone,
      tenantId: activeTenantId,
      businessName: activeBusinessName,
      state: 'inicio',
      cart: { items: [], total: 0 },
      lastInteraction: Date.now(),
      recommendedProducts: []
    } as any);
  }
  
  const ctx = sessionStore.get(cleanPhone)!;
  
  // If tenant mismatch, reset session
  if (tenantId && ctx.tenantId !== tenantId) {
    console.warn(`[CONTEXT] Tenant mismatch for ${cleanPhone}. Resetting session.`);
    ctx.tenantId = tenantId;
    ctx.businessName = activeBusinessName;
    ctx.cart = { items: [], total: 0 };
    ctx.state = 'inicio';
  }

  ctx.lastInteraction = Date.now();
  return ctx;
}

/**
 * Updates context for a given phone number with partial data.
 */
export function updateContext(phone: string, data: Partial<UserContext>): void {
  const ctx = getContext(phone, data.tenantId, data.businessName);

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
  const cleanPhone = phone.replace(/\D/g, '');
  const ctx = getContext(cleanPhone);
  ctx.cart.items = [];
  ctx.cart.total = 0;
}

/**
 * Completely removes session (use on order completion).
 */
export function deleteContext(phone: string): void {
  const cleanPhone = phone.replace(/\D/g, '');
  sessionStore.delete(cleanPhone);
}
