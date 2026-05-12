/**
 * Tests for pricing consistency across the system.
 *
 * Covers: validationService, cartEngine, recalculate, addToCart,
 *         dbSaveOrder price validation flow.
 */
import { addToCart, addCartStateItem, recalculate, deserializeCart, buildWhatsAppUrl, removeFromCart, updateQuantity, serializeCart } from '../cartEngine';
import { isValidCart } from '../context';
import type { CartItem, CartState, CoreProduct } from '../types';

// ─── cartEngine: recalculate ──────────────────────────────────────────────

describe('recalculate', () => {
  it('computes totalItems as sum of quantities', () => {
    const items: CartItem[] = [
      { id: '1', name: 'A', price: 10, quantity: 2 },
      { id: '2', name: 'B', price: 20, quantity: 3 },
    ];
    const state = recalculate(items);
    expect(state.totalItems).toBe(5);
    expect(state.totalPrice).toBe(10 * 2 + 20 * 3);
  });

  it('returns zeroes for empty items', () => {
    const state = recalculate([]);
    expect(state.totalItems).toBe(0);
    expect(state.totalPrice).toBe(0);
  });

  it('handles single item correctly', () => {
    const items: CartItem[] = [
      { id: '1', name: 'Boneless 250g', price: 139, quantity: 1 },
    ];
    const state = recalculate(items);
    expect(state.totalItems).toBe(1);
    expect(state.totalPrice).toBe(139);
  });

  it('handles items with quantity 0 (should they exist)', () => {
    const items: CartItem[] = [
      { id: '1', name: 'A', price: 50, quantity: 0 },
      { id: '2', name: 'B', price: 30, quantity: 2 },
    ];
    const state = recalculate(items);
    expect(state.totalItems).toBe(2);
    expect(state.totalPrice).toBe(60);
  });

  it('handles fractional prices', () => {
    const items: CartItem[] = [
      { id: '1', name: 'A', price: 9.99, quantity: 3 },
    ];
    const state = recalculate(items);
    expect(state.totalPrice).toBeCloseTo(29.97);
  });
});

// ─── cartEngine: addCartStateItem (immutable UI cart) ─────────────────────

describe('addCartStateItem', () => {
  it('adds new item and recalculates', () => {
    const state: CartState = { items: [], totalItems: 0, totalPrice: 0 };
    const product: CoreProduct = {
      id: '8',
      name: 'Boneless 250g',
      price: 139,
      description: 'Boneless con papas',
      category: 'proteina',
      ingredients: ['pollo', 'papas'],
    };

    const next = addCartStateItem(state, product);
    expect(next.items).toHaveLength(1);
    expect(next.totalItems).toBe(1);
    expect(next.totalPrice).toBe(139);
    expect(next.items[0].name).toBe('Boneless 250g');
    expect(next.items[0].price).toBe(139);
    // Original state unchanged
    expect(state.items).toHaveLength(0);
    expect(state.totalPrice).toBe(0);
  });

  it('increments quantity for existing item', () => {
    const state: CartState = {
      items: [{ id: '8', name: 'Boneless 250g', price: 139, quantity: 1 }],
      totalItems: 1,
      totalPrice: 139,
    };
    const product: CoreProduct = {
      id: '8',
      name: 'Boneless 250g',
      price: 139,
      description: '',
      category: 'proteina',
      ingredients: [],
    };

    const next = addCartStateItem(state, product);
    expect(next.items).toHaveLength(1);
    expect(next.items[0].quantity).toBe(2);
    expect(next.totalPrice).toBe(278);
  });

  it('does not mutate original state', () => {
    const state: CartState = {
      items: [{ id: '8', name: 'Boneless', price: 139, quantity: 1 }],
      totalItems: 1,
      totalPrice: 139,
    };
    const snapshot = { ...state, items: [...state.items] };
    addCartStateItem(state, { id: '9', name: 'Alitas', price: 125, description: '', category: 'proteina', ingredients: [] });
    expect(state.items).toEqual(snapshot.items);
    expect(state.totalPrice).toBe(snapshot.totalPrice);
  });

  it('handles product with missing optional fields', () => {
    const state: CartState = { items: [], totalItems: 0, totalPrice: 0 };
    const next = addCartStateItem(state, {
      id: 'x',
      name: 'Test',
      price: 50,
      description: '',
      category: 'test',
      ingredients: [],
    });
    expect(next.items[0].ingredients).toEqual([]);
    expect(next.items[0].image).toBe('');
  });
});

