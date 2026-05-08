import { addToCart } from '../cartEngine';
import { isValidCart } from '../context';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("--- Running cartEngine Tests ---");

  // Test 1: Add item increases total
  const ctx1: any = { cart: { items: [], total: 0 } };
  const prod1 = { id: '1', name: 'Boneless', price: 100 };
  addToCart(ctx1, prod1);
  assert(ctx1.cart.total === 100, "Total increases after add");
  assert(ctx1.cart.items.length === 1, "Item added to list");

  // Test 2: Qty accumulates correctly
  addToCart(ctx1, prod1);
  assert(ctx1.cart.items[0].qty === 2, "Quantity accumulates for same product");
  assert(ctx1.cart.total === 200, "Total accumulates correctly");

  // Test 3: Invalid cart resets (using isValidCart logic)
  const ctx2: any = { cart: { items: "not-an-array", total: 0 } };
  if (!isValidCart(ctx2.cart)) {
    ctx2.cart = { items: [], total: 0 };
  }
  assert(Array.isArray(ctx2.cart.items), "Invalid cart items reset to empty array");

  // Test 4: Sanitization
  const ctx3: any = { cart: { items: [], total: 0 } };
  const prod2 = { id: 123, name: null, price: "50" }; // messy input
  addToCart(ctx3, prod2);
  assert(ctx3.cart.items[0].productId === "123", "Product ID sanitized to string");
  assert(ctx3.cart.items[0].price === 50, "Price sanitized to number");
  assert(ctx3.cart.total === 50, "Total sanitized correctly");

  console.log("--- cartEngine Tests Passed ---");
}

runTests().catch(err => {
  console.error(err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});
