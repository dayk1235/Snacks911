/**
 * src/tests/e2e/botFlow.test.ts
 * End-to-end simulation of the conversational sales journey.
 */

import { getBotResponse } from '../../core/botEngine';
import { getContext, deleteContext } from '../../core/context';

// --- Mocks ---
// We mock the database and external services at the module level or by overriding global behaviors.
// For this simple test, we assume the environment is set up to point to local/test data.

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ E2E Failed: ${message}`);
  }
}

describe('Bot Flow E2E', () => {
  it('should complete a successful sales journey', async () => {
    const phone = '5512345678';
    deleteContext(phone); // Start fresh

    console.log("--- Starting E2E Bot Flow Simulation ---");

    // Step 1: Greeting
    console.log("[E2E] Step 1: User says 'hola'");
    const res1 = await getBotResponse({ message: 'hola', phone });
    console.log("[E2E] Bot:", res1.text);
    assert(res1.text.includes('Hola') || res1.text.includes('Qué onda') || res1.text.includes('Hey') || res1.text.includes('menú'), "Responds to greeting");
    assert(res1.cart.items.length === 0, "Cart is empty after greeting");

    // Step 2: Intent to buy
    console.log("[E2E] Step 2: User says 'quiero boneless'");
    const res2 = await getBotResponse({ message: 'quiero boneless', phone });
    console.log("[E2E] Bot:", res2.text);
    assert(res2.text.includes('Boneless') || res2.text.includes('recomiendo'), "Recognizes product intent");
    
    // Step 3: Add to cart
    console.log("[E2E] Step 3: User says 'agrega 2'");
    // We assume the bot recommended a product or it's in the ranked list
    const res3 = await getBotResponse({ message: 'agrega 2', phone });
    console.log("[E2E] Bot:", res3.text);
    assert(res3.cart.items.length > 0, "Item added to cart");
    assert(res3.cart.total > 0, "Cart total is non-zero");
    const initialTotal = res3.cart.total;

    // Step 4: Confirmation
    console.log("[E2E] Step 4: User says 'confirmar'");
    const res4 = await getBotResponse({ message: 'confirmar', phone });
    console.log("[E2E] Bot:", res4.text);
    // Order was registered — verify semantically (pedido + Total/$)
    const orderCreated = /pedido/i.test(res4.text) && /(Total|total|\$)/.test(res4.text);
    assert(orderCreated, "Order proceeds to confirmation");
    
    // Final checks
    const finalContext = getContext(phone);
    console.log("[E2E] Final State:", finalContext.state || 'ordenando');
    
    console.log("--- E2E Flow Simulation Passed Successfully ---");
  }, 10000); // Increase timeout for E2E
});
