import { resolveNextState } from '../orderFlow';

describe('orderFlow', () => {
  test('IDLE transitions to BROWSING on SHOW_MENU', () => {
    const next = resolveNextState('IDLE', 'SHOW_MENU');
    expect(next).toBe('BROWSING');
  });

  test('BROWSING transitions to BUILDING_CART on ADD_TO_CART with product match', () => {
    const next = resolveNextState('BROWSING', 'ADD_TO_CART', {
      state: 'BROWSING',
      hasProductMatch: true,
    });
    expect(next).toBe('BUILDING_CART');
  });

  test('BUILDING_CART transitions to REVIEWING on VIEW_CART with items', () => {
    const next = resolveNextState('BUILDING_CART', 'VIEW_CART', {
      state: 'BUILDING_CART',
      cartItems: 1,
    });
    expect(next).toBe('REVIEWING');
  });

  test('CONFIRMING transitions to AWAITING_PAYMENT on CONFIRM_ORDER', () => {
    const next = resolveNextState('CONFIRMING', 'CONFIRM_ORDER', {
      state: 'CONFIRMING',
      cartItems: 1,
    });
    expect(next).toBe('AWAITING_PAYMENT');
  });

  test('unknown intent leaves state unchanged', () => {
    const next = resolveNextState('IDLE', 'UNKNOWN_INTENT');
    expect(next).toBe('IDLE');
  });

  test('CONFIRM_ORDER with empty cart stays in current state', () => {
    const next = resolveNextState('IDLE', 'CONFIRM_ORDER');
    expect(next).toBe('IDLE');
  });

  test('ADD_TO_CART without product match stays in current state', () => {
    const next = resolveNextState('BROWSING', 'ADD_TO_CART', {
      state: 'BROWSING',
      hasProductMatch: false,
    });
    expect(next).toBe('BROWSING');
  });
});
