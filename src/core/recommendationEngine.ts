/**
 * core/recommendationEngine.ts — Product recommendation logic (pure TypeScript).
 *
 * No React, no DOM, no side effects.
 * Input → Output only.
 *
 * Handles:
 *   - Top combos selection
 *   - Bestsellers ranking
 *   - Cross-sell detection
 *   - Upgrade suggestions
 *   - Price anchoring
 */

import type { CoreProduct, OrderItem, UserPrefs } from './types';

/**
 * Get top combo products (prioritized by badges and availability).
 */
export function getTopCombos(
  products: CoreProduct[],
  limit = 3,
): CoreProduct[] {
  return products
    .filter(p => p.category === 'combos' && p.available !== false)
    .sort((a, b) => {
      const aFeatured = a.badges?.some(b => b.includes('Más pedido')) ? 1 : 0;
      const bFeatured = b.badges?.some(b => b.includes('Más pedido')) ? 1 : 0;
      return bFeatured - aFeatured || b.price - a.price;
    })
    .slice(0, limit);
}

/**
 * Get bestsellers (combos first, then highest-priced available items).
 */
export function getBestsellers(
  products: CoreProduct[],
  limit = 4,
): CoreProduct[] {
  return products
    .filter(p => p.available !== false)
    .sort((a, b) => {
      const aCombo = a.category === 'combos' ? 1 : 0;
      const bCombo = b.category === 'combos' ? 1 : 0;
      return bCombo - aCombo || b.price - a.price;
    })
    .slice(0, limit);
}

/**
 * Get user's favorite products based on past order frequency.
 */
export function getFavorites(
  products: CoreProduct[],
  prefs: UserPrefs,
  limit = 3,
): CoreProduct[] {
  const favIds = Object.entries(prefs.favorites)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  return products.filter(p => favIds.includes(p.id));
}

/**
 * Detect cross-sell opportunities based on cart contents.
 * Returns a product suggestion + message if a gap is detected.
 */
export function getCrossSell(
  cart: OrderItem[],
  allProducts: CoreProduct[],
): { product: CoreProduct; message: string } | null {
  const hasMain = cart.some(i =>
    i.product.category === 'alitas' ||
    i.product.category === 'boneless' ||
    i.product.category === 'combos'
  );
  const hasSide = cart.some(i => i.product.category === 'papas');
  const hasDrink = cart.some(i =>
    i.product.name.toLowerCase().includes('refresco') ||
    i.product.name.toLowerCase().includes('bebida')
  );

  if (hasMain && !hasSide) {
    const papas = allProducts.find(p => p.category === 'papas' && p.available !== false);
    if (papas) {
      return {
        product: papas,
        message: `Te faltan las papas! ${papas.name} por $${papas.price} complementa perfecto.`,
      };
    }
  }

  if (hasMain && !hasDrink) {
    const drink = allProducts.find(p =>
      p.category === 'extras' &&
      p.available !== false &&
      (p.name.toLowerCase().includes('refresco') || p.name.toLowerCase().includes('bebida'))
    );
    if (drink) {
      return {
        product: drink,
        message: `Con sed? ${drink.name} por $${drink.price} para acompanar.`,
      };
    }
  }

  return null;
}

/**
 * Suggest upgrade from individual item to combo.
 */
export function suggestUpgrade(
  product: CoreProduct,
  allProducts: CoreProduct[],
): CoreProduct | null {
  if (product.category === 'alitas' || product.category === 'boneless') {
    const combos = getTopCombos(allProducts, 1);
    return combos[0] || null;
  }
  return null;
}

/**
 * Suggest complementary extras for a main product.
 */
export function suggestExtras(
  mainProduct: CoreProduct,
  allProducts: CoreProduct[],
  limit = 2,
): CoreProduct[] {
  return allProducts
    .filter(p => p.category === 'extras' && p.available !== false)
    .slice(0, limit);
}

/**
 * Calculate price anchoring (individual vs combo value).
 * Returns display string showing savings.
 */
export function getPriceAnchor(
  combo: CoreProduct,
  individualSurcharge = 35,
): string {
  const individualTotal = combo.price + individualSurcharge;
  return `Antes: $${individualTotal} · Ahora: $${combo.price} (ahorras $${individualTotal - combo.price})`;
}

/**
 * Get micro-reward phrase (randomized positive feedback).
 */
export function getMicroReward(): string {
  const phrases = [
    'Buena eleccion! ',
    'Excelente! ',
    'Sabrosa eleccion! ',
    'Gran gusto! ',
    'Anotado! ',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Generate order summary text for WhatsApp.
 */
export function generateOrderSummary(
  cart: OrderItem[],
): { text: string; total: number } {
  const total = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const lines = cart.map(i =>
    `• ${i.qty}x ${i.product.name} — $${i.product.price * i.qty}`
  );

  return {
    text: `Tu pedido:\n\n${lines.join('\n')}\n\nTotal: $${total}`,
    total,
  };
}

/**
 * Build WhatsApp message URL from order.
 */
export function buildOrderWhatsAppUrl(
  summary: { text: string; total: number },
  phoneNumber: string,
): string {
  const message = `🚨 *PEDIDO SNACKS 911*\n\n${summary.text.replace(/\n/g, '\n')}\n\n¡Quiero hacer este pedido!`;
  const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
}
