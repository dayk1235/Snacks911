import { productToRow } from '../lib/db.server';
import { AdminProduct } from '../lib/adminTypes';

/**
 * Smoke Test: productToRow fallback logic
 */
async function testProductToRow() {
  console.log('Running smoke test for productToRow...');

  // Mock product with available=true
  const mockProduct = {
    id: 'test-1',
    name: 'Test Product',
    price: 100,
    category: 'combos',
    imageUrl: '',
    description: '',
    available: true
  } as unknown as AdminProduct;

  const row = await productToRow(mockProduct);

  console.log('Resulting row:', row);

  if ((row as any).is_available === true) {
    console.log('✅ PASS: is_available is true');
  } else {
    console.error('❌ FAIL: is_available should be true');
    process.exit(1);
  }
}

testProductToRow().catch(err => {
  console.error(err);
  process.exit(1);
});
