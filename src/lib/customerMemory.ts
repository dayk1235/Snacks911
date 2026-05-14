/**
 * customerMemory.ts — Manage persistent customer profile in local storage.
 * Used to personalize the chat experience for returning users.
 */

export interface CustomerData {
  name?: string;
  address?: string;
  preferences?: string[];
  lastSeen?: string;
  totalOrders?: number;
  suggestionScores?: Record<string, number>;
  lastPurchasedIds?: string[];
}

const STORAGE_KEY = 'snacks911_customer_profile';

export const saveCustomerData = (data: Partial<CustomerData>) => {
  if (typeof window === 'undefined') return;
  
  const existing = getCustomerData();
  const updated = {
    ...existing,
    ...data,
    lastSeen: new Date().toISOString(),
    // Merge preferences if provided
    preferences: data.preferences 
      ? Array.from(new Set([...(existing.preferences || []), ...data.preferences]))
      : existing.preferences
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getCustomerData = (): CustomerData => {
  if (typeof window === 'undefined') return {};
  
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
};

/**
 * Record the current cart items as the 'last purchased' items.
 */
export const recordPurchase = (productIds: string[]) => {
  if (typeof window === 'undefined') return;
  
  const existing = getCustomerData();
  saveCustomerData({
    lastPurchasedIds: productIds,
    totalOrders: (existing.totalOrders || 0) + 1
  });
};

/**
 * Basic heuristic to detect user info from a message
 */
export const detectCustomerInfo = (text: string): Partial<CustomerData> => {
  const data: Partial<CustomerData> = {};
  const t = text.toLowerCase();

  // 1. Name detection
  const nameMatch = text.match(/(?:me llamo|soy|mi nombre es)\s+([a-záéíóúñ\s]+)/i);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim().split(/\s+/)[0]; // Just the first name
    if (name.length > 2) data.name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  // 2. Address detection
  const addrMatch = text.match(/(?:mi direccion es|vivo en|entrega en|manda a|enviame a|estoy en)\s+([^.?!]+)/i);
  if (addrMatch && addrMatch[1]) {
    data.address = addrMatch[1].trim();
  }

  // 3. Preferences (Keywords)
  const preferences: string[] = [];
  if (t.includes('siempre pido') || t.includes('me gusta') || t.includes('mi favorito')) {
    if (t.includes('boneless')) preferences.push('boneless');
    if (t.includes('alitas')) preferences.push('alitas');
    if (t.includes('papas')) preferences.push('papas');
    if (t.includes('salsa')) {
      const salsaMatch = t.match(/(?:salsa|bañadas en)\s+([a-z]+)/i);
      if (salsaMatch) preferences.push(`salsa_${salsaMatch[1]}`);
    }
  }
  
  if (preferences.length > 0) {
    data.preferences = preferences;
  }

  return data;
};
/**
 * Global trend weights to simulate popular items across all users.
 * Optimized based on performance analytics:
 * - High CTR: Combo 911 (+25), Boneless (+15), Papas Loaded (+20)
 * - Low CTR (Penalized): Refresco (-10), Ensalada (-15), Familiar (-10)
 */
const GLOBAL_TRENDS: Record<string, number> = {
  '1': 25, // Combo Mixto 911
  '2': 15, // Boneless Power 911
  '7': 20, // Papas 911 Loaded
  '15': -10, // Refresco (Low CTR)
  'familiar': -10, // Combo Familiar (Penalized)
  'ensalada': -15, // Ensalada de col (Penalized)
};

/**
 * Get merged scores from user behavior and global trends.
 */
export const getSuggestionScores = (): Record<string, number> => {
  const userScores = getCustomerData().suggestionScores || {};
  const merged: Record<string, number> = { ...GLOBAL_TRENDS };
  
  Object.keys(userScores).forEach(id => {
    merged[id] = (merged[id] || 0) + userScores[id];
  });
  
  return merged;
};

/**
 * Record an interaction with a product suggestion to adjust its ranking score.
 * Clicks increase score (+10), while impressions (ignoring) slightly decrease it (-1).
 */
export const recordSuggestionInteraction = (productId: string, type: 'click' | 'impression') => {
  if (typeof window === 'undefined') return;
  
  const existing = getCustomerData();
  const scores = existing.suggestionScores || {};
  
  const currentScore = scores[productId] || 0;
  const change = type === 'click' ? 10 : -1;
  
  // Update score with boundaries (e.g., min -50, max 200)
  const newScore = Math.min(Math.max(currentScore + change, -50), 200);
  
  saveCustomerData({
    suggestionScores: {
      ...scores,
      [productId]: newScore
    }
  });
};
