/**
 * Error handling and fallback logic for product recommendations.
 * Provides safety filtering and multi-tier fallback when initial matches fail.
 */

import { filterProducts } from '../allergyFilter';

export function applySafetyFilter(products: any[], constraints: string[]): any[] {
  if (!constraints || constraints.length === 0) {
    return products;
  }
  return filterProducts(products, constraints);
}

export function applyFallback(
  intent: string,
  matchedProducts: any[],
  safeProducts: any[],
  allProducts: any[],
): any[] {
  if (safeProducts && safeProducts.length > 0) {
    return safeProducts;
  }
  if (matchedProducts && matchedProducts.length > 0) {
    return matchedProducts;
  }
  const topGlobal = allProducts ? allProducts.slice(0, 5) : [];
  if (topGlobal.length > 0) {
    return topGlobal;
  }
  return allProducts || [];
}