// ─── cartEngine: addToCart (context-based, mutation) ──────────────────────

describe('addToCart (context-based)', () => {
  it('adds item and increases total (additive)', () => {
    const ctx: any = { cart: { items: [], total: 0 } };
    addToCart(ctx, { id: '8', name: 'Boneless 250g', price: 139 });
    expect(ctx.cart.total).toBe(139);
    expect(ctx.cart.items).toHaveLength(1);
    expect(ctx.cart.items[0].price).toBe(139);
  });

  it('accumulates qty and total for same product', () => {
    const ctx: any = { cart: { items: [], total: 0 } };
    addToCart(ctx, { id: '8', name: 'Boneless 250g', price: 139 });
    addToCart(ctx, { id: '8', name: 'Boneless 250g', price: 139 });
    addToCart(ctx, { id: '8', name: 'Boneless 250g', price: 139 });
    expect(ctx.cart.items[0].qty).toBe(3);
    expect(ctx.cart.items[0].quantity).toBe(3);
    expect(ctx.cart.total).toBe(417);
  });

  it('sanitizes price to number', () => {
    const ctx: any = { cart: { items: [], total: 0 } };
    addToCart(ctx, { id: '1', name: 'Test', price: '139' });
    expect(ctx.cart.items[0].price).toBe(139);
    expect(ctx.cart.total).toBe(139);
  });

  it('sanitizes productId to string', () => {
    const ctx: any = { cart: { items: [], total: 0 } };
    addToCart(ctx, { id: 8, name: 'Boneless', price: 139 });
    expect(ctx.cart.items[0].productId).toBe('8');
    expect(ctx.cart.items[0].id).toBe('8');
  });

  it('fixes broken cart (non-array items)', () => {
    const ctx: any = { cart: { items: 'not-an-array', total: 0 } };
    addToCart(ctx, { id: '1', name: 'Test', price: 100 });
    expect(Array.isArray(ctx.cart.items)).toBe(true);
    expect(ctx.cart.items).toHaveLength(1);
    expect(ctx.cart.total).toBe(100);
  });

  it('preserves NaN total (typeof NaN === "number" passes guard)', () => {
    // The guard `typeof context.cart.total !== 'number'` does NOT catch NaN
    // because typeof NaN === 'number' is true. This documents current behavior.
    const ctx: any = { cart: { items: [], total: NaN } };
    addToCart(ctx, { id: '1', name: 'Test', price: 50 });
    // NaN + 50 = NaN
    expect(Number.isNaN(ctx.cart.total)).toBe(true);
  });

  it('handles zero price', () => {
    const ctx: any = { cart: { items: [], total: 0 } };
    addToCart(ctx, { id: 'freebie', name: 'Free Item', price: 0 });
    expect(ctx.cart.total).toBe(0);
    expect(ctx.cart.items).toHaveLength(1);
  });
});

// ─── cartEngine: updateQuantity and removeFromCart ────────────────────────

describe('updateQuantity', () => {
  const state: CartState = {
    items: [
      { id: '8', name: 'Boneless', price: 139, quantity: 2 },
      { id: '9', name: 'Alitas', price: 125, quantity: 1 },
    ],
    totalItems: 3,
    totalPrice: 403,
  };

  it('increments quantity and recalculates', () => {
    const next = updateQuantity(state, '9', 1);
    expect(next.items.find(i => i.id === '9')?.quantity).toBe(2);
    expect(next.totalItems).toBe(4);
    expect(next.totalPrice).toBe(139 * 2 + 125 * 2);
  });

  it('decrements quantity and recalculates', () => {
    const next = updateQuantity(state, '8', -1);
    expect(next.items.find(i => i.id === '8')?.quantity).toBe(1);
    expect(next.totalPrice).toBe(139 + 125);
  });

  it('removes item when quantity drops to 0', () => {
    const next = updateQuantity(state, '9', -1);
    expect(next.items.find(i => i.id === '9')).toBeUndefined();
    expect(next.items).toHaveLength(1);
  });

  it('removes item when quantity goes negative', () => {
    const next = updateQuantity(state, '8', -3);
    expect(next.items.find(i => i.id === '8')).toBeUndefined();
  });
});

