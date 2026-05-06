import { Product } from '@/data/products';

/**
 * Filters products based on a list of allergies.
 * - Case-insensitive matching against name, description, and ingredients.
 * - If "salchicha" is in the allergies list, items containing "salchicha" or "banderilla" are excluded.
 */
export function filterProducts(products: Product[], allergies: string[] = []): Product[] {
  if (!allergies || allergies.length === 0) return products;

  const lowerAllergies = allergies.map(a => a.toLowerCase());
  const hasSalchichaAllergy = lowerAllergies.includes('salchicha');

  return products.filter(product => {
    const name = product.name.toLowerCase();
    const description = product.description.toLowerCase();
    const ingredients = (product.ingredients || []).map(i => i.toLowerCase());
    const content = `${name} ${description} ${ingredients.join(' ')}`;

    // Exclude if any allergen is found in the product content
    if (lowerAllergies.some(allergy => content.includes(allergy))) {
      return false;
    }

    // Special rule: salchicha allergy also excludes banderilla
    if (hasSalchichaAllergy && content.includes('banderilla')) {
      return false;
    }

    return true;
  });
}
