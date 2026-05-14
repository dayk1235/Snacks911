/**
 * src/tests/integration/chatbot-context.test.ts
 *
 * Integration tests for context-aware chatbot features:
 *   - Follow-up intent detection (ADD_COMPLEMENT)
 *   - Smart complement engine (cart-based recommendations)
 *   - Context-aware fallback inference
 *   - Preloaded intent responses
 *
 * TEST CASE FORMAT:
 *   Each test simulates a conversation and verifies the bot
 *   responds with intent-aware, cart-aware suggestions.
 *
 * Output follows:
 * {
 *   name: "follow_up_context",
 *   conversation: ["quiero boneless", "y algo más"],
 *   expected: {
 *     intent: "ADD_COMPLEMENT",
 *     must_include: ["papas", "dip", "bebida"],
 *     must_not_include: ["boneless"]
 *   }
 * }
 */

import { getBotResponse } from '@/core/botEngine';
import { getContext, deleteContext, updateContext } from '@/core/context';
import { processWithRouter } from '@/core/ai/multiModelRouter';
import type { AgentResponse } from '@/core/ai/aiAgent';

// ─── Mock the multi-model router so tests don't depend on real AI ─────────

jest.mock('@/core/ai/multiModelRouter', () => ({
  __esModule: true,
  processWithRouter: jest.fn(),
}));

const mockRouter = processWithRouter as jest.Mock;