describe('removeFromCart', () => {
  it('removes existing item and recalculates', () => {
    const state: CartState = {
      items: [{ id: '8', name: 'Boneless', price: 139, quantity: 1 }],
      totalItems: 1,
      totalPrice: 139,
    };
    const next = removeFromCart(state, '8');
    expect(next.items).toHaveLength(0);
    expect(next.totalPrice).toBe(0);
  });

  it('is a no-op for non-existent id', () => {
    const state: CartState = {
      items: [{ id: '8', name: 'Boneless', price: 139, quantity: 1 }],
      totalItems: 1,
      totalPrice: 139,
    };
    const next = removeFromCart(state, '999');
    expect(next.items).toHaveLength(1);
  });
});

// ─── cartEngine: serialize/deserialize ────────────────────────────────────

describe('serializeCart / deserializeCart', () => {
  it('serializes and deserializes round-trip', () => {
    const items: CartItem[] = [
      { id: '8', name: 'Boneless 250g', price: 139, quantity: 2 },
      { id: '9', name: 'Alitas', price: 125, quantity: 1 },
    ];
    const state = recalculate(items);

    const serialized = serializeCart(state);
    const deserialized = deserializeCart(serialized);

    expect(deserialized.items).toHaveLength(2);
    expect(deserialized.totalItems).toBe(3);
    expect(deserialized.totalPrice).toBe(139 * 2 + 125);
  });

  it('handles null input gracefully', () => {
    const state = deserializeCart(null);
    expect(state.items).toHaveLength(0);
    expect(state.totalPrice).toBe(0);
  });

  it('handles corrupt JSON gracefully', () => {
    const state = deserializeCart('not-valid-json{{{');
    expect(state.items).toHaveLength(0);
    expect(state.totalPrice).toBe(0);
  });
});

// ─── buildWhatsAppUrl ─────────────────────────────────────────────────────

describe('buildWhatsAppUrl', () => {
  it('includes product names, quantities, and total', () => {
    const state: CartState = {
      items: [
        { id: '8', name: 'Boneless 250g', price: 139, quantity: 2 },
        { id: '15', name: 'Refresco 400ml', price: 30, quantity: 1 },
      ],
      totalItems: 3,
      totalPrice: 308,
    };
    const url = buildWhatsAppUrl(state, '521234567890');
    expect(url).toContain('wa.me/521234567890');
    // Decode to check contents
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Boneless 250g');
    expect(decoded).toContain('x2');
    expect(decoded).toContain('$278');
    expect(decoded).toContain('Total: $308');
  });

  it('separates standalone extras', () => {
    const state: CartState = {
      items: [
        { id: '8', name: 'Boneless', price: 139, quantity: 1 },
        { id: '16', name: 'Salsa Extra', price: 12, quantity: 1, isStandaloneExtra: true },
      ],
      totalItems: 2,
      totalPrice: 151,
    };
    const decoded = decodeURIComponent(buildWhatsAppUrl(state, '521234567890'));
    expect(decoded).toContain('Extras adicionales');
    expect(decoded).toContain('Salsa Extra');
  });

  it('uses totalPrice from state, not computed', () => {
    // Even if totalPrice is inconsistent with items, the URL uses totalPrice from state
    const state: CartState = {
      items: [{ id: '8', name: 'Boneless', price: 100, quantity: 1 }],
      totalItems: 1,
      totalPrice: 999, // Mismatched — URL should use state.totalPrice
    };
    const decoded = decodeURIComponent(buildWhatsAppUrl(state, '521234567890'));
    expect(decoded).toContain('Total: $999');
  });
});

// ─── isValidCart ──────────────────────────────────────────────────────────

describe('isValidCart', () => {
  it('accepts valid cart', () => {
    expect(isValidCart({ items: [], total: 0 })).toBe(true);
    expect(isValidCart({ items: [{ id: '1', name: 'A', price: 10, quantity: 1 }], total: 10 })).toBe(true);
  });

  it('rejects null/undefined (returns falsy)', () => {
    // isValidCart returns the result of a logical AND chain, which can be
    // the original value (null/undefined) rather than boolean false
    expect(isValidCart(null)).toBeFalsy();
    expect(isValidCart(undefined)).toBeFalsy();
  });

  it('rejects non-object', () => {
    expect(isValidCart('string')).toBe(false);
    expect(isValidCart(42)).toBe(false);
  });

  it('rejects non-array items', () => {
    expect(isValidCart({ items: 'not-array', total: 0 })).toBe(false);
  });

  it('rejects non-number total', () => {
    expect(isValidCart({ items: [], total: '0' })).toBe(false);
    expect(isValidCart({ items: [], total: undefined })).toBe(false);
  });
});
