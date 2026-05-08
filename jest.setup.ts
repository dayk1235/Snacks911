// process.env.NODE_ENV = 'test';

globalThis.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
  }),
) as jest.Mock;

jest.mock('@/lib/db.server', () => ({
  __esModule: true,
  dbGetProducts: jest.fn(async () => [
    { id: '1', name: 'Papas Loaded', price: 69, category: 'papas', imageUrl: '', available: true, description: '', ingredients: ['papas', 'queso'] },
    { id: '2', name: 'Refresco 600ml', price: 25, category: 'bebidas', imageUrl: '', available: true, description: '', ingredients: ['agua', 'azucar'] },
    { id: '3', name: 'Brownie con Helado', price: 59, category: 'postres', imageUrl: '', available: true, description: '', ingredients: ['chocolate'] },
    { id: '4', name: 'Combo 911', price: 119, category: 'combos', imageUrl: '', available: true, description: '', ingredients: ['alitas', 'papas'] },
    { id: '5', name: 'Combo Callejero', price: 99, category: 'combos', imageUrl: '', available: true, description: '', ingredients: ['salchicha', 'papa'] },
    { id: '6', name: 'Boneless 250g', price: 129, category: 'boneless', imageUrl: '', available: true, description: '', ingredients: ['pollo', 'salsa'] },
  ]),
  dbGetProductsSafe: jest.fn(async () => [
    { id: '1', name: 'Papas Loaded', price: 69, category: 'papas', imageUrl: '', available: true, description: '', ingredients: ['papas', 'queso'] },
    { id: '2', name: 'Refresco 600ml', price: 25, category: 'bebidas', imageUrl: '', available: true, description: '', ingredients: ['agua', 'azucar'] },
    { id: '3', name: 'Brownie con Helado', price: 59, category: 'postres', imageUrl: '', available: true, description: '', ingredients: ['chocolate'] },
    { id: '4', name: 'Combo 911', price: 119, category: 'combos', imageUrl: '', available: true, description: '', ingredients: ['alitas', 'papas'] },
    { id: '5', name: 'Combo Callejero', price: 99, category: 'combos', imageUrl: '', available: true, description: '', ingredients: ['salchicha', 'papa'] },
    { id: '6', name: 'Boneless 250g', price: 129, category: 'boneless', imageUrl: '', available: true, description: '', ingredients: ['pollo', 'salsa'] },
  ]),
  db: {},
  supabase: {},
  getSupabaseAdmin: () => ({}),
  supabaseAnon: {},
  getCustomerProfileFromDB: async () => null,
  upsertCustomerProfile: async () => {},
  saveAiLog: async () => {},
  saveAiCost: async () => {},
  dbSaveOrder: async () => {},
  checkCartAbandonment: async () => ({ abandoned: false, cartValue: 0, lastCartAt: '' }),
  getContext: () => ({ cart: { items: [], total: 0 } }),
  updateContext: () => {},
  clearContext: () => {},
  getSystemState: async () => null,
  updateSystemState: async () => {},
  createUuid: () => 'test-uuid',
}));
jest.mock('@/lib/whatsapp/aiService', () => ({
  getAIResponse: jest.fn(async () => ({
    intent: 'producto',
    message_to_user: '¡Claro! Te agrego esos boneless BBQ. ¿Gustas algo más?',
    intent_suggestion: 'UPSELL',
    entities: { producto: 'boneless', salsa: 'bbq' }
  })),
  buildContextPayload: jest.fn((p, m, a, pr, c, msg) => ({})),
  rewriteMessage: jest.fn(async (m) => m),
}));
