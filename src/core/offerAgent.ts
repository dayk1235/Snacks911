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
  // 1. Recurring Customer Rule (Priority)
  if (profile && profile.totalOrders > 0) {
    // Recommendation based on "memory" (Placeholder for specific last item)
    return allProducts.find(p => p.id === 1) || allProducts[0]; // Combo Mixto 911
  }

  // 2. Intent-based Logic
  switch (intent) {
    case 'hambre':
    case 'hungry_strong':
      // Largest/Most expensive Combo
      return [...allProducts]
        .filter(p => p.category === 'combos')
        .sort((a, b) => b.price - a.price)[0] || allProducts[0];

    case 'hungry_light':
      // Best-selling individual item
      return allProducts.find(p => p.popular && p.category !== 'combos') || allProducts[9]; // Papas Loaded

    case 'undecided':
    case 'duda':
    case 'precio':
    case 'other':
    default:
      // Absolute bestseller
      return allProducts.find(p => p.popular) || allProducts[0];
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
  if (hasProteins && !hasCombos && !hasSides) {
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
    .select('id, name, price, is_available')
    .eq('category', targetCategory)
    .eq('is_available', true)
    .order('price', { ascending: false })
    .limit(1);

  if (error || !candidates || candidates.length === 0) return null;

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
