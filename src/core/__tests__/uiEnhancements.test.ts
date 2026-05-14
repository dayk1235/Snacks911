import { getBotResponse } from '../botEngine';
import { getContext, updateContext, deleteContext } from '../context';
import type { Action, UICard, UICart } from '../types';

jest.mock('@/core/ai/multiModelRouter', () => {
  const original = jest.requireActual('@/core/ai/multiModelRouter');
  return {
    ...original,
    processWithRouter: jest.fn(async (message: string) => {
      const msg = message.toLowerCase();
      if (msg.includes('boneless')) {
        return { response: { actions: [{ type: 'ADD_TO_CART', productId: '8', quantity: 1 }, { type: 'TALK' }], response_text: 'Boneless agregados.' }, modelUsed: 'gemini', confidence: 0.95, detectedIntent: 'ORDER' };
      }
      if (msg.includes('no')) {
        return { response: { actions: [{ type: 'TALK' }], response_text: 'Entendido.' }, modelUsed: 'gemini', confidence: 0.95, detectedIntent: 'GREETING' };
      }
      if (msg.includes('gracias')) {
        return { response: { actions: [{ type: 'TALK' }], response_text: 'De nada.' }, modelUsed: 'gemini', confidence: 0.95, detectedIntent: 'GREETING' };
      }
      return { response: { actions: [{ type: 'TALK' }], response_text: 'Hola' }, modelUsed: 'rule-based', confidence: 0.9, detectedIntent: 'GREETING' };
    })
  };
});
describe('UI Enhancements', () => {
  const phone = 'ui-test-5599888811';

  beforeEach(() => {
    deleteContext(phone);
  });

  // ─── 1. BotResponse still returns text ──────────────────────────────────

  test('greeting response returns text and optional ui', async () => {
    const res = await getBotResponse({ message: 'hola', phone });

    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
    // Greeting shortcut may use "¡Hola!" or "¡Qué onda!"
    expect(/Hola|Qué onda|Hey|Bienvenid/i.test(res.text)).toBe(true);
  });

  test('product query response returns text with actions', async () => {
    const res = await getBotResponse({ message: 'quiero boneless', phone });

    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
    expect(Array.isArray(res.actions)).toBe(true);
  });

  test('negative input returns text', async () => {
    const res = await getBotResponse({ message: 'no', phone });

    expect(typeof res.text).toBe('string');
  });

  // ─── 2. ui.cards is optional ────────────────────────────────────────────

  test('empty cart greeting has no ui.cart', async () => {
    const res = await getBotResponse({ message: 'hola', phone });

    expect(res.ui).toBeNull();
  });

  test('ui.cards is optional and can be present for product recommendations', async () => {
    const res = await getBotResponse({ message: 'boneless', phone });

    // Cards may or may not be present depending on product matching
    // The key is: if present, they must be valid UICard[]
    if (res.ui?.cards) {
      expect(Array.isArray(res.ui.cards)).toBe(true);
      for (const card of res.ui.cards) {
        expect(typeof card.id).toBe('string');
        expect(typeof card.title).toBe('string');
      }
    }
  });

  test('greeting has actions including key prompts', async () => {
    const res = await getBotResponse({ message: 'hola', phone });

    expect(res.actions).toBeDefined();
    const labels = (res.actions as Action[]).map(a => a.label);
    expect(labels).toContain('🔥 Ver combos');
  });

  // ─── 3. actions still work ─────────────────────────────────────────────

  test('greeting returns valid Action objects', async () => {
    const res = await getBotResponse({ message: 'hola', phone });

    expect(Array.isArray(res.actions)).toBe(true);
    for (const action of res.actions as Action[]) {
      expect(typeof action.id).toBe('string');
      expect(typeof action.label).toBe('string');
      expect(typeof action.type).toBe('string');
      // type must be one of the valid ActionType values
      expect([
        'add_to_cart', 'upsell', 'show_category', 'recommend',
        'navigate', 'dismiss', 'repeat_order', 'checkout', 'view_cart',
      ]).toContain(action.type);
    }
  });

  test('greeting includes menu or combo action', async () => {
    const res = await getBotResponse({ message: 'hola', phone });

    expect(res.actions).toBeDefined();
    const menuAction = (res.actions as Action[]).find(
      (a: Action) => a.type === 'show_category'
    );
    expect(menuAction).toBeDefined();
  });

  test('action.id is always a non-empty string', async () => {
    const res = await getBotResponse({ message: 'hola', phone });

    expect(res.actions).toBeDefined();
    expect(Array.isArray(res.actions)).toBe(true);
    for (const action of res.actions as Action[]) {
      expect(typeof action.id).toBe('string');
      expect(action.id.length).toBeGreaterThan(0);
    }
  });

  // ─── 4. cart unchanged ──────────────────────────────────────────────────

  test('greeting does not modify cart', async () => {
    const ctx = getContext(phone);
    ctx.cart = { items: [{ id: '1', name: 'Test', quantity: 1, price: 10 }], total: 10 };

    const res = await getBotResponse({ message: 'hola', phone });

    expect(res.cart.items.length).toBe(1);
    expect(res.cart.total).toBe(10);
  });

  test('checkout action appears when cart has items and user engages', async () => {
    const ctx = getContext(phone);
    ctx.cart = { items: [{ id: '1', name: 'Boneless', quantity: 1, price: 129 }], total: 129 };
    updateContext(phone, { cart: ctx.cart });

    // Send a non-menu, non-add message so checkout actions appear
    const res = await getBotResponse({ message: 'gracias', phone });

    // Cart summary should be present
    if (res.ui?.cart) {
      expect(res.ui.cart.itemCount).toBe(1);
      expect(res.ui.cart.total).toBe(129);
    }

    // Checkout/view_cart actions should be present
    const checkoutAction = (res.actions as Action[]).find(
      (a: Action) => a.type === 'checkout' || a.type === 'view_cart'
    );
    expect(checkoutAction).toBeDefined();
  });

  test('no checkout action when cart is empty', async () => {
    deleteContext(phone);
    const res = await getBotResponse({ message: 'hola', phone });

    const checkoutAction = (res.actions as Action[] || []).find((a: Action) => a.type === 'checkout');
    expect(checkoutAction).toBeUndefined();
  });

  // ─── 5. UICard structure ────────────────────────────────────────────────

  test('UICard objects have required fields when present', async () => {
    // Add a product to trigger product cards
    const res = await getBotResponse({ message: 'quiero boneless', phone });

    if (res.ui?.cards) {
      for (const card of res.ui.cards) {
        expect(typeof card.id).toBe('string');
        expect(card.id.length).toBeGreaterThan(0);
        expect(typeof card.title).toBe('string');
        expect(card.title.length).toBeGreaterThan(0);

        if (card.actions) {
          for (const action of card.actions) {
            expect(typeof action.id).toBe('string');
            expect(typeof action.label).toBe('string');
            expect(typeof action.type).toBe('string');
          }
        }
      }
    }
  });

  test('UICart structure is correct when present', async () => {
    const ctx = getContext(phone);
    ctx.cart = {
      items: [
        { id: '1', name: 'A', quantity: 2, price: 100 },
        { id: '2', name: 'B', quantity: 1, price: 50 },
      ],
      total: 250,
    };
    updateContext(phone, { cart: ctx.cart });

    const res = await getBotResponse({ message: 'hola', phone });

    if (res.ui?.cart) {
      const cart: UICart = res.ui.cart;
      expect(typeof cart.total).toBe('number');
      expect(typeof cart.itemCount).toBe('number');
      expect(cart.itemCount).toBe(2);
      expect(cart.total).toBeGreaterThan(0);
    }
  });
});
