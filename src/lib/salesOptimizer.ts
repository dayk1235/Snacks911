/**
 * salesOptimizer.ts — Analyzes order history and produces actionable optimizations.
 *
 * Output:
 *  - bestSellers: products sorted by revenue & frequency
 *  - lowPerformers: products with zero or minimal sales
 *  - comboOpportunities: frequently co-ordered pairs
 *  - recommendedActions: ready-to-apply changes
 */

import type { Order, AdminProduct } from './adminTypes';

export interface ProductScore {
  productId: string;
  productName: string;
  revenue: number;
  frequency: number;
  avgQuantityPerOrder: number;
  score: number; // weighted composite
}

export interface ComboOpportunity {
  productA: string;
  productB: string;
  coOccurrenceCount: number;
  suggestedPrice: number;
  suggestedDiscount: number;
}

export interface OptimizationResult {
  bestSellers: ProductScore[];
  lowPerformers: ProductScore[];
  comboOpportunities: ComboOpportunity[];
  recommendedActions: string[];
}

/**
 * Analyze orders and produce optimization recommendations.
 */
export function analyzeSales(
  orders: Order[],
  products: AdminProduct[],
): OptimizationResult {
  const completedOrders = orders.filter(
    o => o.status === 'delivered' || o.status === 'ready' || o.status === 'preparing',
  );

  // ── Product scoring ───────────────────────────────────────────────────
  const productStats: Record<string, { revenue: number; frequency: number; totalQty: number }> = {};

  completedOrders.forEach(order => {
    const seenInOrder = new Set<string>();
    order.items.forEach(item => {
      const id = item.productId;
      if (!productStats[id]) {
        productStats[id] = { revenue: 0, frequency: 0, totalQty: 0 };
      }
      if (!seenInOrder.has(id)) {
        productStats[id].frequency += 1;
        seenInOrder.add(id);
      }
      productStats[id].revenue += item.price * item.quantity;
      productStats[id].totalQty += item.quantity;
    });
  });

  const allScores: ProductScore[] = Object.entries(productStats).map(
    ([productId, stats]) => {
      const product = products.find(p => p.id === productId);
      const name = product?.name ?? Object.keys(productStats).find(
        k => {
          const o = completedOrders.find(or => or.items.some(i => i.productId === k));
          return o?.items.find(i => i.productId === productId)?.productName ?? productId;
        }
      ) ?? productId;

      const avgQty = stats.frequency > 0 ? stats.totalQty / stats.frequency : 0;
      // Composite score: 60% revenue, 30% frequency, 10% avg quantity
      const maxRevenue = Math.max(...Object.values(productStats).map(s => s.revenue), 1);
      const maxFreq = Math.max(...Object.values(productStats).map(s => s.frequency), 1);
      const score = (
        (stats.revenue / maxRevenue) * 0.6 +
        (stats.frequency / maxFreq) * 0.3 +
        (avgQty / 5) * 0.1 // normalize to max ~5 qty
      ) * 100;

      return {
        productId,
        productName: name,
        revenue: stats.revenue,
        frequency: stats.frequency,
        avgQuantityPerOrder: Math.round(avgQty * 10) / 10,
        score: Math.round(score * 10) / 10,
      };
    },
  );

  const sorted = allScores.sort((a, b) => b.score - a.score);

  // Best sellers: top 40%
  const bestCount = Math.max(3, Math.ceil(sorted.length * 0.4));
  const bestSellers = sorted.slice(0, bestCount);

  // Low performers: bottom 30% or zero sales
  const lowCount = Math.max(2, Math.floor(sorted.length * 0.3));
  const lowPerformers = sorted.slice(-lowCount).filter(s => s.frequency < 3);

  // ── Combo opportunities ───────────────────────────────────────────────
  const pairCounts: Record<string, { count: number; priceA: number; priceB: number }> = {};

  completedOrders.forEach(order => {
    const uniqueItems = Array.from(new Set(order.items.map(i => i.productId)));
    for (let i = 0; i < uniqueItems.length; i++) {
      for (let j = i + 1; j < uniqueItems.length; j++) {
        const key = [uniqueItems[i], uniqueItems[j]].sort().join('|');
        if (!pairCounts[key]) {
          const itemA = order.items.find(it => it.productId === uniqueItems[i]);
          const itemB = order.items.find(it => it.productId === uniqueItems[j]);
          pairCounts[key] = {
            count: 0,
            priceA: itemA?.price ?? 0,
            priceB: itemB?.price ?? 0,
          };
        }
        pairCounts[key].count += 1;
      }
    }
  });

  const comboOpportunities: ComboOpportunity[] = Object.entries(pairCounts)
    .filter(([, data]) => data.count >= 2) // at least 2 co-occurrences
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([key, data]) => {
      const [a, b] = key.split('|');
      const total = data.priceA + data.priceB;
      const discount = Math.round(total * 0.1); // 10% bundle discount
      return {
        productA: a,
        productB: b,
        coOccurrenceCount: data.count,
        suggestedPrice: total - discount,
        suggestedDiscount: discount,
      };
    });

  // ── Recommended actions ───────────────────────────────────────────────
  const actions: string[] = [];

  if (bestSellers.length > 0) {
    actions.push(
      `PROMOTE: "${bestSellers[0].productName}" — highest score (${bestSellers[0].score}). Move to top of menu.`,
    );
    actions.push(
      `HIGHLIGHT: Top ${bestSellers.length} sellers generate ${bestSellers.reduce((s, p) => s + p.revenue, 0).toLocaleString()} in revenue. Add "bestseller" badges.`,
    );
  }

  if (lowPerformers.length > 0) {
    const names = lowPerformers.map(p => p.productName).join(', ');
    actions.push(
      `HIDE/DEPROMOTE: Low performers — "${names}". Consider removing or discounting to test demand.`,
    );
  }

  if (comboOpportunities.length > 0) {
    const top = comboOpportunities[0];
    actions.push(
      `CREATE COMBO: Products ${top.productA} + ${top.productB} ordered together ${top.coOccurrenceCount} times. Suggested price: $${top.suggestedPrice} (save $${top.suggestedDiscount}).`,
    );
  }

  const unavailableHighDemand = products.filter(
    p => !p.available && productStats[p.id] && productStats[p.id].frequency > 5,
  );
  if (unavailableHighDemand.length > 0) {
    const names = unavailableHighDemand.map(p => p.name).join(', ');
    actions.push(`RESTOCK: These items have demand but are unavailable — "${names}".`);
  }

  return {
    bestSellers,
    lowPerformers,
    comboOpportunities,
    recommendedActions: actions,
  };
}
