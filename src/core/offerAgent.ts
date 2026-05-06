/**
 * core/offerAgent.ts — Unified Product Recommendation & Upsell Agent.
 * 
 * Part of Phase 1.10: Sales System Engine.
 * Manages the entire "Offer" lifecycle: from initial entry recommendation
 * to ticket expansion (upsells).
 */

import { Intent, CartItem, CustomerProfile } from './types';
import { Product, products as allProducts } from '@/data/products';
import { checkStock } from './inventoryMiddleware';
import { getCurrentLevel } from './salesThermostat';
import { supabase } from '@/lib/supabase';
import { isProductSafe } from '@/core/allergyFilter';

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
 */
export async function getEntryRecommendation(
  intent: Intent,
  profile?: CustomerProfile
): Promise<Product | null> {
  // Filter products by restrictions
  const safeProducts = profile?.restrictions?.length
    ? allProducts.filter(p => isProductSafe(p, profile.restrictions))
    : allProducts;

  // 1. Personalized Recommendation (Priority)
  if (profile?.favoriteProduct) {
    const fav = safeProducts.find(p => p.name.toLowerCase() === profile.favoriteProduct?.toLowerCase());
    if (fav) return fav;
  }

  if (profile && profile.totalOrders > 0) {
    return safeProducts.find(p => p.id === 1) || safeProducts[0]; // Combo Mixto 911
  }

  // 2. Intent-based Logic
  switch (intent) {
    case 'hambre':
    case 'hungry_strong':
      // Largest/Most expensive Combo
      return [...safeProducts]
        .filter(p => p.category === 'combos')
        .sort((a, b) => b.price - a.price)[0] || safeProducts[0];

    case 'hungry_light':
      // Best-selling individual item
      return safeProducts.find(p => p.popular && p.category !== 'combos') || safeProducts[9]; // Papas Loaded

    case 'undecided':
    case 'duda':
    case 'precio':
    case 'other':
    default:
      // Absolute bestseller
      return safeProducts.find(p => p.popular) || safeProducts[0];
  }
}

/**
 * 2. Upsell Selection Logic
 * Evaluates current cart and profile to maximize AOV.
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

  // 2. Decision Matrix (AOV Optimization)

  // Priority Override based on preferences
  if (!hasDrinks && customerProfile?.preferences?.includes('bebidas')) {
    targetCategory = 'bebidas';
    type = 'value';
    reason = 'preferred_drinks';
    message = '¡Sabemos que te gustan las bebidas! 🥤 ¿Agregamos un refresco frío?';
  } else if (hasProteins && !hasCombos && !hasSides) {
    targetCategory = 'combos';
    type = 'premium';
    reason = 'upgrade_to_combo';
    message = '¿Lo hacemos combo? 🔥 Incluye papas y aderezo por un precio especial.';
  } else if (!hasSides) {
    targetCategory = 'papas';
    type = 'value';
    reason = 'missing_sides';
    message = '¿Unas papas para acompañar? 🍟 Son el complemento perfecto.';
  } else if (!hasDrinks && !(customerProfile?.restrictions?.includes('sin refresco'))) {
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

  // 3. Preferred Upsell Type Override
  if (customerProfile?.preferredUpsellType && targetCategory) {
    const prefType = customerProfile.preferredUpsellType;

    // If they prefer 'premium' and we have proteins but no combo, override to premium
    if (prefType === 'premium' && hasProteins && !hasCombos) {
      targetCategory = 'combos';
      type = 'premium';
      reason = 'preferred_premium';
      message = '¡Sube de nivel! 🔥 Hazlo combo para la experiencia completa.';
    }
    // If they prefer 'bundle' and we have combos, override to extras
    else if (prefType === 'bundle' && hasCombos && !currentCart.some(i => i.category === 'extras')) {
      targetCategory = 'extras';
      type = 'bundle';
      reason = 'preferred_bundle';
      message = '¡Completa tu festín! 🍰 Agrega un postre o aderezo extra.';
    }
  }

  if (!targetCategory) return null;

  // 3. Fetch candidate from database (Bestseller in category)
  const { data: candidates, error } = await supabase
    .from('products')
    .select('id, name, price, is_available')
    .eq('category', targetCategory)
    .eq('is_available', true)
    .order('price', { ascending: false })
    .limit(1);

  if (error || !candidates || candidates.length === 0) return null;

  // Filter by restrictions if they exist
  if (customerProfile?.restrictions?.length) {
    const candidateProduct = allProducts.find(p => p.name === candidates[0].name);
    if (candidateProduct && !isProductSafe(candidateProduct, customerProfile.restrictions)) {
      return null; // Skip unsafe upsell
    }
  }

  const bestProduct = candidates[0];

  // 4. Final inventory check
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

// ─── Legacy Support Helpers (to be refactored out eventually) ───────────────

export async function getTopCombos() {
  return allProducts.filter(p => p.category === 'combos').slice(0, 3);
}

export async function getBestsellers() {
  return allProducts.filter(p => p.popular).slice(0, 3);
}

export async function getCrossSell() {
  return allProducts.find(p => p.category === 'extras') || null;
}
