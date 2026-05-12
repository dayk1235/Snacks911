jest.mock('@/lib/db.server', () => ({ dbGetProducts: jest.fn().mockResolvedValue([{ id: '1', name: 'Wings', price: 120, category: 'wings', available: true }, { id: '2', name: 'Boneless', price: 100, category: 'boneless', available: true }, { id: '3', name: 'Papas', price: 60, category: 'papas', available: true }]), dbSaveOrder: jest.fn().mockResolvedValue({ id: 'order-1' }), saveAiLog: jest.fn().mockResolvedValue(null), getDbModule: jest.fn().mockReturnValue({ dbGetProducts: jest.fn().mockResolvedValue([]) }) }));
jest.mock('@/lib/db', () => ({ dbGetProducts: jest.fn().mockResolvedValue([]), rowToProduct: jest.fn(r => r), createUuid: jest.fn(() => 'test-uuid') }));

import '../../tests/env-setup';
import { getBotResponse } from '../botEngine';
import { filterProducts } from '../allergyFilter';
import { evaluateBot, EvalCase } from '../evaluator';

console.log('ENV URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Productos de prueba
const mockProducts = [
  {
    id: '1',
    name: 'Combo Mixto 911',
    description: 'Boneless 150g + Alitas 6pz + Papas + Bebida',
    price: 249,
    category: 'combos',
    ingredients: ['boneless', 'alitas', 'papas', 'bebida'],
  },
  {
    id: '12',
    name: 'Salchipapas',
    description: 'Salchicha + papas + vegetales',
    price: 85,
    category: 'papas',
    ingredients: ['salchicha', 'papa'],
  },
  {
    id: '10',
    name: 'Papas Clásicas',
    description: 'Con sal y especias 911',
    price: 45,
    category: 'papas',
    ingredients: ['papas'],
  },
  {
    id: '13',
    name: 'Banderilla Coreana',
    description: 'Empanizada con salsa especial',
    price: 79,
    category: 'banderillas',
    ingredients: ['salchicha', 'masa'],
  },
  {
    id: '11',
    name: 'Papas con Queso',
    description: 'Cheddar fundido + tocino',
    price: 65,
    category: 'papas',
    ingredients: ['papas', 'queso', 'tocino'],
  },
];

export async function runBot(input: string) {
  const res = await getBotResponse({
    message: input,
    phone: 'test-user'
  });

  return {
    intent: res.intent,
    text: res.text,
    cartCount: res.cart?.items?.length || 0
  };
}

const cases: EvalCase[] = [
    // ── Original 5 ────────────────────────────────────────────────────────
    { input: 'hola',                        expectedIntent: 'SHOW_MENU' },
    { input: 'quiero boneless',             expectedIntent: 'ADD_TO_CART' },
    { input: 'agrega papas',               expectedIntent: 'ADD_TO_CART' },
    { input: 'ver carrito',                expectedIntent: 'VIEW_CART' },
    { input: 'confirmar',                  expectedIntent: 'CONFIRM_ORDER' },

    // ── ADD_TO_CART — slang & typos ───────────────────────────────────────
    { input: 'qiero bonles',               expectedIntent: 'ADD_TO_CART' },
    { input: 'bnls porfavor',              expectedIntent: 'ADD_TO_CART' },
    { input: 'dame bonless',               expectedIntent: 'ADD_TO_CART' },
    { input: 'ponme unas papaz',           expectedIntent: 'ADD_TO_CART' },
    { input: 'agregar alitas',             expectedIntent: 'ADD_TO_CART' },
    { input: 'quiero unas alitas',         expectedIntent: 'ADD_TO_CART' },
    { input: 'pon un combo mixto',         expectedIntent: 'ADD_TO_CART' },
    { input: 'manda boneles',              expectedIntent: 'ADD_TO_CART' },
    { input: 'q me pones unas papas',      expectedIntent: 'ADD_TO_CART' },
    { input: 'añade un refresco',          expectedIntent: 'ADD_TO_CART' },
    { input: 'ponme salchipapas',          expectedIntent: 'ADD_TO_CART' },
    { input: 'quiero 1 combo',             expectedIntent: 'ADD_TO_CART' },
    { input: 'dame unas wings',            expectedIntent: 'ADD_TO_CART' },
    { input: 'metele una banderilla',      expectedIntent: 'ADD_TO_CART' },
    { input: 'agrega bnls power',          expectedIntent: 'ADD_TO_CART' },

    // ── SHOW_CATEGORY — natural phrases ───────────────────────────────────
    { input: 'tienes algo con papas?',     expectedIntent: 'SHOW_CATEGORY' },
    { input: 'que tienen de papas',        expectedIntent: 'SHOW_CATEGORY' },
    { input: 'muestrame combos',           expectedIntent: 'SHOW_CATEGORY' },
    { input: 'ver alitas',                 expectedIntent: 'SHOW_CATEGORY' },
    { input: 'opciones de bebidas',        expectedIntent: 'SHOW_CATEGORY' },
    { input: 'k tienen de proteina',       expectedIntent: 'SHOW_CATEGORY' },
    { input: 'listame los combos',         expectedIntent: 'SHOW_CATEGORY' },

    // ── SHOW_MENU ─────────────────────────────────────────────────────────
    { input: 'menu',                       expectedIntent: 'SHOW_MENU' },
    { input: 'que tienen?',               expectedIntent: 'SHOW_MENU' },
    { input: 'ver menú',                  expectedIntent: 'SHOW_MENU' },
    { input: 'muestrame todo',            expectedIntent: 'SHOW_MENU' },
    { input: 'q hay de comer',            expectedIntent: 'SHOW_MENU' },
    { input: 'buenas tardes',             expectedIntent: 'SHOW_MENU' },
    { input: 'buen dia',                  expectedIntent: 'SHOW_MENU' },

    // ── RECOMMEND ─────────────────────────────────────────────────────────
    { input: 'dame algo barato',          expectedIntent: 'RECOMMEND' },
    { input: 'no se que pedir',           expectedIntent: 'RECOMMEND' },
    { input: 'que me recomiendas',        expectedIntent: 'RECOMMEND' },
    { input: 'sugiereme algo',            expectedIntent: 'RECOMMEND' },
    { input: 'que es lo mejor',          expectedIntent: 'RECOMMEND' },
    { input: 'sorprendeme',              expectedIntent: 'RECOMMEND' },
    { input: 'algo rico para compartir', expectedIntent: 'RECOMMEND' },

    // ── VIEW_CART ─────────────────────────────────────────────────────────
    { input: 'mi pedido',                expectedIntent: 'VIEW_CART' },
    { input: 'q llevo',                  expectedIntent: 'VIEW_CART' },
    { input: 'que tengo en el carrito',  expectedIntent: 'VIEW_CART' },
    { input: 'ver orden',                expectedIntent: 'VIEW_CART' },
    { input: 'cuanto va mi pedido',      expectedIntent: 'VIEW_CART' },

    // ── CONFIRM_ORDER ─────────────────────────────────────────────────────
    { input: 'si',                       expectedIntent: 'CONFIRM_ORDER' },
    { input: 'listo, mandalo',           expectedIntent: 'CONFIRM_ORDER' },
    { input: 'ya confirmame',            expectedIntent: 'CONFIRM_ORDER' },
    { input: 'ok manda el pedido',       expectedIntent: 'CONFIRM_ORDER' },
    { input: 'confirmo',                 expectedIntent: 'CONFIRM_ORDER' },
    { input: 'dale',                     expectedIntent: 'CONFIRM_ORDER' },
  ];

async function runFlowTest(cases: EvalCase[]) {
  console.log('🚀 INICIANDO TEST DE FLUJO MODULAR CON EVALUATOR\n');

  const result = await evaluateBot(cases, runBot);

  if (process.env.NODE_ENV !== 'test') {
    console.log(`
=== EVALUATION ===
Intent Accuracy:  ${(result.intentAccuracy  * 100).toFixed(1)}%
Cart Accuracy:    ${(result.cartAccuracy    * 100).toFixed(1)}%
Flow Completion:  ${(result.flowCompletion  * 100).toFixed(1)}%
Upsell Success:   ${(result.upsellSuccess   * 100).toFixed(1)}%
Total Cases:      ${result.total}
`);
  }
}

if (process.env.NODE_ENV === 'test') {
  describe('Flow', () => {
    beforeEach(() => jest.clearAllMocks());
    test('completo', async () => {
      await runFlowTest(cases);
    }, 30000);

    test('resolves tenant and uses business name in greeting', async () => {
      const res = await getBotResponse({
        message: 'hola',
        phone: 'tenant-test-phone',
        tenantId: 'snacks911',
      });
      const ctx = res.nextState as Record<string, unknown>;
      expect(ctx.businessName).toBe('Snacks 911 Test');
      expect(res.text).toContain('Snacks 911 Test');
    });
  });
} else {
  runFlowTest(cases).catch(err => {
    console.error('❌ ERROR DURANTE EL TEST:', err);
    process.exit(1);
  });
}
