import { Product } from '@/data/products';

/**
 * Check if a single product is safe for given allergies.
 * - Case-insensitive matching against name, description, and ingredients.
 * - SPECIAL RULE: if allergies include "salchicha" → exclude items with "salchicha" OR "banderilla".
 */
export function isProductSafe(product: Product, allergies: string[] = []): boolean {
  if (!allergies || allergies.length === 0) return true;

  const lowerAllergies = allergies.map(a => a.toLowerCase().trim()).filter(a => a.length > 0);
  if (lowerAllergies.length === 0) return true;

  // RULE: Check ONLY ingredients, ignore name/description
  const ingredients = (product.ingredients || []).map(i => i.toLowerCase().trim());
  
  // Log de diagnóstico: mostrar producto, ingredientes y alergias
  console.log(`[allergyFilter] Revisando: "${product.name}", Ingredientes: [${ingredients.join(', ')}], Alergias: [${lowerAllergies.join(', ')}]`);
  
  for (const allergy of lowerAllergies) {
    // 1. Direct match in ingredients: find the exact ingredient that conflicts
    // Check both directions: ingredient contains allergy OR allergy contains ingredient
    const conflictingIngredient = ingredients.find(ing => ing.includes(allergy) || allergy.includes(ing));
    if (conflictingIngredient) {
      console.log(`[allergyFilter] RECHAZADO: "${product.name}" por ingrediente conflictivo: "${conflictingIngredient}" (alergia: "${allergy}")`);
      return false;
    }

    // 2. Special rule: "salchicha" also blocks "banderilla"
    if (allergy === 'salchicha' && ingredients.includes('banderilla')) {
      console.log(`[allergyFilter] RECHAZADO: "${product.name}" por regla especial: salchicha -> banderilla (ingrediente: "banderilla")`);
      return false;
    }
  }

  return true;
}

/**
 * Filters a list of products based on allergies.
 */
export function filterProducts(products: Product[], allergies: string[] = []): Product[] {
  return products.filter(p => isProductSafe(p, allergies));
}

/**
 * Test manual para validar el filtro de alergias.
 * Compara Salchipapas vs Papas Clásicas con alergia a "salchicha".
 * Llamar manualmente desde consola: window.testAllergyFilter?.()
 */
export function testAllergyFilter(): void {
  const salchipapas: Product = {
    id: '12',
    name: 'Salchipapas',
    description: 'Salchicha + papas + vegetales + salsas',
    price: 85,
    category: 'papas',
    image: '/images/papas.webp',
    ingredients: ['salchicha', 'papa'],
    spicy: 0,
  };

  const papasClasicas: Product = {
    id: '10',
    name: 'Papas Clásicas',
    description: 'Con sal y especias 911',
    price: 45,
    category: 'papas',
    image: '/images/papas.webp',
    ingredients: ['papas'],
    spicy: 0,
  };

  const allergy = 'salchicha';
  console.log('\n🧪 [TEST ALLERGY FILTER] Alergia:', allergy);
  console.log('─'.repeat(50));

  const result1 = isProductSafe(salchipapas, [allergy]);
  console.log(`Salchipapas (ingredientes: ${salchipapas.ingredients.join(', ')}):`, result1 ? '✅ PERMITIDO' : '❌ RECHAZADO');

  const result2 = isProductSafe(papasClasicas, [allergy]);
  console.log(`Papas Clásicas (ingredientes: ${papasClasicas.ingredients.join(', ')}):`, result2 ? '✅ PERMITIDO' : '❌ RECHAZADO');

  console.log('─'.repeat(50));
  console.log('Esperado: Salchipapas=RECHAZADO, Papas Clásicas=PERMITIDO');
  console.log('Resultado:', !result1 && result2 ? '✅ TEST PASADO' : '❌ TEST FALLIDO');
  console.log('');
}

if (typeof window !== 'undefined') {
  (window as any).testAllergyFilter = testAllergyFilter;
}
