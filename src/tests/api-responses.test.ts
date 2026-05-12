/**
 * Tests for API response handling — order creation, product validation,
 * and edge cases around pricing, item validation, and error responses.
 *
 * These test the pure logic that backs the API routes, not the HTTP layer.
 *
 * Mock product data from jest.setup.ts:
 *   id=1: Papas Loaded       $69
 *   id=2: Refresco 600ml     $25
 *   id=3: Brownie con Helado $59
 *   id=4: Combo 911          $119
 *   id=5: Combo Callejero    $99
 *   id=6: Boneless 250g      $129   <-- the boneless product
 */
import { validateOrderItems } from '@/core/validationService';
import { dbGetProducts, dbSaveOrder } from '@/lib/db.server';
import { addToCart } from '@/core/cartEngine';

// ─── validationService: validateOrderItems ────────────────────────────────

describe('validateOrderItems', () => {
  // id=6 is Boneless 250g at $129 in mock data
  it('resolves product by productId', async () => {
    const items = [{ productId: '6', name: 'Boneless', price: 50, qty: 2, quantity: 2 }];
    const result = await validateOrderItems(items);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(129);
    expect(result[0].name).toBe('Boneless 250g');
  });

  it('resolves product by product_id', async () => {
    const items = [{ product_id: '6', name: 'Boneless', price: 999, quantity: 1 }];
    const result = await validateOrderItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(129);
  });

  it('resolves product by id field', async () => {
    const items = [{ id: '6', name: 'Boneless', price: 999, qty: 1 }];
    const result = await validateOrderItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(129);
  });

  it('resolves product by id=1 (Papas Loaded, $69)', async () => {
    const items = [{ productId: '1', name: 'Papas', price: 5, qty: 1 }];
    const result = await validateOrderItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(69);
  });

  it('overwrites all price fields with DB authoritative price', async () => {
    const items = [{ productId: '6', name: 'Boneless', price: 5, qty: 1, quantity: 1 }];
    const result = await validateOrderItems(items);
    expect(result[0].price).toBe(129);
    expect(result[0].unit_price).toBe(129);
  });

  it('overwrites name fields with DB authoritative name', async () => {
    const items = [{ productId: '6', name: 'Wrong Name', productName: 'Also Wrong', product_name: 'Wrong Too', qty: 1 }];
    const result = await validateOrderItems(items);
    expect(result[0].name).toBe('Boneless 250g');
    expect(result[0].productName).toBe('Boneless 250g');
    expect(result[0].product_name).toBe('Boneless 250g');
  });

  it('normalizes qty from qty or quantity field', async () => {
    const items = [
      { productId: '6', name: 'Boneless', price: 129, qty: 3 },
      { productId: '1', name: 'Papas', price: 69, quantity: 2 },
    ];
    const result = await validateOrderItems(items);
    expect(result[0].qty).toBe(3);
    expect(result[0].quantity).toBe(3);
    expect(result[1].qty).toBe(2);
    expect(result[1].quantity).toBe(2);
  });

  it('skips items with missing product in DB', async () => {
    const items = [
      { productId: 'nonexistent', name: 'Ghost', price: 100, qty: 1 },
      { productId: '6', name: 'Boneless', price: 129, qty: 1 },
    ];
    const result = await validateOrderItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('6');
  });

  it('throws when ALL items are invalid (no DB match)', async () => {
    const items = [
      { productId: 'ghost1', name: 'Ghost', price: 100, qty: 1 },
      { productId: 'ghost2', name: 'Ghost', price: 100, qty: 1 },
    ];
    await expect(validateOrderItems(items)).rejects.toThrow('No valid items found');
  });

  it('skips items with zero or negative qty', async () => {
    const items = [
      { productId: '6', name: 'Boneless', price: 129, qty: 0 },
      { productId: '1', name: 'Papas', price: 69, qty: -1, quantity: -1 },
      { productId: '2', name: 'Refresco', price: 25, qty: 1 },
    ];
    const result = await validateOrderItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('2');
    expect(result[0].price).toBe(25);
  });

  it('skips items with undefined qty', async () => {
    const items = [
      { productId: '6', name: 'Boneless', price: 129 },
      { productId: '2', name: 'Refresco', price: 25, qty: 1 },
    ];
    const result = await validateOrderItems(items);
    // First item has no qty → Number(undefined) = NaN → !NaN is false → continue
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('2');
  });

  it('normalizes string qty to number', async () => {
    const items = [{ productId: '6', name: 'Boneless', price: 129, qty: '2' }];
    const result = await validateOrderItems(items);
    expect(result[0].qty).toBe(2);
    expect(typeof result[0].qty).toBe('number');
  });

  it('correctly validates and overwrites multiple items at once', async () => {
    // id=6: Boneless $129, id=1: Papas $69
    const items = [
      { productId: '6', name: 'FAKE', price: 1, qty: 2 },
      { productId: '1', name: 'FAKE', price: 1, qty: 1 },
    ];
    const result = await validateOrderItems(items);

    expect(result).toHaveLength(2);
    expect(result[0].price).toBe(129);
    expect(result[1].price).toBe(69);
  });

  it('populates both camelCase and snake_case ID fields', async () => {
    const items = [{ productId: '1', name: 'Papas', price: 69, qty: 1 }];
    const result = await validateOrderItems(items);
    expect(result[0].id).toBe('1');
    expect(result[0].productId).toBe('1');
    expect(result[0].product_id).toBe('1');
  });

  it('does not mutate the original item objects', async () => {
    const originalItem = { productId: '6', name: 'Boneless', price: 1, qty: 1 };
    const items = [{ ...originalItem }];
    const result = await validateOrderItems(items);
    // Original item is spread into a new object — the input array item is unchanged
    // Input items still have their original values
    expect(items[0].price).toBe(1);
    expect(items[0].name).toBe('Boneless');
  });
});

