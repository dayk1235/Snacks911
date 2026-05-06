/**
 * core/offerAgent.ts — Unified Product Recommendation & Upsell Agent.
 * 
 * Part of Phase 1.10: Sales System Engine.
 * Manages the entire "Offer" lifecycle: from initial entry recommendation
 * to ticket expansion (upsells).
 */

import { Intent, CartItem, CustomerProfile } from './types';
import { Product } from '@/data/products';
import { dbGetProducts } from '@/lib/db';
import { checkStock } from './inventoryMiddleware';
import { getCurrentLevel } from './salesThermostat';
import { supabase } from '@/lib/supabase';
import { isProductSafe, filterProducts } from '@/core/allergyFilter';

/**
 * Structure for upsell results
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
 * 1. Entry Recommendation Logic
 * Returns the best product to start the conversation.
 * Accepts safeProducts directly (already filtered by allergies).
 */
export async function getEntryRecommendation(
  intent: Intent,
  profile: CustomerProfile | undefined,
  safeProducts: Product[]
): Promise<Product | null> {
  if (!safeProducts || safeProducts.length === 0) return null;

  // 1. Personalized Recommendation (Priority)
  if (profile?.favoriteProduct) {
    const fav = safeProducts.find(p => p.name.toLowerCase() === profile.favoriteProduct?.toLowerCase());
    if (fav) return fav;
  }

  if (profile && profile.totalOrders > 0) {
    return safeProducts[0] || null;
  }

  // 2. Intent-based Logic
  switch (intent) {
    case 'hambre':
    case 'hungry_strong':
      // Largest/Most expensive Combo
      return [...safeProducts]
        .filter(p => p.category === 'combos')
        .sort((a, b) => (b.price || 0) - (a.price || 0))[0] || safeProducts[0];

    case 'hungry_light':
      // Best-selling individual item
      return safeProducts.find(p => p.category !== 'combos') || safeProducts[0];

    case 'undecided':
    case 'duda':
    case 'precio':
    case 'other':
    default:
      // Absolute bestseller
      return safeProducts[0] || null;
  }
}

/**
 * 2. Upsell Selection Logic
 * Evaluates current cart and profile to maximize AOV.
 * Uses safeProducts to ensure no allergens are recommended.
 */
export async function getBestUpsell(
  currentCart: CartItem[],
  customerProfile: CustomerProfile | undefined,
  safeProducts: Product[]
): Promise<UpsellOption | null> {
  if (getCurrentLevel() === 'ECO') return null;
  if (!currentCart || currentCart.length === 0) return null;
  if (!safeProducts || safeProducts.length === 0) return null;

  // Use safeProducts directly - already filtered by allergies
  // 1. Identify missing categories (from safeProducts)
  const cartProductIds = currentCart.map(i => i.id);
  const cartProducts = safeProducts.filter(p => cartProductIds.includes(p.id));
  const cartCategories = new Set(cartProducts.map(p => p.category));

  const hasCombos = cartCategories.has('combos');
  const hasProteins = cartCategories.has('proteina');
  const hasSides = cartCategories.has('papas');
  const hasDrinks = cartCategories.has('bebidas') || currentCart.some(i => i.name.toLowerCase().includes('refresco'));

  let targetCategory: string | null = null;
  let type: 'value' | 'premium' | 'bundle' = 'value';
  let message = '';
  let reason = '';

  // 2. Decision Matrix (AOV Optimization) - Select from safeProducts only
  const safeCombos = safeProducts.filter(p => p.category === 'combos').sort((a, b) => b.price - a.price);
  const safeProteins = safeProducts.filter(p => p.category === 'proteina').sort((a, b) => b.price - a.price);
  const safeSides = safeProducts.filter(p => p.category === 'papas').sort((a, b) => b.price - a.price);
  const safeDrinks = safeProducts.filter(p => p.category === 'bebidas').sort((a, b) => b.price - a.price);
  const safeExtras = safeProducts.filter(p => p.category === 'extras').sort((a, b) => b.price - a.price);

  // Priority Override based on preferences
  if (!hasDrinks && customerProfile?.preferences?.includes('bebidas') && safeDrinks.length > 0) {
    targetCategory = 'bebidas';
    type = 'value';
    reason = 'preferred_drinks';
    message = '¡Sabemos que te gustan las bebidas! 🥤 ¿Agregamos un refresco frío?';
  } else if (hasProteins && !hasCombos && !hasSides && safeCombos.length > 0) {
    targetCategory = 'combos';
    type = 'premium';
    reason = 'upgrade_to_combo';
    message = '¿Lo hacemos combo? 🔥 Incluye papas y aderezo por un precio especial.';
  } else if (!hasSides && safeSides.length > 0) {
    targetCategory = 'papas';
    type = 'value';
    reason = 'missing_sides';
    message = '¿Unas papas para acompañar? 🍟 Son el complemento perfecto.';
  } else if (!hasDrinks && !(customerProfile?.restrictions?.includes('sin refresco')) && safeDrinks.length > 0) {
    targetCategory = 'bebidas';
    type = 'value';
    reason = 'missing_drinks';
    message = '¿Algo para la sed? 🥤 Un refresco frío no puede faltar.';
  } else if (hasCombos && safeExtras.length > 0) {
    targetCategory = 'extras';
    type = 'bundle';
    reason = 'add_extras';
    message = '¿Un aderezo extra o postre para cerrar con broche de oro? 🍰';
  }

  // 3. Preferred Upsell Type Override
  if (customerProfile?.preferredUpsellType && targetCategory) {
    const prefType = customerProfile.preferredUpsellType;

    if (prefType === 'premium' && hasProteins && !hasCombos && safeCombos.length > 0) {
      targetCategory = 'combos';
      type = 'premium';
      reason = 'preferred_premium';
      message = '¡Sube de nivel! 🔥 Hazlo combo para la experiencia completa.';
    } else if (prefType === 'bundle' && hasCombos && safeExtras.length > 0) {
      targetCategory = 'extras';
      type = 'bundle';
      reason = 'preferred_bundle';
      message = '¡Completa tu festín! 🍰 Agrega un postre o aderezo extra.';
    }
  }

  if (!targetCategory) return null;

  // 4. Get best product from safeProducts (already filtered!)
  const targetSafeProducts = safeProducts.filter(p => p.category === targetCategory);
  if (targetSafeProducts.length === 0) return null;
  
  // Pick the most expensive one (bestseller logic)
  const bestProduct = targetSafeProducts.sort((a, b) => b.price - a.price)[0];

  // 5. Final inventory check
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

export async function getTopCombos(safeProducts: Product[] = []): Promise<Product[]> {
  const filtered = safeProducts.filter(p => p.category === 'combos');
  return filtered.slice(0, 3);
}

export async function getBestSellers(safeProducts: Product[] = []): Promise<Product[]> {
  return safeProducts.slice(0, 3);
}

export async function getCrossSell(safeProducts: Product[] = []): Promise<Product | null> {
  const found = safeProducts.find(p => p.category === 'extras');
  return found || null;
}
