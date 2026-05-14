/**
 * core/offerAgent.ts — Unified Product Recommendation & Upsell Agent.
 * 
 * Part of Phase 1.10: Sales System Engine.
 * Manages the entire "Offer" lifecycle: from initial entry recommendation
 * to ticket expansion (upsells).
 */

import { Intent, CartItem, CustomerProfile } from './types';
import { Product } from '@/data/products';
import { checkStock } from './inventoryMiddleware';
import { getCurrentLevel } from './salesThermostat';
// import { dbGetProducts } from '@/lib/db.server';
// import { supabase } from '@/lib/db.server';
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

  const cartProductIds = currentCart.map(i => String(i.productId || i.id));
  const cartNames = currentCart.map(i => i.name.toLowerCase());
  const cartCategories = new Set(currentCart.map(i => i.category));

  // Determine what we already have
  const hasAlitas = cartNames.some(n => n.includes('alitas'));
  const hasBoneless = cartNames.some(n => n.includes('boneless'));
  const hasCombo = cartCategories.has('combos');
  
  const hasPapas = cartCategories.has('papas') || cartNames.some(n => n.includes('papas'));
  const hasDrinks = cartCategories.has('bebidas') || cartNames.some(n => n.includes('refresco') || n.includes('bebida'));
  const hasDips = cartCategories.has('extras') || cartNames.some(n => n.includes('dip') || n.includes('salsa') || n.includes('aderezo'));
  const hasDessert = cartCategories.has('postres') || cartNames.some(n => n.includes('brownie') || n.includes('postre'));

  let targetCategory: string | null = null;
  let message = '';
  let reason = '';

  // 1. Context-Aware Rules
  if (hasAlitas) {
    if (!hasPapas) {
      targetCategory = 'papas';
      message = '¿Unas papas crujientes para tus alitas? 🍟';
      reason = 'complement_alitas_sides';
    } else if (!hasDrinks) {
      targetCategory = 'bebidas';
      message = '¡No te quedes con la sed! 🥤 ¿Un refresco frío?';
      reason = 'complement_alitas_drinks';
    }
  } else if (hasBoneless) {
    if (!hasDips) {
      targetCategory = 'extras';
      message = '¿Un dip extra para tus boneless? 🧀';
      reason = 'complement_boneless_dips';
    } else if (!hasPapas) {
      targetCategory = 'papas';
      message = '¿Qué tal unas papas para completar tus boneless? 🍟';
      reason = 'complement_boneless_sides';
    }
  } else if (hasCombo) {
    if (!hasDips) {
      targetCategory = 'extras';
      message = '¿Quieres un aderezo extra para tu combo? 🔥';
      reason = 'complement_combo_extras';
    } else if (!hasDessert) {
      targetCategory = 'postres';
      message = '¿Cerramos con un brownie de postre? 🍰';
      reason = 'complement_combo_dessert';
    }
  }

  // 2. Generic fallback if no specific rule matched
  if (!targetCategory) {
    if (!hasDrinks) {
      targetCategory = 'bebidas';
      message = '¿Algo para tomar? 🥤';
      reason = 'generic_drinks';
    } else if (!hasDessert) {
      targetCategory = 'postres';
      message = '¿Un postre para endulzar el día? 🍰';
      reason = 'generic_dessert';
    }
  }

  if (!targetCategory) return null;

  // 3. Find the best product in target category that IS NOT in cart
  const candidates = safeProducts.filter(p => 
    p.category === targetCategory && 
    !cartProductIds.includes(String(p.id)) &&
    p.available
  );

  if (candidates.length === 0) return null;

  // Pick the most popular/expensive one
  const bestProduct = candidates.sort((a, b) => b.price - a.price)[0];

  return {
    productId: bestProduct.id,
    name: bestProduct.name,
    price: bestProduct.price,
    reason,
    message,
    type: 'value'
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