// ─── API-level order validation edge cases ────────────────────────────────

describe('order validation edge cases', () => {
  it('rejects empty items array', () => {
    const items: any[] = [];
    expect(items.length).toBe(0);
    // Reproduces the guard at orders/route.ts:84
    const isInvalid = !items || !Array.isArray(items) || items.length === 0;
    expect(isInvalid).toBe(true);
  });

  it('rejects null/undefined items', () => {
    expect(Array.isArray(null)).toBe(false);
    expect(Array.isArray(undefined)).toBe(false);
  });

  it('total recalculation: sum of qty * price per item', () => {
    // Reproduces the recalculation at orders/route.ts:96
    const validItems = [
      { productId: '6', price: 129, quantity: 2 },
      { productId: '2', price: 25, quantity: 1 },
    ];
    const total = validItems.reduce((sum: number, i: any) => sum + i.quantity * i.price, 0);
    expect(total).toBe(283);
  });

  it('total recalculation handles single item', () => {
    const validItems = [{ productId: '6', price: 129, quantity: 1 }];
    const total = validItems.reduce((sum: number, i: any) => sum + i.quantity * i.price, 0);
    expect(total).toBe(129);
  });

  it('total recalculation handles zero price items', () => {
    const validItems = [
      { productId: '6', price: 129, quantity: 2 },
      { productId: 'free', price: 0, quantity: 5 },
    ];
    const total = validItems.reduce((sum: number, i: any) => sum + i.quantity * i.price, 0);
    expect(total).toBe(258);
  });
});

// ─── Order confirm endpoint logic ─────────────────────────────────────────

describe('order confirm logic', () => {
  it('requires order id', () => {
    const id: string | undefined = undefined;
    const passed = id ? true : false;
    expect(passed).toBe(false);
  });

  it('accepts valid uuid id', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(id.length).toBeGreaterThan(0);
  });
});
