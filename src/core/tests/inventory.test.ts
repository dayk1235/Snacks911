import { inventoryFilter } from '../inventoryFilter';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("--- Running inventory Tests ---");

  // Test 1: stock > 0 items are kept
  const products = [
    { id: '1', name: 'Alitas', stock: 10 },
    { id: '2', name: 'Papas', stock: 0 },
    { id: '3', name: 'Bebida', stock: -1 },
    { id: '4', name: 'Postre', stock: 5 }
  ];

  const filtered = inventoryFilter(products as any);
  
  assert(filtered.length === 2, "Filters out products with stock <= 0");
  assert(filtered.some(p => p.id === '1'), "Keeps product with stock 10");
  assert(filtered.some(p => p.id === '4'), "Keeps product with stock 5");
  assert(!filtered.some(p => p.id === '2'), "Removes product with stock 0");
  assert(!filtered.some(p => p.id === '3'), "Removes product with negative stock");

  console.log("--- inventory Tests Passed ---");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
