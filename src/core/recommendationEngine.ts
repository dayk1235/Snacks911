/**
 * core/recommendationEngine.ts — Minimal recommendation logic for Snacks 911.
 * 
 * Part of Phase 1.10: Sales System Engine.
 * Provides deterministic product suggestions based on user intent and profile.
 */

import { IntentType } from './intentDetector';
import { CustomerProfile } from './customerProfileStore';
import { Product, products } from '@/data/products';

/**
 * Returns the single best product recommendation for the given context.
 * 
 * Rules:
 * - Recurring customer -> return a popular combo (placeholder for last order)
 * - Hungry strong -> largest/most expensive combo
 * - Hungry light -> popular individual item
 * - Undecided/Other -> overall bestseller
 * 
 * @param intent - Detected user intent
 * @param profile - (Optional) Customer historical data
 * @returns Promise with the recommended Product or null
 */
export async function getRecommendation(
  intent: IntentType, 
  profile?: CustomerProfile
): Promise<Product | null> {
  
  // 1. Recurring Customer Rule (Priority)
  if (profile && profile.totalOrders > 0) {
    // Recommendation based on "memory" (Placeholder for specific last item)
    return products.find(p => p.id === 1) || products[0]; // Combo Mixto 911
  }

  // 2. Intent-based Logic
  switch (intent) {
    case 'hungry_strong':
      // Largest Combo
      return [...products]
        .filter(p => p.category === 'combos')
        .sort((a, b) => b.price - a.price)[0] || products[0];

    case 'hungry_light':
      // Best-selling individual item
      return products.find(p => p.popular && p.category !== 'combos') || products[9]; // Papas Loaded

    case 'undecided':
    case 'pricing':
    case 'other':
    default:
      // Absolute bestseller
      return products.find(p => p.popular) || products[0];
  }
}

// ─── Legacy/Placeholder Exports to maintain build stability ─────────────────

export async function getTopCombos() {
  return products.filter(p => p.category === 'combos').slice(0, 3);
}

export async function getBestsellers() {
  return products.filter(p => p.popular).slice(0, 3);
}

export async function getFavorites() {
  return products.filter(p => p.popular).slice(0, 3);
}

export async function getCrossSell() {
  return products.find(p => p.category === 'extras') || null;
}

export function suggestUpgrade(product: Product) {
  return products.find(p => p.category === 'combos' && p.price > product.price) || null;
}

export function suggestExtras() {
  return products.filter(p => p.category === 'extras').slice(0, 2);
}

export function getPriceAnchor() {
  return products.filter(p => p.category === 'combos').sort((a, b) => b.price - a.price)[0];
}

export function getMicroReward() {
  return "¡Casi llegas al envío gratis! Agrega unas papas.";
}

export function generateOrderSummary() {
  return "Resumen de tu pedido...";
}

export function buildOrderWhatsAppUrl() {
  return "https://wa.me/525584507458";
}
