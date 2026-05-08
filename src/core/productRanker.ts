import { normalizeText } from '@/lib/utils/core';

export interface RankEntities {
  product?: string[];
  category?: string[];
}

/**
 * Ordena y filtra los mejores productos basándose en la intención del usuario.
 */
export function rankProducts(
  products: any[],
  entities: RankEntities,
  intent: string
): any[] {
  const scoredProducts = products.map((product) => {
    let score = 0;

    const productName = normalizeText(product.name || '');
    const productCategory = normalizeText(product.category || '');

    let matchFound = false;

    // +3 si nombre coincide exactamente con entities.product
    // +2 si nombre incluye keyword (substring)
    if (entities.product && entities.product.length > 0) {
      for (const p of entities.product) {
        const entityProduct = normalizeText(p);

        if (productName === entityProduct) {
          score += 3;
          matchFound = true;
        } else if (
          productName.includes(entityProduct) ||
          entityProduct.includes(productName)
        ) {
          score += 2;
          matchFound = true;
        }
      }
    }

    // +2 si coincide categoría
    if (entities.category && entities.category.length > 0) {
      for (const c of entities.category) {
        const entityCategory = normalizeText(c);
        if (
          productCategory === entityCategory ||
          productCategory.includes(entityCategory)
        ) {
          score += 2;
          matchFound = true;
        }
      }
    }

    // -2 si no coincide con intención
    // (Si había entidades buscadas específicamente y este producto no hizo match con nada)
    const hasSpecificIntent =
      (entities.product?.length || 0) > 0 ||
      (entities.category?.length || 0) > 0;

    if (hasSpecificIntent && !matchFound) {
      score -= 2;
    }

    return { product, score };
  });

  // Ordenar por score DESC
  scoredProducts.sort((a, b) => b.score - a.score);

  // Retornar top 5 productos
  return scoredProducts.slice(0, 5).map((item) => item.product);
}
