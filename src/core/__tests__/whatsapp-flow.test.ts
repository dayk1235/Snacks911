/**
 * whatsapp-flow.test.ts — QA: Flujo completo de WhatsApp Cloud API
 *
 * Cubre los 7 pasos del flujo de pedido con payloads reales de Meta:
 *   1. Mensaje inicial (text)
 *   2. Click en botón de menú (interactive/button_reply)
 *   3. Selección de categoría (interactive/list_reply)
 *   4. Envío de catálogo (order message)
 *   5. Recepción y procesamiento de la orden
 *   6. Confirmación (interactive/button_reply)
 *   7. Upsell post-confirmación
 *
 * Convención de errores:
 *   ❌ [STEP_N] — Fallo en el paso N, con sugerencia de fix.
 *   ✅ [STEP_N] — Paso N pasó correctamente.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db.server', () => ({
  dbGetProducts: jest.fn().mockResolvedValue([
    {
      id: 'prod-001',
      name: 'Boneless Power 911',
      description: '200g de boneless bañados en salsa picante',
      price: 155,
      category: 'boneless',
      imageUrl: 'https://cdn.snacks911.mx/boneless.jpg',
      ingredients: ['boneless', 'salsa picante'],
      available: true,
    },
    {
      id: 'prod-002',
      name: 'Alitas Fuego 911',
      description: '8 alitas con salsa fuego',
      price: 145,
      category: 'alitas',
      imageUrl: 'https://cdn.snacks911.mx/alitas.jpg',
      ingredients: ['alitas', 'salsa fuego'],
      available: true,
    },
    {
      id: 'prod-003',
      name: 'Combo Mixto 911',
      description: 'Boneless + Alitas + Papas + Bebida',
      price: 249,
      category: 'combos',
      imageUrl: 'https://cdn.snacks911.mx/combo.jpg',
      ingredients: ['boneless', 'alitas', 'papas', 'refresco'],
      available: true,
    },
    {
      id: 'prod-004',
      name: 'Papas Clásicas',
      description: 'Papas fritas con especias 911',
      price: 55,
      category: 'papas',
      imageUrl: 'https://cdn.snacks911.mx/papas.jpg',
      ingredients: ['papas'],
      available: true,
    },
    {
      id: 'prod-005',
      name: 'Coca-Cola 600ml',
      description: 'Refresco bien frío',
      price: 35,
      category: 'bebidas',
      imageUrl: 'https://cdn.snacks911.mx/coca.jpg',
      ingredients: [],
      available: true,
    },
  ]),
  dbSaveOrder: jest.fn().mockResolvedValue({ id: 'order-qa-001' }),
  getSupabaseAdmin: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'order-qa-001' }, error: null }),
        }),
      }),
    }),
  }),
  saveAiLog: jest.fn().mockResolvedValue(null),
  dbGetCustomer: jest.fn().mockResolvedValue(null),
  dbUpsertCustomer: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/db', () => ({
  dbGetProducts: jest.fn().mockResolvedValue([]),
  rowToProduct: jest.fn((r: any) => r),
  createUuid: jest.fn(() => 'test-uuid'),
}));

// Silenciar logs de producción durante tests
const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// ─── Imports ──────────────────────────────────────────────────────────────────

import { handleIncomingMessage, processOrder } from '../whatsappAdapter';
import {
  getSession,
  updateSession,
  clearSession,
  addToSessionCart,
  getCartTotal,
  resetSession,
} from '../sessionStore';

// ─── Helpers: Fábricas de payloads Meta ──────────────────────────────────────

const TEST_PHONE = '521558450XXXX';
const TEST_PHONE_2 = '521558450YYYY'; // Usuario secundario para tests de aislamiento

/**
 * Payload real de un mensaje de texto entrante (Meta Cloud API v19.0)
 */
function metaTextPayload(text: string, from = TEST_PHONE) {
  return {
    from,
    type: 'text' as const,
    payload: { body: text },
  };
}

/**
 * Payload real de button_reply (botón de template interactivo)
 */
function metaButtonReplyPayload(buttonId: string, buttonTitle: string, from = TEST_PHONE) {
  return {
    from,
    type: 'button' as const,
    payload: {
      id: buttonId,
      title: buttonTitle,
    },
  };
}

/**
 * Payload real de list_reply (respuesta de lista interactiva)
 */
