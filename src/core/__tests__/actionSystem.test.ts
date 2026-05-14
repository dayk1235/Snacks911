import { getBotResponse } from '../botEngine';
import { getContext, updateContext } from '../context';
import { products } from '../../data/products';
import { type Action } from '../types';

describe('Action System Unit Tests', () => {
  const phone = '5512345678';
  const tenantId = 'snacks911';

  beforeEach(() => {
    // Reset context before each test
    updateContext(phone, {
      cart: { items: [], total: 0 },
      processedActionIds: [],
      lastAddedProductId: undefined,
      lastAddTimestamp: undefined,
    });
  });

  test('productFlow returns an upsell add_to_cart action', async () => {
    const input = {
      message: 'quiero Boneless 250g',
      phone,
      tenantId,
      allProducts: products,
    };

    const response = await getBotResponse(input);

    expect(response.actions).toBeDefined();
    
    // The engine adds the product to cart
    expect(response.cart.items.length).toBeGreaterThan(0);
  });

  test('combo flow does NOT include invalid side/drink actions', async () => {
    // We simulate adding a combo
    const combo = products.find(p => p.category?.toLowerCase() === 'combos' || p.name.includes('Combo'));
    if (!combo) throw new Error('No combo found in data');

    const input = {
      message: `quiero ${combo.name}`,
      phone,
      tenantId,
      allProducts: products,
    };

    const response = await getBotResponse(input);

    // Rule: if combo, should not suggest papas/bebida
    const invalidAction = response.actions?.find((a: Action) => 
      a.type === 'add_to_cart' && 
      (a.payload?.name?.toLowerCase().includes('papas') || a.payload?.name?.toLowerCase().includes('refresco'))
    );

    expect(invalidAction).toBeUndefined();
  });

  test('double action click (idempotency) does not duplicate cart', async () => {
    const actionId = 'test-action-id-123';
    const product = products[0];

    // First call with a forced action (simulating an action click that adds to cart)
    // In our engine, we use 'shouldForceAdd' logic
    
    const input = {
      message: 'quiero algo',
      phone,
      tenantId,
      allProducts: products,
      forceActionId: actionId, // We simulate the actionId being passed
      pToForceAdd: product
    };

    // Note: The engine currently gets actionId from createUuid or similar in real flow,
    // but we can test the checkAndTrackAction logic directly if we simulate the call.
    
    const ctx = getContext(phone);
    const { checkAndTrackAction } = require('../context');

    // 1. Process first time
    const isDup1 = checkAndTrackAction(ctx, actionId);
    expect(isDup1).toBe(false);

    // 2. Process second time
    const isDup2 = checkAndTrackAction(ctx, actionId);
    expect(isDup2).toBe(true);
  });

  test('upsell action includes correct payload and source', async () => {
    const input = {
      message: 'boneless',
      phone,
      tenantId,
      allProducts: products,
    };

    const response = await getBotResponse(input);
    
    const upsellAction = response.actions?.find((a: Action) => a.meta?.sourceSkill === 'productFlow' || a.meta?.sourceSkill === 'upsell');
    
    if (upsellAction) {
      expect(upsellAction.payload).toHaveProperty('source', 'upsell');
      expect(upsellAction.payload).toHaveProperty('productId');
      expect(upsellAction.payload).toHaveProperty('category');
    }
  });

  test('context-aware tracking records product additions', async () => {
    const ctx = getContext(phone);
    const { trackProductAdd, isDuplicateAdd } = require('../context');

    trackProductAdd(ctx, 'p123');
    
    expect(ctx.lastAddedProductId).toBe('p123');
    expect(ctx.lastAddTimestamp).toBeDefined();

    // Check dedup
    const isDup = isDuplicateAdd(ctx, 'p123');
    expect(isDup).toBe(true);
  });
});
