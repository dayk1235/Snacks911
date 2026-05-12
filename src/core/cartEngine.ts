/**
 * core/cartEngine.ts — Cart business logic (pure TypeScript).
 *
 * No React, no DOM, no side effects.
 * Input → Output only.
 *
 * Handles:
 *   - Add/remove items
 *   - Update quantities
 *   - Calculate totals
 *   - Cart persistence serialization
 */

import type { CartItem, CartState, CoreProduct } from './types';
import type { UserContext } from './context';
import { isDuplicateAdd, trackProductAdd } from './context';

/**
 * Create empty cart state.
 */
export function createEmptyCart(): CartState {
  return { items: [], totalItems: 0, totalPrice: 0 };
}

/**
 * Add a product to cart. Returns new CartState (immutable).
 */
export function addCartStateItem(
  state: CartState,
  product: CoreProduct | Omit<CartItem, 'quantity'>,
): CartState {
  const newItem: CartItem = {
    id: String(product.id),
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    image: (product as CoreProduct).imageUrl ?? (product as CartItem).image ?? '',
    quantity: 1,
    ingredients: product.ingredients || [],
    linkedExtras: (product as any).linkedExtras,
    isStandaloneExtra: (product as any).isStandaloneExtra,
  };

  const existing = state.items.find(i => i.id === newItem.id);
  const items = existing
    ? state.items.map(i => i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i)
    : [...state.items, newItem];

  return recalculate(items);
}

/**
 * Update item quantity. Returns new CartState (immutable).
 * Removes item if quantity <= 0.
 */
export function updateQuantity(
  state: CartState,
  id: string,
  delta: number,
): CartState {
  const items = state.items
    .map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
    .filter(item => item.quantity > 0);

  return recalculate(items);
}

/**
 * Remove item from cart by ID.
 */
export function removeFromCart(
  state: CartState,
  id: string,
): CartState {
  const items = state.items.filter(item => item.id !== id);
  return recalculate(items);
}

/**
 * Clear cart completely.
 */
export function clearCart(): CartState {
  return createEmptyCart();
}

/**
 * Recalculate totals from items.
 */
export function recalculate(items: CartItem[]): CartState {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items, totalItems, totalPrice };
}

/**
 * Serialize cart to localStorage-compatible string.
 */
export function serializeCart(state: CartState): string {
  return JSON.stringify(state.items);
}

/**
 * Deserialize cart from localStorage string.
 */
export function deserializeCart(raw: string | null): CartState {
  if (!raw) return createEmptyCart();
  try {
    const items = JSON.parse(raw) as CartItem[];
    return recalculate(items);
  } catch {
    return createEmptyCart();
  }
}

/**
 * Check if cart has items.
 */
export function hasItems(state: CartState): boolean {
  return state.items.length > 0;
}

/**
 * Get cart item count for a specific product ID.
 */
export function getItemQuantity(state: CartState, id: string): number {
  return state.items.find(i => i.id === id)?.quantity ?? 0;
}

/**
 * Check if cart contains a product category.
 */
export function hasCategory(state: CartState, category: string): boolean {
  return state.items.some(i => i.category === category);
}

/**
 * Get suggested upsell products based on cart contents.
 * Returns product IDs that complement what's in cart.
 */
export function getSuggestedUpsell(state: CartState, allProducts: CoreProduct[]): CoreProduct[] {
  const categoriesInCart = new Set(state.items.map(i => i.category));
  const suggestedIds: string[] = [];

  // If wings/boneless in cart → suggest papas or drinks
  if (categoriesInCart.has('proteina')) {
    suggestedIds.push('5', '6'); // Papas Gajo + Papas Loaded
  } else if (categoriesInCart.has('papas')) {
    suggestedIds.push('1', '3'); // Alitas BBQ + Boneless Clásico
  } else if (categoriesInCart.has('combos')) {
    suggestedIds.push('6'); // Papas Loaded
  }

  return allProducts.filter(p => suggestedIds.includes(String(p.id)));
}

/**
 * Build WhatsApp URL from cart contents.
 */
export function buildWhatsAppUrl(
  state: CartState,
  phoneNumber: string,
  businessName: string = 'SABOR 911',
): string {
  const mainItems = state.items.filter(i => !i.isStandaloneExtra);
  const extraItems = state.items.filter(i => i.isStandaloneExtra);

  const productLines = mainItems.map(i => {
    let line = `• ${i.name} x${i.quantity} — $${i.price * i.quantity}`;
    if (i.linkedExtras && i.linkedExtras.length > 0) {
      line += `\n   ↳ Con extras: ${i.linkedExtras.join(', ')}`;
    }
    return line;
  });

  const extraLines = extraItems.map(i =>
    `  + ${i.name} x${i.quantity} — $${i.price * i.quantity}`
  );

  let message = `🚨 *PEDIDO ${businessName.toUpperCase()}*\n\n`;

  if (productLines.length > 0) {
    message += `*🍗 Productos:*\n${productLines.join('\n')}\n`;
  }

  if (extraLines.length > 0) {
    message += `\n*🍋 Extras adicionales:*\n${extraLines.join('\n')}\n`;
  }

  message += `\n💰 *Total: $${state.totalPrice}*\n\n¡Quiero hacer este pedido!`;

  const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
}

/**
 * CONTEXT-AWARE OPERATIONS
 * These functions work directly with the UserContext from userContext.ts
 */

export function addToCart(context: any, product: any) {
  // Enforce valid structure before operation
  if (!context.cart || !Array.isArray(context.cart.items)) {
    context.cart = { items: [], total: 0 };
  }

  if (typeof context.cart.total !== 'number') {
    context.cart.total = 0;
  }

  // Sanitize input
  const productId = String(product.id || 'unknown');
  const price = Number(product.price || 0);
  const name = String(product.name || 'Producto');

  // Idempotency: duplicate add within 1s → increment quantity only
  const isDupe = isDuplicateAdd(context, productId);

  const existing = context.cart.items.find((i: any) => i.productId === productId || i.id === productId);

  if (existing) {
    existing.qty = (existing.qty ?? 0) + 1;
    existing.quantity = existing.qty;
  } else if (!isDupe) {
    // Only push a new item if this is NOT a duplicate tap
    context.cart.items.push({
      id: productId,
      productId,
      name,
      price,
      quantity: 1,
      qty: 1,
      category: product.category || 'unknown',
    });
  }
  // If isDupe and no existing item: item was already added, skip push

  context.cart.total += price;
  trackProductAdd(context, productId);
}

export function getCartSummary(context: any) {
  if (!context.cart || !Array.isArray(context.cart.items) || context.cart.items.length === 0) {
    return 'Tu carrito está vacío 😅';
  }

  const items = context.cart.items
    .map((i: any) => `- ${i.name} x${i.qty}`)
    .join('\n');

  return `🧾 Tu pedido:\n${items}\n\nTotal: $${context.cart.total}`;
}

export function getCartContext(context: UserContext) {
  if (!context.cart || !Array.isArray(context.cart.items)) {
    context.cart = { items: [], total: 0 };
  }
  return context.cart;
}

export function clearCartContext(context: UserContext) {
  context.cart = { items: [], total: 0 };
}