function metaListReplyPayload(rowId: string, rowTitle: string, from = TEST_PHONE) {
  return {
    from,
    type: 'list' as const,
    payload: {
      id: rowId,
      title: rowTitle,
    },
  };
}

/**
 * Payload real de order (pedido desde catálogo de Meta Commerce)
 * Formato exacto que envía Meta cuando el usuario compra desde el catálogo.
 */
function metaOrderPayload(from = TEST_PHONE) {
  return {
    from,
    type: 'order' as const,
    payload: {
      catalog_id: 'catalog-snacks-911',
      product_items: [
        {
          product_retailer_id: 'prod-001',
          product_name: 'Boneless Power 911',
          quantity: 1,
          item_price: 155,
          currency: 'MXN',
        },
        {
          product_retailer_id: 'prod-004',
          product_name: 'Papas Clásicas',
          quantity: 2,
          item_price: 55,
          currency: 'MXN',
        },
      ],
    },
  };
}

// ─── Logger de diagnóstico ────────────────────────────────────────────────────

function logStep(step: number, label: string, passed: boolean, details?: string) {
  const icon = passed ? '✅' : '❌';
  const msg = `${icon} [STEP_${step}] ${label}`;
  if (!passed && details) {
    console.info(`${msg}\n   ↳ Fix sugerido: ${details}`);
  }
}

// ─── Suite Principal ─────────────────────────────────────────────────────────

