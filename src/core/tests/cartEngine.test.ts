import { addToCart } from '../cartEngine';
import { isValidCart } from '../context';

describe('cartEngine', () => {
  test('addToCart increases total and adds item', () => {
    const ctx: any = { cart: { items: [], total: 0 } };
    const product = { id: '1', name: 'Boneless', price: 100 };
    addToCart(ctx, product);
    expect(ctx.cart.total).toBe(100);
    expect(ctx.cart.items.length).toBe(1);
  });

  test('addToCart accumulates quantity and total for same product', () => {
    const ctx: any = { cart: { items: [], total: 0 } };
    const product = { id: '1', name: 'Boneless', price: 100 };
    addToCart(ctx, product);
    addToCart(ctx, product);
    expect(ctx.cart.items[0].qty).toBe(2);
    expect(ctx.cart.total).toBe(200);
  });

  test('isValidCart rejects malformed cart, enabling reset', () => {
    const ctx: any = { cart: { items: 'not-an-array', total: 0 } };
    expect(isValidCart(ctx.cart)).toBe(false);
    if (!isValidCart(ctx.cart)) {
      ctx.cart = { items: [], total: 0 };
    }
    expect(Array.isArray(ctx.cart.items)).toBe(true);
  });

  test('addToCart sanitizes messy product input', () => {
    const ctx: any = { cart: { items: [], total: 0 } };
    const product = { id: 123, name: null, price: '50' };
    addToCart(ctx, product);
    expect(ctx.cart.items[0].productId).toBe('123');
    expect(ctx.cart.items[0].price).toBe(50);
    expect(ctx.cart.total).toBe(50);
  });
});
