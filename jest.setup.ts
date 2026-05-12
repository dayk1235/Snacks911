(process.env as any).NODE_ENV = 'test';

globalThis.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
  }),
) as jest.Mock;

// ─── Chainable Supabase Mock ────────────────────────────────────────────────
// Simulates supabase-js query builder: from().select().insert().update().delete().eq().single() etc.
// Every chain method returns a thenable resolved to { data: null, error: null }.
function createMockSupabaseClient() {
  const thenHandler = (resolve: (v: any) => void) =>
    resolve({ data: null, error: null });

  const chain: Record<string, any> = {
    then: thenHandler,
  };

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike', 'is', 'in',
    'order', 'limit', 'range', 'not', 'or', 'match', 'filter', 'overlaps',
    'single', 'maybeSingle', 'csv',
    'setHeader', 'abortSignal',
  ];

  for (const method of chainMethods) {
    chain[method] = () => chain;
  }

  return {
    from: () => chain,
    auth: {
      signOut: () => Promise.resolve(),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => Promise.resolve() }),
      subscribe: () => Promise.resolve(),
      unsubscribe: () => Promise.resolve(),
    }),
    removeChannel: () => Promise.resolve(),
    removeAllChannels: () => Promise.resolve(),
    getChannels: () => [],
    ...chain,
  };
}

const mockSupabase = createMockSupabaseClient();

jest.mock('@/lib/supabase', () => ({
  __esModule: true,
  supabase: mockSupabase,
}));

jest.mock('@/lib/db.server', () => ({
  __esModule: true,
  dbGetProducts: jest.fn(async () => [
    { id: '1', name: 'Papas Loaded', price: 69, cost: 25, category: 'papas', imageUrl: '', available: true, description: '', ingredients: ['papas', 'queso'] },
    { id: '2', name: 'Refresco 600ml', price: 25, cost: 5, category: 'bebidas', imageUrl: '', available: true, description: '', ingredients: ['agua', 'azucar'] },
    { id: '3', name: 'Brownie con Helado', price: 59, cost: 15, category: 'postres', imageUrl: '', available: true, description: '', ingredients: ['chocolate'] },
    { id: '4', name: 'Combo 911', price: 119, cost: 40, category: 'combos', imageUrl: '', available: true, description: '', ingredients: ['alitas', 'papas'] },
    { id: '5', name: 'Combo Callejero', price: 99, cost: 35, category: 'combos', imageUrl: '', available: true, description: '', ingredients: ['salchicha', 'papa'] },
    { id: '6', name: 'Boneless 250g', price: 129, cost: 45, category: 'boneless', imageUrl: '', available: true, description: '', ingredients: ['pollo', 'salsa'] },
  ]),
  dbGetProductsSafe: jest.fn(async () => [
    { id: '1', name: 'Papas Loaded', price: 69, cost: 25, category: 'papas', imageUrl: '', available: true, description: '', ingredients: ['papas', 'queso'] },
    { id: '2', name: 'Refresco 600ml', price: 25, cost: 5, category: 'bebidas', imageUrl: '', available: true, description: '', ingredients: ['agua', 'azucar'] },
    { id: '3', name: 'Brownie con Helado', price: 59, cost: 15, category: 'postres', imageUrl: '', available: true, description: '', ingredients: ['chocolate'] },
    { id: '4', name: 'Combo 911', price: 119, cost: 40, category: 'combos', imageUrl: '', available: true, description: '', ingredients: ['alitas', 'papas'] },
    { id: '5', name: 'Combo Callejero', price: 99, cost: 35, category: 'combos', imageUrl: '', available: true, description: '', ingredients: ['salchicha', 'papa'] },
    { id: '6', name: 'Boneless 250g', price: 129, cost: 45, category: 'boneless', imageUrl: '', available: true, description: '', ingredients: ['pollo', 'salsa'] },
  ]),
  db: mockSupabase,
  supabase: mockSupabase,
  getSupabaseAdmin: () => mockSupabase,
  supabaseAnon: mockSupabase,
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

jest.mock('@/lib/tenant/tenantResolver', () => ({
  __esModule: true,
  getTenantBySlug: jest.fn().mockResolvedValue({
    id: 'test-tenant-uuid',
    slug: 'snacks911',
    business_name: 'Snacks 911 Test',
    whatsapp_number: '525584507458',
    whatsapp_token: 'test-whatsapp-token',
    ai_personality: 'Eres un mesero experto en alitas y snacks, muy amable y eficiente.',
    primary_color: '#FF5722',
    logo_url: null,
    plan: 'pro',
  }),
  getTenantByWhatsAppNumber: jest.fn().mockResolvedValue({
    id: 'test-tenant-uuid',
    slug: 'snacks911',
    business_name: 'Snacks 911 Test',
    whatsapp_number: '525584507458',
    whatsapp_token: 'test-whatsapp-token',
    ai_personality: 'Eres un mesero experto en alitas y snacks, muy amable y eficiente.',
    primary_color: '#FF5722',
    logo_url: null,
    plan: 'pro',
  }),
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

jest.mock("@/lib/payments/conekta", () => ({
  __esModule: true,
  createPaymentLink: async () => "https://mock-payment-link.com"
}));
