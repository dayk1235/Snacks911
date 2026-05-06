import { extractFoodIntent, rankProductsByIntent } from '@/core/contextRanker';

const MOCK_PRODUCTS = [
  { id: '1', name: 'Papas Clásicas', category: 'papas', price: 45, description: '', ingredients: ['papas'] },
  { id: '2', name: 'Papas con Queso', category: 'papas', price: 55, description: '', ingredients: ['papas', 'queso'] },
  { id: '3', name: 'Papas 911 Loaded', category: 'papas', price: 65, description: '', ingredients: ['papas', 'queso', 'tocino'] },
  { id: '4', name: 'Combo Mixto', category: 'combos', price: 120, description: '', ingredients: [] },
  { id: '5', name: 'Boneless 8 pz', category: 'boneless', price: 85, description: '', ingredients: ['pollo'] },
  { id: '6', name: 'Alitas BBQ', category: 'alitas', price: 90, description: '', ingredients: ['alitas'] },
  { id: '7', name: 'Papas Francesas', category: 'papas', price: 45, description: '', ingredients: ['papas'] },
  { id: '8', name: 'Combo Familiar', category: 'combos', price: 200, description: '', ingredients: [] },
  { id: '9', name: 'Alitas Buffalo Wings', category: 'alitas', price: 95, description: '', ingredients: ['alitas'] },
  { id: '10', name: 'Papas con Salchicha', category: 'papas', price: 60, description: '', ingredients: ['papas', 'salchicha'] },
];

// Helper to support both Jest and standalone tsx execution
const _test = typeof describe !== 'undefined' ? it : (name: string, fn: () => void) => {
  try { fn(); console.log(`✓ ${name}`); } catch (e: any) { console.log(`✗ ${name}\n  Error: ${e.message}`); process.exit(1); }
};
const _expect = typeof expect !== 'undefined' ? expect : (actual: any) => ({
  toContain(expected: any) {
    if (!actual.includes(expected)) throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
  },
  toBe(expected: any) {
    if (actual !== expected) throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
  },
  not: {
    toBe(expected: any) {
      if (actual === expected) throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
    },
  },
});

function runTests() {
  _test('extracts papas category from input', () => {
    const intent = extractFoodIntent('quiero algo con papas');
    _expect(intent.categories).toContain('papas');
  });

  _test('extracts synonyms: francesa → papas', () => {
    const intent = extractFoodIntent('papas francesas');
    _expect(intent.categories).toContain('papas');
  });

  _test('extracts synonyms: wings → alitas', () => {
    const intent = extractFoodIntent('buffalo wings');
    _expect(intent.categories).toContain('alitas');
  });

  _test('ranks papas products first when user mentions papas', () => {
    const intent = extractFoodIntent('quiero algo con papas');
    const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

    _expect(ranked[0].category).toBe('papas');
    _expect(ranked[1].category).toBe('papas');
    _expect(ranked[2].category).toBe('papas');
  });

  _test('does NOT put Combo Mixto first when user asks for papas', () => {
    const intent = extractFoodIntent('quiero algo con papas');
    const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

    _expect(ranked[0].name).not.toBe('Combo Mixto');
    _expect(ranked[0].category).toBe('papas');
  });

  _test('returns all products (no filtering), just reordered', () => {
    const intent = extractFoodIntent('papas');
    const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

    _expect(ranked.length).toBe(MOCK_PRODUCTS.length);
  });

  _test('specific case: papas sin salchicha', () => {
    const intent = extractFoodIntent('quiero algo con papas sin salchicha');
    const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

    const top3 = ranked.slice(0, 3);
    _expect(top3[0].category).toBe('papas');
    _expect(top3[1].category).toBe('papas');
    _expect(top3[2].category).toBe('papas');
  });

  _test('ranks boneless products first when user mentions boneless', () => {
    const intent = extractFoodIntent('quiero boneless');
    const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

    _expect(ranked[0].category).toBe('boneless');
    _expect(ranked[0].name.toLowerCase()).toContain('boneless');
  });

  _test('ranks alitas products first when user mentions alitas', () => {
    const intent = extractFoodIntent('quiero alitas');
    const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

    _expect(ranked[0].category).toBe('alitas');
    _expect(ranked[0].name.toLowerCase()).toContain('alitas');
  });
}

// Only run standalone if not in Jest environment
if (typeof describe === 'undefined') {
  console.log('Running context ranking tests standalone...');
  runTests();
  console.log(`\nTests completed!`);
} else {
  // In Jest, we define the tests
  describe('Context Ranking Intent & Ordering', () => {
    runTests();
  });
}
