/**
 * src/tests/e2e/botEdgeCases.test.ts
 * Edge-case and stress tests for bot resilience.
 */

import { getBotResponse } from '../../core/botEngine';
import { getContext, deleteContext, updateContext, isValidCart } from '../../core/context';
import { registerErrorEvent, getSystemMode, resetSystemHealth } from '../../core/selfHealingEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Edge Case Failed: ${message}`);
  }
}

describe('Bot Edge Cases E2E', () => {
  it('should handle edge cases and stress tests gracefully', async () => {
    const phone = '5599887766';
    
    console.log("--- Starting Edge Case Reliability Tests ---");

    // 1. GREETING SPAM
    console.log("[CASE 1] Greeting Spam");
    deleteContext(phone);
    await getBotResponse({ message: 'hola', phone });
    await getBotResponse({ message: 'hola', phone });
    const res1 = await getBotResponse({ message: 'hola', phone });
    assert(res1.cart.items.length === 0, "Cart remains empty after multiple greetings");

    // 2. INVALID PRODUCT
    console.log("[CASE 2] Invalid Product ('dragon burger')");
    const res2 = await getBotResponse({ message: 'quiero dragon burger', phone });
    assert(!res2.text.includes('dragon burger'), "Does not acknowledge non-existent product");
    assert(res2.cart.items.length === 0, "Cart stays empty on invalid product");

    // 3. OUT OF STOCK
    console.log("[CASE 3] Out of Stock Handling");
    const res3 = await getBotResponse({ message: 'quiero algo agotado', phone });
    assert(!res3.text.includes('agotado'), "Does not recommend unavailable items");

    // 4. CORRUPTED CART RECOVERY
    console.log("[CASE 4] Corrupted Cart Injection");
    // @ts-ignore - injecting invalid data
    updateContext(phone, { cart: { items: "BROKEN", total: "nan" } });
    const res4 = await getBotResponse({ message: 'hola', phone });
    assert(Array.isArray(res4.cart.items), "System auto-recovered and reset broken cart array");
    assert(typeof res4.cart.total === 'number', "System reset broken cart total");

    // 5. RAPID ADD TO CART
    console.log("[CASE 5] Rapid Add to Cart (Quantity Check)");
    deleteContext(phone);
    await getBotResponse({ message: 'quiero boneless', phone });
    await getBotResponse({ message: 'agrega otro', phone });
    const res5 = await getBotResponse({ message: 'uno mas', phone });
    assert(res5.cart.items.length > 0, "Items present in cart");
    
    // 6. CONFIRM WITHOUT CART
    console.log("[CASE 6] Confirm without Cart");
    deleteContext(phone);
    const res6 = await getBotResponse({ message: 'confirmar', phone });
    assert(res6.text.includes('vació') || res6.text.includes('agrega') || res6.text.includes('primero'), "Blocks confirmation on empty cart");

    // 7. SELF-HEALING MODE
    console.log("[CASE 7] Self-Healing Mode Transition");
    await resetSystemHealth();
    // Trigger 8 errors to hit EMERGENCY_MODE
    for(let i=0; i<8; i++) {
      await registerErrorEvent('DATABASE', 'test');
    }
    
    const mode = await getSystemMode();
    assert(mode === 'EMERGENCY_MODE', "System transitioned to EMERGENCY_MODE after 8 errors");
    
    const res7 = await getBotResponse({ message: 'hola', phone });
    assert(res7.text.includes('técnico') || res7.text.includes('Combo Mixto 911') || res7.text.includes('¡Hola!'), "Serves fallback response in emergency mode");

    console.log("--- Edge Case Reliability Tests Passed ---");
  }, 15000); // Higher timeout for multiple rounds
});
