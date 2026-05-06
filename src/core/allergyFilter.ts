import { Product } from '@/data/products';

/**
 * Check if a single product is safe for given allergies.
 * - Case-insensitive matching against name, description, and ingredients.
 * - SPECIAL RULE: if allergies include "salchicha" → exclude items with "salchicha" OR "banderilla".
 */
export function isProductSafe(product: Product, allergies: string[] = []): boolean {
  if (!allergies || allergies.length === 0) return true;

  const lowerAllergies = allergies.map(a => a.toLowerCase());
  const hasSalchichaAllergy = lowerAllergies.includes('salchicha');
  
  const name = product.name.toLowerCase();
  const description = product.description.toLowerCase();
  const ingredients = (product.ingredients || []).map(i => i.toLowerCase());
  const content = `${name} ${description} ${ingredients.join(' ')}`;

  // 1. General allergen check
  if (lowerAllergies.some(allergy => content.includes(allergy))) {
    return false;
  }

  // 2. Special rule for salchicha (also blocks banderilla)
  if (hasSalchichaAllergy && content.includes('banderilla')) {
    return false;
  }

  return true;
}

/**
 * Filters a list of products based on allergies.
 */
export function filterProducts(products: Product[], allergies: string[] = []): Product[] {
  return products.filter(p => isProductSafe(p, allergies));
}
