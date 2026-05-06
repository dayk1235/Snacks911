import { extractFoodIntent, rankProductsByIntent } from '@/core/contextRanker';

const MOCK_PRODUCTS = [
  { id: 1, name: 'Papas Clásicas', category: 'papas', price: 45 },
  { id: 2, name: 'Papas con Queso', category: 'papas', price: 55 },
  { id: 3, name: 'Papas 911 Loaded', category: 'papas', price: 65 },
  { id: 4, name: 'Combo Mixto', category: 'combos', price: 120 },
  { id: 5, name: 'Boneless 8 pz', category: 'boneless', price: 85 },
  { id: 6, name: 'Alitas BBQ', category: 'alitas', price: 90 },
  { id: 7, name: 'Papas Francesas', category: 'papas', price: 45 },
  { id: 8, name: 'Combo Familiar', category: 'combos', price: 200 },
  { id: 9, name: 'Alitas Buffalo Wings', category: 'alitas', price: 95 },
  { id: 10, name: 'Papas con Salchicha', category: 'papas', price: 60 },
];

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

function expect(actual: any) {
  return {
    toContain(expected: any) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    },
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    not: {
      toBe(expected: any) {
        if (actual === expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
        }
      },
    },
    toContainEqual(expected: any) {
      const found = actual.some((item: any) => JSON.stringify(item) === JSON.stringify(expected));
      if (!found) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    },
  };
}

// Tests
test('extracts papas category from input', () => {
  const intent = extractFoodIntent('quiero algo con papas');
  expect(intent.categories).toContain('papas');
});

test('extracts synonyms: francesa → papas', () => {
  const intent = extractFoodIntent('papas francesas');
  expect(intent.categories).toContain('papas');
});

test('extracts synonyms: wings → alitas', () => {
  const intent = extractFoodIntent('buffalo wings');
  expect(intent.categories).toContain('alitas');
});

test('ranks papas products first when user mentions papas', () => {
  const intent = extractFoodIntent('quiero algo con papas');
  const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

  expect(ranked[0].category).toBe('papas');
  expect(ranked[1].category).toBe('papas');
  expect(ranked[2].category).toBe('papas');
});

test('does NOT put Combo Mixto first when user asks for papas', () => {
  const intent = extractFoodIntent('quiero algo con papas');
  const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

  expect(ranked[0].name).not.toBe('Combo Mixto');
  expect(ranked[0].category).toBe('papas');
});

test('returns all products (no filtering), just reordered', () => {
  const intent = extractFoodIntent('papas');
  const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

  expect(ranked.length).toBe(MOCK_PRODUCTS.length);
});

test('specific case: papas sin salchicha', () => {
  const intent = extractFoodIntent('quiero algo con papas sin salchicha');
  const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

  const top3 = ranked.slice(0, 3);
  expect(top3[0].category).toBe('papas');
  expect(top3[1].category).toBe('papas');
  expect(top3[2].category).toBe('papas');
  
  // Papas con Salchicha might still appear (no exclusion logic yet)
  console.log('  Top 5:', top3.map(p => p.name));
});

test('ranks boneless products first when user mentions boneless', () => {
  const intent = extractFoodIntent('quiero boneless');
  const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

  expect(ranked[0].category).toBe('boneless');
  expect(ranked[0].name.toLowerCase()).toContain('boneless');
});

test('does NOT return Combo Mixto first when user asks for boneless', () => {
  const intent = extractFoodIntent('quiero boneless');
  const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

  expect(ranked[0].name).not.toBe('Combo Mixto');
  expect(ranked[0].category).toBe('boneless');
});

test('ranks alitas products first when user mentions alitas', () => {
  const intent = extractFoodIntent('quiero alitas');
  const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

  expect(ranked[0].category).toBe('alitas');
  expect(ranked[0].name.toLowerCase()).toContain('alitas');
});

test('does NOT return Combo Mixto first when user asks for alitas', () => {
  const intent = extractFoodIntent('quiero alitas');
  const ranked = rankProductsByIntent(MOCK_PRODUCTS, intent);

  expect(ranked[0].name).not.toBe('Combo Mixto');
  expect(ranked[0].category).toBe('alitas');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
