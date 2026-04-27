/**
 * salesPlaybooks.ts
 * Deterministic upsell scripts per product.
 * Zero AI cost — pure code logic that drives ticket average up.
 */

export interface UpsellOffer {
  type: 'COMBO_UPGRADE' | 'ADDON';
  message: string;
  upgrade_to?: string;     // canonical product name to replace with
  addon_name?: string;     // addon to add
  addon_price?: number;
  intent_key: string;      // unique key to track if user accepted
}

// ── Sales Playbooks per product ─────────────────────────────────────────────
// key = canonical product name
export const SALES_PLAYBOOKS: Record<string, UpsellOffer[]> = {
  'Boneless 250g': [
    {
      type: 'COMBO_UPGRADE',
      message: '💡 Por solo $155 te lo convierto en Boneless Power 911 con bebida + salsa. ¿Te lo cambio?',
      upgrade_to: 'Boneless Power 911',
      intent_key: 'upsell_boneless_to_power',
    },
    {
      type: 'ADDON',
      message: '🧀 ¿Le agregamos Dip Cheddar por $15?',
      addon_name: 'Dip Queso Cheddar',
      addon_price: 15,
      intent_key: 'addon_dip_cheddar',
    },
  ],

  'Alitas 6pz': [
    {
      type: 'COMBO_UPGRADE',
      message: '🔥 Por $145 está Alitas Fuego 911: 12pz + papas + bebida + salsa. ¿Te conviene ese?',
      upgrade_to: 'Alitas Fuego 911',
      intent_key: 'upsell_alitas6_to_fuego',
    },
    {
      type: 'ADDON',
      message: '🌶️ ¿Quieres salsa extra por $12?',
      addon_name: 'Salsa extra',
      addon_price: 12,
      intent_key: 'addon_salsa_extra',
    },
  ],

  'Papas clásicas': [
    {
      type: 'ADDON',
      message: '🥤 ¿Quieres agregar bebida por $30?',
      addon_name: 'Refresco 400ml',
      addon_price: 30,
      intent_key: 'addon_bebida_papas',
    },
    {
      type: 'ADDON',
      message: '🧀 ¿Le ponemos Dip Cheddar por $15?',
      addon_name: 'Dip Queso Cheddar',
      addon_price: 15,
      intent_key: 'addon_dip_papas',
    },
  ],

  'Papas con queso': [
    {
      type: 'ADDON',
      message: '🥤 ¿Quieres agregar bebida por $30?',
      addon_name: 'Refresco 400ml',
      addon_price: 30,
      intent_key: 'addon_bebida_papas_queso',
    },
  ],

  'Salchipapas': [
    {
      type: 'ADDON',
      message: '🥤 ¿Le agregamos bebida por $30?',
      addon_name: 'Refresco 400ml',
      addon_price: 30,
      intent_key: 'addon_bebida_salchi',
    },
    {
      type: 'ADDON',
      message: '🧀 ¿Con Dip Parmesano por $15?',
      addon_name: 'Dip Parmesano',
      addon_price: 15,
      intent_key: 'addon_dip_salchi',
    },
  ],

  'Banderilla coreana': [
    {
      type: 'COMBO_UPGRADE',
      message: '⭐ Por $149 está el Combo Banderilla Suprema: 2 banderillas + papas con queso + bebida. ¿Lo quieres así?',
      upgrade_to: 'Combo Banderilla Suprema',
      intent_key: 'upsell_banderilla_to_suprema',
    },
  ],

  'Dedos de queso (6)': [
    {
      type: 'COMBO_UPGRADE',
      message: '🧀 Por $139 está el Combo Dedos + Papas + Bebida. ¿Te lo convierto en combo?',
      upgrade_to: 'Combo Dedos de Queso + Papas',
      intent_key: 'upsell_dedos_to_combo',
    },
  ],
};

// ── Recommendation logic (budget / hunger / spice) ───────────────────────────
export interface RecommendParams {
  budget?: number;   // in MXN
  hunger?: 'low' | 'normal' | 'high';
  spice?: 'low' | 'medium' | 'high';
  objection?: 'price';
}

export interface Recommendation {
  product: string;
  price: number;
  reason: string;
}

export function getRecommendation(params: RecommendParams): Recommendation[] {
  const { budget = 999, hunger = 'normal', spice } = params;

  const results: Recommendation[] = [];

  if (budget <= 150) {
    results.push({ product: 'Boneless 250g', price: 139, reason: 'Excelente relación precio/porción para tu presupuesto.' });
    results.push({ product: 'Papas 911 Loaded', price: 149, reason: 'Papas grandes con queso, tocino y jalapeños + bebida.' });
  } else if (budget <= 200) {
    results.push({ product: 'Boneless Power 911', price: 155, reason: 'El más pedido ⭐ — boneless 250g + bebida + salsa.' });
    results.push({ product: 'Combo Banderilla Suprema', price: 149, reason: 'Variedad: 2 banderillas + papas con queso + bebida.' });
  } else {
    results.push({ product: 'Combo Mixto 911', price: 249, reason: 'Combo premium: boneless 150g + alitas 6pz + papas + bebida. El que más saca a todos.' });
    results.push({ product: 'Alitas Fuego 911', price: 145, reason: '12 alitas + papas + bebida — para cuando el hambre es real 🔥' });
  }

  // If they want no spice — filter out or add note
  if (spice === 'low') {
    return results.map(r => ({ ...r, reason: r.reason + ' (puedes pedir sin salsa)' }));
  }

  return results.slice(0, 2); // return top 2
}

// ── Objection handlers ──────────────────────────────────────────────────────
export const OBJECTION_RESPONSES: Record<string, string> = {
  price: '👀 Tip: nuestro Boneless Power 911 a $155 incluye bebida + salsa — sale más que pedir todo por separado. ¿Te mando los detalles?',
  portion: 'El Boneless 250g son porciones generosas, no te quedas con hambre 💪 ¿Quieres saber qué incluye?',
};