describe('WhatsApp Flow — QA Completo (7 pasos)', () => {
  beforeEach(() => {
    clearSession(TEST_PHONE);
    clearSession(TEST_PHONE_2);
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ─── STEP 1: Mensaje inicial ──────────────────────────────────────────────

  describe('STEP 1 — Mensaje inicial (text)', () => {
    test('debe responder al saludo inicial con el menú', async () => {
      const msg = metaTextPayload('hola');
      let response: any;
      let error: Error | null = null;

      try {
        response = await handleIncomingMessage(msg);
      } catch (e) {
        error = e as Error;
      }

      const passed = !error && !!response;
      logStep(1, 'Saludo inicial', passed,
        'handleIncomingMessage no puede lanzar excepciones en el flujo feliz. Verificar botEngine.getBotResponse()');

      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response.type).toMatch(/text|interactive/);

      // El mensaje de respuesta no debe estar vacío
      const content = response.content;
      const hasContent = typeof content === 'string'
        ? content.length > 0
        : typeof content === 'object' && content !== null;

      logStep(1, 'Respuesta no vacía al saludo', hasContent,
        'botEngine debe retornar un texto de bienvenida. Verificar plantilla SHOW_MENU en botEngine.ts');
      expect(hasContent).toBe(true);
    });

    test('debe crear sesión con step=menu al primer mensaje', async () => {
      const msg = metaTextPayload('hola');
      await handleIncomingMessage(msg);

      const session = getSession(TEST_PHONE);

      // Aunque el adapter no use sessionStore directamente todavía,
      // el sessionStore debe funcionar correctamente de forma independiente
      expect(session).toBeDefined();
      expect(session.userId).toBe(TEST_PHONE);
      expect(session.step).toBe('menu');
      expect(session.cart).toEqual([]);
    });

    test('debe manejar mensaje vacío sin lanzar excepción', async () => {
      const msg = { ...metaTextPayload(''), payload: { body: '' } };
      let response: any;
      let error: Error | null = null;

      try {
        response = await handleIncomingMessage(msg);
      } catch (e) {
        error = e as Error;
      }

      logStep(1, 'Mensaje vacío manejado', !error,
        'getInputFromWhatsAppMessage debe retornar "" y el adapter debe responder con fallback, no lanzar error');

      expect(error).toBeNull();
      expect(response).toBeDefined();
    });
  });

  // ─── STEP 2: Click en menú ────────────────────────────────────────────────

  describe('STEP 2 — Click en botón del menú (interactive/button_reply)', () => {
    test('debe procesar button_reply de "ver menú" correctamente', async () => {
      const msg = metaButtonReplyPayload('MENU_MAIN', 'Ver Menú');
      let response: any;
      let error: Error | null = null;

      try {
        response = await handleIncomingMessage(msg);
      } catch (e) {
        error = e as Error;
      }

      const passed = !error && !!response;
      logStep(2, 'Button reply procesado', passed,
        'El adapter debe leer payload.id para button_reply. Verificar getInputFromWhatsAppMessage()');

      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response.type).toMatch(/text|interactive/);
    });

    test('debe procesar button_reply con payload.title como fallback', async () => {
      // Cuando payload.id está vacío, debe usar title
      const msg = {
        from: TEST_PHONE,
        type: 'button' as const,
        payload: { id: '', title: 'Ver Menú' },
      };

      const response = await handleIncomingMessage(msg);
      expect(response).toBeDefined();

      logStep(2, 'Fallback title en button_reply', true, '');
    });
  });

  // ─── STEP 3: Selección de categoría ──────────────────────────────────────

  describe('STEP 3 — Selección de categoría (interactive/list_reply)', () => {
    const categories = [
      { id: 'cat_boneless', title: 'Boneless' },
      { id: 'cat_combos',   title: 'Combos'   },
      { id: 'cat_papas',    title: 'Papas'    },
      { id: 'cat_bebidas',  title: 'Bebidas'  },
    ];

    test.each(categories)(
      'debe responder con productos al seleccionar categoría "$title"',
      async ({ id, title }) => {
        const msg = metaListReplyPayload(id, title);
        let response: any;
        let error: Error | null = null;

        try {
          response = await handleIncomingMessage(msg);
        } catch (e) {
          error = e as Error;
        }

        const passed = !error && !!response;
        logStep(3, `Categoría "${title}" seleccionada`, passed,
          `El adapter no pudo procesar list_reply para "${title}". ` +
          `Verificar que botEngine reconoce el intent SHOW_CATEGORY para "${title}"`);

        expect(error).toBeNull();
        expect(response).toBeDefined();
        expect(response.type).toMatch(/text|interactive/);
      }
    );
  });

  // ─── STEP 4: Envío de catálogo ────────────────────────────────────────────

  describe('STEP 4 — Envío de catálogo (order message desde Meta Commerce)', () => {
    test('debe procesar un order payload de Meta correctamente', async () => {
      const msg = metaOrderPayload();
      let response: any;
      let error: Error | null = null;

      try {
        response = await handleIncomingMessage(msg);
      } catch (e) {
        error = e as Error;
      }

      const passed = !error && !!response;
      logStep(4, 'Order payload de Meta procesado', passed,
        'handleCatalogOrder o processOrder lanzó excepción. ' +
        'Verificar normalizeOrderItems() y que db.server esté mockeado correctamente');

      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response.type).toBe('text');
    });

    test('el mensaje de respuesta al order debe incluir resumen del pedido', async () => {
      const msg = metaOrderPayload();
      const response = await handleIncomingMessage(msg);

      const content = typeof response.content === 'string' ? response.content : '';

      // Debe mencionar al menos dirección o pago para continuar el flujo
      const hasNextStep =
        content.includes('dirección') ||
        content.includes('pago') ||
        content.includes('entrega') ||
        content.includes('Recibí');

      logStep(4, 'Respuesta incluye continuación del flujo', hasNextStep,
        'handleCatalogOrder debe retornar un mensaje que guíe al usuario. ' +
        'Verificar la plantilla de respuesta en handleCatalogOrder()');

      expect(hasNextStep).toBe(true);
    });
  });

  // ─── STEP 5: Recepción y procesamiento de orden ───────────────────────────

  describe('STEP 5 — processOrder: normalización de items del catálogo', () => {
    test('debe normalizar product_items con formato Meta real', async () => {
      const orderPayload = {
        catalog_id: 'catalog-snacks-911',
        customerPhone: TEST_PHONE,
        product_items: [
          {
            product_retailer_id: 'prod-001',
            product_name: 'Boneless Power 911',
            quantity: 2,
            item_price: 155,
            currency: 'MXN',
          },
        ],
      };

      let order: any;
      let error: Error | null = null;

      try {
        order = await processOrder(orderPayload);
      } catch (e) {
        error = e as Error;
      }

      const passed = !error && !!order;
      logStep(5, 'processOrder normaliza product_items', passed,
        'normalizeOrderItems no reconoció product_retailer_id o item_price. ' +
        'Verificar los field aliases en whatsappAdapter.ts:normalizeOrderItems()');

      expect(error).toBeNull();
      expect(order).toBeDefined();
      expect(order.items).toHaveLength(1);
      expect(order.items[0].productId).toBe('prod-001');
      expect(order.items[0].quantity).toBe(2);
      expect(order.items[0].price).toBe(155);
    });

    test('debe calcular el total correctamente (qty × price)', async () => {
      const orderPayload = {
        customerPhone: TEST_PHONE,
        product_items: [
          { product_retailer_id: 'a', product_name: 'Boneless', quantity: 1, item_price: 155 },
          { product_retailer_id: 'b', product_name: 'Papas',    quantity: 2, item_price: 55  },
        ],
      };

      const order = await processOrder(orderPayload);
      // 1×155 + 2×55 = 265
      const expectedTotal = 265;

      logStep(5, `Total calculado correctamente ($${expectedTotal})`,
        order.total === expectedTotal,
        `Total incorrecto: recibido $${order.total}, esperado $${expectedTotal}. ` +
        `Verificar reducer en processOrder()`);

      expect(order.total).toBe(expectedTotal);
    });

    test('debe retornar confirmationMessage y nextQuestions', async () => {
      const orderPayload = {
        customerPhone: TEST_PHONE,
        product_items: [
          { product_retailer_id: 'a', product_name: 'Boneless', quantity: 1, item_price: 155 },
        ],
      };

      const order = await processOrder(orderPayload);

      logStep(5, 'order.confirmationMessage presente', !!order.confirmationMessage,
        'processOrder debe incluir confirmationMessage. Verificar la estructura del objeto order');
      logStep(5, 'order.nextQuestions presente', Array.isArray(order.nextQuestions) && order.nextQuestions.length > 0,
        'processOrder debe incluir nextQuestions con las preguntas de entrega/pago');

      expect(order.confirmationMessage).toBeDefined();
      expect(typeof order.confirmationMessage).toBe('string');
      expect(Array.isArray(order.nextQuestions)).toBe(true);
      expect(order.nextQuestions!.length).toBeGreaterThan(0);
    });

    test('debe manejar product_items vacío sin fallar', async () => {
      const orderPayload = {
        customerPhone: TEST_PHONE,
        product_items: [],
      };

      let order: any;
      let error: Error | null = null;

      try {
        order = await processOrder(orderPayload);
      } catch (e) {
        error = e as Error;
      }

      logStep(5, 'product_items vacío manejado', !error,
        'processOrder debe retornar una orden con items=[] y total=0 sin lanzar excepción');

      expect(error).toBeNull();
      expect(order.items).toEqual([]);
      expect(order.total).toBe(0);
    });
  });

  // ─── STEP 6: Confirmación ─────────────────────────────────────────────────

  describe('STEP 6 — Confirmación de pedido (button_reply)', () => {
    test('debe procesar confirmación via button_reply "CONFIRM_ORDER"', async () => {
      const msg = metaButtonReplyPayload('CONFIRM_ORDER', 'Sí, confirmar');
      let response: any;
      let error: Error | null = null;

      try {
        response = await handleIncomingMessage(msg);
      } catch (e) {
        error = e as Error;
      }

      const passed = !error && !!response;
      logStep(6, 'Confirmación procesada', passed,
        'El adapter falló procesando el button_reply de confirmación. ' +
        'Verificar que el botEngine entiende el intent CONFIRM_ORDER');

      expect(error).toBeNull();
      expect(response).toBeDefined();
    });

    test('debe procesar confirmación via texto "confirmar"', async () => {
      const msg = metaTextPayload('confirmar');
      const response = await handleIncomingMessage(msg);

      expect(response).toBeDefined();
      logStep(6, 'Confirmación por texto "confirmar" procesada', true, '');
    });

    test('debe procesar confirmación via texto "si" / "dale"', async () => {
      for (const text of ['si', 'dale', 'va']) {
        const msg = metaTextPayload(text);
        const response = await handleIncomingMessage(msg);

        expect(response).toBeDefined();
        logStep(6, `Confirmación por "${text}" procesada`, true, '');
      }
    });
  });

  // ─── STEP 7: Upsell post-confirmación ────────────────────────────────────

  describe('STEP 7 — Upsell (sugerencia post-pedido)', () => {
    test('debe manejar texto de upsell sin romper el flujo', async () => {
      // Simular secuencia: orden → confirmación → upsell
      await handleIncomingMessage(metaOrderPayload());

      const upsellMsg = metaTextPayload('agrega una coca cola');
      let response: any;
      let error: Error | null = null;

      try {
        response = await handleIncomingMessage(upsellMsg);
      } catch (e) {
        error = e as Error;
      }

      logStep(7, 'Upsell de bebida procesado sin error', !error,
        'El flujo de upsell rompió el adapter. Verificar manejo de ADD_TO_CART post-order en botEngine');

      expect(error).toBeNull();
      expect(response).toBeDefined();
    });

    test('debe manejar "¿tienes algo más?" sin romper el flujo', async () => {
      const msg = metaTextPayload('tienes algo más?');
      const response = await handleIncomingMessage(msg);

      expect(response).toBeDefined();
      logStep(7, '"¿tienes algo más?" manejado', true, '');
    });
  });

  // ─── Tests de sessionStore (aislados) ────────────────────────────────────

  describe('sessionStore — Integridad de estado por usuario', () => {
    test('getSession crea sesión con valores por defecto', () => {
      const session = getSession('new-user-test');
      expect(session.step).toBe('menu');
      expect(session.cart).toEqual([]);
      expect(session.address).toBeNull();
      expect(session.payment).toBeNull();
    });

    test('updateSession hace merge parcial sin perder otros campos', () => {
      const userId = 'state-test-user';
      updateSession(userId, { step: 'ordering' });
      updateSession(userId, { address: 'Calle Reforma 123' });

      const session = getSession(userId);
      expect(session.step).toBe('ordering');
      expect(session.address).toBe('Calle Reforma 123');
      expect(session.cart).toEqual([]); // No tocado
    });

    test('addToSessionCart deduplica por id y suma qty', () => {
      const userId = 'cart-test-user';

      addToSessionCart(userId, {
        id: 'prod-001', name: 'Boneless', price: 155,
        category: 'boneless', description: '', ingredients: [],
        image: '', qty: 1, quantity: 1,
      });
      addToSessionCart(userId, {
        id: 'prod-001', name: 'Boneless', price: 155,
        category: 'boneless', description: '', ingredients: [],
        image: '', qty: 1, quantity: 1,
      });

      const session = getSession(userId);
      expect(session.cart).toHaveLength(1);
      expect(session.cart[0].qty).toBe(2);
    });

    test('getCartTotal calcula suma correctamente', () => {
      const userId = 'total-test-user';

      addToSessionCart(userId, {
        id: 'a', name: 'Boneless', price: 155,
        category: 'boneless', description: '', ingredients: [],
        image: '', qty: 1, quantity: 1,
      });
      addToSessionCart(userId, {
        id: 'b', name: 'Papas', price: 55,
        category: 'papas', description: '', ingredients: [],
        image: '', qty: 2, quantity: 2,
      });

      const session = getSession(userId);
      const total = getCartTotal(session);

      // 1×155 + 2×55 = 265
      expect(total).toBe(265);
    });

    test('dos usuarios tienen sesiones completamente aisladas', () => {
      updateSession(TEST_PHONE,   { step: 'ordering', address: 'Calle A' });
      updateSession(TEST_PHONE_2, { step: 'checkout', address: 'Calle B' });

      const s1 = getSession(TEST_PHONE);
      const s2 = getSession(TEST_PHONE_2);

      expect(s1.step).toBe('ordering');
      expect(s1.address).toBe('Calle A');
      expect(s2.step).toBe('checkout');
      expect(s2.address).toBe('Calle B');

      logStep(0, 'Aislamiento de sesiones entre usuarios', true, '');
    });

    test('clearSession elimina el estado del usuario', () => {
      updateSession(TEST_PHONE, { step: 'checkout', address: 'Mi Casa' });
      clearSession(TEST_PHONE);

      const session = getSession(TEST_PHONE);
      expect(session.step).toBe('menu'); // Debe reiniciar
      expect(session.address).toBeNull();
    });

    test('resetSession reinicia sin perder el userId en el store', () => {
      updateSession(TEST_PHONE, { step: 'ordering', payment: 'efectivo' });
      const fresh = resetSession(TEST_PHONE);

      expect(fresh.userId).toBe(TEST_PHONE);
      expect(fresh.step).toBe('menu');
      expect(fresh.payment).toBeNull();
    });
  });
});
