/**
 * core/upsellEngine.ts — Revenue-optimized upsell selection logic.
 * 
 * Implements the contract defined in Phase 1.10 of the ROADMAP.
 * Goal: Increment ticket value by suggesting the most relevant complementary product.
 */

import { CartItem } from './types';
import { checkStock } from './inventoryMiddleware';
import { getCurrentLevel } from './salesThermostat';
import { supabase } from '@/lib/supabase';

/**
 * Customer Profile structure as per Roadmap 3.1
 */
export interface CustomerProfile {
  phone: string;
  name?: string;
  totalOrders: number;
  totalSpent: number;
  favoriteItems: Array<{ itemId: string; orderCount: number }>;
  preferredUpsellType: 'value' | 'premium' | 'bundle' | null;
}

/**
 * Upsell Option return structure
 */
export interface UpsellOption {
  productId: string;
  name: string;
  price: number;
  reason: string;
  message: string;
  type: 'value' | 'premium' | 'bundle';
}

/**
 * Evaluates the current cart and customer history to suggest the single BEST upsell.
 * 
 * @param currentCart - Current items in user's cart
 * @param customerProfile - (Optional) Historical data for personalization
 * @returns Promise with the best UpsellOption or null if no valid suggestion
 */
export async function getBestUpsell(
  currentCart: CartItem[],
  customerProfile?: CustomerProfile
): Promise<UpsellOption | null> {
  if (getCurrentLevel() === 'ECO') return null;
  if (!currentCart || currentCart.length === 0) return null;

  // 1. Identify missing categories
  const hasCombos = currentCart.some(i => i.category === 'combos');
  const hasProteins = currentCart.some(i => i.category === 'proteina');
  const hasSides = currentCart.some(i => i.category === 'papas');
  const hasDrinks = currentCart.some(i => i.category === 'bebidas' || i.name.toLowerCase().includes('refresco'));

  let targetCategory: string | null = null;
  let type: 'value' | 'premium' | 'bundle' = 'value';
  let message = '';
  let reason = '';

  // 2. Decision Matrix
  if (hasProteins && !hasCombos && !hasSides) {
    // If they have alitas/boneless but no combo/papas, push a Combo upgrade or Papas
    targetCategory = 'combos';
    type = 'premium';
    reason = 'upgrade_to_combo';
    message = '¿Lo hacemos combo? 🔥 Incluye papas y aderezo por un precio especial.';
  } else if (!hasSides) {
    targetCategory = 'papas';
    type = 'value';
    reason = 'missing_sides';
    message = '¿Unas papas para acompañar? 🍟 Son el complemento perfecto.';
  } else if (!hasDrinks) {
    targetCategory = 'bebidas';
    type = 'value';
    reason = 'missing_drinks';
    message = '¿Algo para la sed? 🥤 Un refresco frío no puede faltar.';
  } else if (hasCombos && !currentCart.some(i => i.category === 'extras')) {
    targetCategory = 'extras';
    type = 'bundle';
    reason = 'add_extras';
    message = '¿Un aderezo extra o postre para cerrar con broche de oro? 🍰';
  }

  if (!targetCategory) return null;

  // 3. Fetch candidate from database (Bestseller in category)
  const { data: candidates, error } = await supabase
    .from('products')
    .select('id, name, price, available')
    .eq('category', targetCategory)
    .eq('available', true)
    .order('price', { ascending: false })
    .limit(1);

  if (error || !candidates || candidates.length === 0) return null;

  const bestProduct = candidates[0];

  // 4. Final inventory check (Double safety)
  const stock = await checkStock([bestProduct.id]);
  if (stock.length === 0 || !stock[0].available) return null;

  return {
    productId: bestProduct.id,
    name: bestProduct.name,
    price: bestProduct.price,
    reason,
    message,
    type
  };
}