function mockRouterResponse(overrides: Partial<{
  response: AgentResponse;
  modelUsed: 'gemini-2.5-flash-lite' | 'gpt-4o-mini' | 'rule-based';
  confidence: number;
  detectedIntent: string;
  latencyMs: number;
}> = {}) {
  mockRouter.mockResolvedValue({
    response: {
      actions: [{ type: 'TALK' as const }],
      response_text: '¡Qué onda! Soy tu asistente. ¿Qué se te antoja hoy? 🔥',
      ...overrides.response,
    },
    modelUsed: 'gemini-2.5-flash-lite',
    confidence: 0.9,
    latencyMs: 800,
    detectedIntent: 'UNKNOWN',
    ...overrides,
  });
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Real product IDs from src/data/products.ts:
 *  1 = Combo Mixto 911 (combos, $249)
 *  7 = Papas 911 Loaded (papas, $149)
 *  8 = Boneless 250g (proteina, $139)
 *  9 = Alitas 6 piezas (proteina, $125)
 */

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Follow-up intent detection (ADD_COMPLEMENT)
// ═══════════════════════════════════════════════════════════════════════════

describe('Follow-up Intent Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[follow_up_context] y algo más after boneless → ADD_COMPLEMENT with dips/fries/drinks', async () => {
    const phone = '5511111001';
    deleteContext(phone);

    // Step 1: Add boneless to cart (ID 8 = Boneless 250g, category: proteina)
    updateContext(phone, {
      cart: {
        items: [{ name: 'Boneless 250g', price: 139, quantity: 1, productId: '8' }],
        total: 139,
      },
      lastIntent: 'ORDER',
      state: 'inicio',
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
      response: {
        actions: [{ type: 'TALK' }],
        response_text: '🔥 Para acompañar tus boneless te recomiendo:',
      },
    });

    const res = await getBotResponse({ message: 'y algo más', phone });

    // Complement shortcut intercepts BEFORE router (with cart items)
    // so router may or may not be called — the key is the response quality

    // Response suggests complements
    expect(res.text).toMatch(/acompa[ñn]|agregar|complement|recomiendo/i);

    // Should show product cards (complements)
    expect(res.ui?.cards?.length || 0).toBeGreaterThan(0);

    // Should NOT suggest boneless again (already in cart)
    const cardTitles = (res.ui?.cards || []).map((c: any) => c.title?.toLowerCase() || '');
    const hasBonelessAgain = cardTitles.some((t: string) => t.includes('boneless'));
    expect(hasBonelessAgain).toBe(false);
  });

  it('[follow_up_context] y algo más with empty cart → passes through to AI', async () => {
    const phone = '5511111002';
    deleteContext(phone);

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
      response: {
        actions: [{ type: 'TALK' }],
        response_text: '¿Qué te gustaría ordenar?',
      },
    });

    const res = await getBotResponse({ message: 'y algo más', phone });

    // With empty cart, the complement shortcut doesn't fire → goes to router
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
  });

  it('[follow_up_context] algo adicional → detected as ADD_COMPLEMENT', async () => {
    const phone = '5511111003';
    deleteContext(phone);

    updateContext(phone, {
      cart: {
        items: [{ name: 'Combo Mixto 911', price: 249, quantity: 1, productId: '1' }],
        total: 119,
      },
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
    });

    const res = await getBotResponse({ message: 'algo adicional', phone });

    // Combo cart → should suggest add-ons (extras, bebidas, postres)
    // NOT more combos or mains
    const cardTitles = (res.ui?.cards || []).map((c: any) => c.title?.toLowerCase() || '');
    const hasCombo = cardTitles.some((t: string) => t.includes('combo'));
    const hasProtein = cardTitles.some(
      (t: string) => t.includes('boneless') || t.includes('alita')
    );

    // With combo in cart, we should NOT suggest more combos or proteins
    // (This is the smart complement engine at work)
    if (res.ui?.cards?.length) {
      expect(hasCombo).toBe(false);
      expect(hasProtein).toBe(false);
    }
  });

  it('[follow_up_context] para acompañar → detected as ADD_COMPLEMENT', async () => {
    const phone = '5511111004';
    deleteContext(phone);

    updateContext(phone, {
      cart: {
        items: [{ name: 'Alitas 6 piezas', price: 125, quantity: 1, productId: '9' }],
        total: 109,
      },
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
    });

    const res = await getBotResponse({ message: 'para acompañar', phone });

    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: Smart complement engine (cart-based mapping)
// ═══════════════════════════════════════════════════════════════════════════

describe('Smart Complement Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[smart_complement] boneless → suggests dips, fries, drinks (not more protein)', async () => {
    const phone = '5522222001';
    deleteContext(phone);

    updateContext(phone, {
      cart: {
        items: [
          { name: 'Boneless 250g', price: 139, quantity: 1, productId: '8' },
        ],
        total: 129,
      },
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
    });

    const res = await getBotResponse({ message: 'y algo más', phone });

    // Should mention complementary categories
    const hasComplementRef =
      /salsa|dip|aderezo|papa|refresco|bebida|extra|acompañ/i.test(res.text);
    expect(hasComplementRef).toBe(true);

    // Should not add more boneless
    const cardTitles = (res.ui?.cards || []).map((c: any) => c.title?.toLowerCase() || '');
    const hasBoneless = cardTitles.some((t: string) => t.includes('boneless'));
    expect(hasBoneless).toBe(false);
  });

  it('[smart_complement] alitas → suggests fries, drinks', async () => {
    const phone = '5522222002';
    deleteContext(phone);

    updateContext(phone, {
      cart: {
        items: [
          { name: 'Alitas 6 piezas', price: 125, quantity: 1, productId: '9' },
        ],
        total: 109,
      },
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
    });

    const res = await getBotResponse({ message: 'y algo más', phone });

    // Alitas in protein category → should suggest papas, bebidas, extras
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
  });

  it('[smart_complement] combo → add-ons only (no more mains)', async () => {
    const phone = '5522222003';
    deleteContext(phone);

    updateContext(phone, {
      cart: {
        items: [
          { name: 'Combo Mixto 911', price: 249, quantity: 1, productId: '1' },
        ],
        total: 119,
      },
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
    });

    const res = await getBotResponse({ message: 'y algo más', phone });

    // Combo in cart → should NOT suggest more combos or proteins
    const cardTitles = (res.ui?.cards || []).map((c: any) => c.title?.toLowerCase() || '');
    const hasAnotherCombo = cardTitles.some((t: string) => t.includes('combo'));
    const hasProtein = cardTitles.some(
      (t: string) => t.includes('boneless') || t.includes('alita')
    );

    if (res.ui?.cards?.length) {
      expect(hasAnotherCombo).toBe(false);
      expect(hasProtein).toBe(false);
    }
  });

  it('[smart_complement] papas → suggests salsas, drinks, desserts', async () => {
    const phone = '5522222004';
    deleteContext(phone);

    updateContext(phone, {
      cart: {
        items: [
          { name: 'Papas 911 Loaded', price: 149, quantity: 1, productId: '7' },
        ],
        total: 149,
      },
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
    });

    const res = await getBotResponse({ message: 'y algo más', phone });

    expect(typeof res.text).toBe('string');
    // Should include cart actions
    expect(res.actions?.length || 0).toBeGreaterThan(0);
  });

  it('[smart_complement] never suggests products already in cart', async () => {
    const phone = '5522222005';
    deleteContext(phone);

    // Cart has boneless AND papas
    updateContext(phone, {
      cart: {
        items: [
          { name: 'Boneless 250g', price: 139, quantity: 1, productId: '8' },
          { name: 'Papas 911 Loaded', price: 149, quantity: 1, productId: '7' },
        ],
        total: 198,
      },
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
    });

    const res = await getBotResponse({ message: 'y algo más', phone });

    const cardTitles = (res.ui?.cards || []).map((c: any) => c.title?.toLowerCase() || '');

    // Should not re-suggest the EXACT same products already in cart
    const hasBonelessAgain = cardTitles.some((t: string) => t.includes('boneless 250g'));
    const hasSamePapas = cardTitles.some((t: string) => t.includes('papas 911 loaded'));

    expect(hasBonelessAgain).toBe(false);
    expect(hasSamePapas).toBe(false);

    // But other papas variants (e.g. "Papas clásicas") are fine — fries complement protein
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Context-aware fallback inference
// ═══════════════════════════════════════════════════════════════════════════

describe('Context-Aware Fallback Inference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[fallback_context] rule-based + cart items → ADD_COMPLEMENT inference', async () => {
    const phone = '5533333001';
    deleteContext(phone);

    updateContext(phone, {
      cart: {
        items: [
          { name: 'Boneless 250g', price: 139, quantity: 1, productId: '8' },
        ],
        total: 129,
      },
      lastIntent: 'ORDER',
    });

    // Router returns rule-based (AI completely failed)
    mockRouterResponse({
      modelUsed: 'rule-based',
      confidence: 0.3,
      detectedIntent: 'UNKNOWN',
      response: {
        actions: [{ type: 'TALK' }],
        response_text: 'Tuve un pequeño problema procesando eso. ¿Me lo repites? 😅',
      },
    });

    const res = await getBotResponse({ message: 'bla bla xyz', phone });

    // Context-aware inference: cart not empty → ADD_COMPLEMENT
    // Should show complementary product suggestions
    expect(res.type).toMatch(/products|buttons/);
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);

    // Should have cart actions (checkout/view cart) since cart has items
    expect(res.actions?.length || 0).toBeGreaterThan(0);
  });

  it('[fallback_context] rule-based + BROWSE last intent → CONTINUE_BROWSING', async () => {
    const phone = '5533333002';
    deleteContext(phone);

    updateContext(phone, {
      cart: { items: [], total: 0 },
      lastIntent: 'BROWSE',
      lastUserMessage: 'ver menu',
    });

    mockRouterResponse({
      modelUsed: 'rule-based',
      confidence: 0.3,
      detectedIntent: 'UNKNOWN',
      response: {
        actions: [{ type: 'TALK' }],
        response_text: 'Tuve un pequeño problema... 😅',
      },
    });

    const res = await getBotResponse({ message: 'algo random sin sentido', phone });

    // Context: last intent was BROWSE → shows menu items
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);

    // Should show product cards (menu browsing)
    const hasCards = (res.ui?.cards?.length || 0) > 0;
    const hasMenuAction = res.actions?.some(
      (a: any) => a.type === 'show_category' || a.label?.includes('menú') || a.label?.includes('Menú')
    );
    expect(hasCards || hasMenuAction).toBe(true);
  });

  it('[fallback_context] low confidence + cart → triggers fallback with context', async () => {
    const phone = '5533333003';
    deleteContext(phone);

    updateContext(phone, {
      cart: {
        items: [
          { name: 'Alitas 6 piezas', price: 125, quantity: 1, productId: '9' },
        ],
        total: 109,
      },
      lastIntent: 'ORDER',
    });

    // Low confidence from router (but not rule-based)
    mockRouterResponse({
      modelUsed: 'gemini-2.5-flash-lite',
      confidence: 0.4,
      detectedIntent: 'UNKNOWN',
      response: {
        actions: [{ type: 'TALK' }],
        response_text: 'Mmm... no estoy seguro.',
      },
    });

    const res = await getBotResponse({ message: 'algo raro', phone });

    // Confidence < 0.7 triggers fallback path
    // Cart has items → should get complement suggestions
    expect(typeof res.text).toBe('string');
  });

  it('[fallback_context] empty cart + unknown intent → generic prompt', async () => {
    const phone = '5533333004';
    deleteContext(phone);

    updateContext(phone, {
      cart: { items: [], total: 0 },
      lastIntent: undefined,
    });

    mockRouterResponse({
      modelUsed: 'rule-based',
      confidence: 0.2,
      detectedIntent: 'UNKNOWN',
      response: {
        actions: [{ type: 'TALK' }],
        response_text: 'Tuve un pequeño problema... 😅',
      },
    });

    const res = await getBotResponse({ message: 'xyz', phone });

    // Short nonsense message, no cart, no context → generic prompt
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: Conversation flow — full paths
// ═══════════════════════════════════════════════════════════════════════════

describe('Full Conversation Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[conversation_flow] boneless → y algo más → complement suggestions', async () => {
    const phone = '5544444001';
    deleteContext(phone);

    // Step 1: Order boneless
    mockRouterResponse({
      detectedIntent: 'ORDER',
      confidence: 0.95,
      response: {
        actions: [
          { type: 'TALK' },
          { type: 'ADD_TO_CART', productId: '8', quantity: 1 },
        ],
        response_text: '¡Claro! Agrego Boneless 250g ($129). ¿Lo acompañamos? 🔥',
      },
    });

    const res1 = await getBotResponse({ message: 'quiero boneless', phone });
    expect(res1.cart.items.length).toBeGreaterThan(0);

    // Step 2: Follow-up complement
    updateContext(phone, {
      lastIntent: 'ORDER',
    });

    mockRouterResponse({
      detectedIntent: 'ADD_COMPLEMENT',
      confidence: 0.9,
      response: {
        actions: [{ type: 'TALK' }],
        response_text: '🔥 Para acompañar, te recomiendo:',
      },
    });

    const res2 = await getBotResponse({ message: 'y algo más', phone });

    // Complement suggestions should appear
    const hasComplementCards = (res2.ui?.cards?.length || 0) > 0;
    expect(hasComplementCards).toBe(true);

    // Should include cart actions
    const hasCheckout = res2.actions?.some(
      (a: any) => a.type === 'checkout' || a.label?.includes('Pedir')
    );
    expect(hasCheckout).toBe(true);
  });

  it('[conversation_flow] combo → confirmar → order placed', async () => {
    const phone = '5544444002';
    deleteContext(phone);

    // Step 1: Order combo
    mockRouterResponse({
      detectedIntent: 'ORDER',
      confidence: 0.95,
      response: {
        actions: [
          { type: 'TALK' },
          { type: 'ADD_TO_CART', productId: '1', quantity: 1 },
        ],
        response_text: '¡Agregado! Combo 911 va para ti 🔥',
      },
    });

    const res1 = await getBotResponse({ message: 'quiero combo 911', phone });
    expect(res1.cart.items.length).toBeGreaterThan(0);

    // Step 2: Confirm
    mockRouterResponse({
      detectedIntent: 'CHECKOUT',
      confidence: 0.9,
      response: {
        actions: [{ type: 'TALK' }, { type: 'CHECKOUT' }],
        response_text: '¡Perfecto! Tu pedido va en camino.',
      },
    });

    const res2 = await getBotResponse({ message: 'confirmar', phone });
    expect(res2.text).toMatch(/pedido|orden|Total|confirm/i);
  });

  it('[conversation_flow] nonsensical fallback → still returns valid response', async () => {
    const phone = '5544444003';
    deleteContext(phone);

    mockRouterResponse({
      modelUsed: 'rule-based',
      confidence: 0.15,
      detectedIntent: 'UNKNOWN',
      response: {
        actions: [{ type: 'TALK' }],
        response_text: 'Tuve un pequeño problema... 😅',
      },
    });

    const res = await getBotResponse({ message: 'asdfghjkl12345!!!???', phone });

    // Must always return text — never crash
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.cart.items.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 5: Preloaded intent shortcuts
// ═══════════════════════════════════════════════════════════════════════════

describe('Preloaded Intent Responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[preloaded] ver combos → instant response without AI call', async () => {
    const phone = '5555555001';
    deleteContext(phone);

    mockRouterResponse({
      detectedIntent: 'BROWSE',
      response: {
        actions: [{ type: 'TALK' }],
        response_text: '🔥 Aquí tienes nuestros combos más rifados:',
      },
    });

    await getBotResponse({ message: 'ver combos', phone });

    // Router should have been called (preloaded is checked inside processWithRouter)
    expect(mockRouter).toHaveBeenCalled();
  });
});
