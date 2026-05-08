/**
 * lib/loyalty/loyaltyEngine.ts
 *
 * Points-based loyalty system for Snacks 911.
 *
 * Points:  1 pt per $10 spent (floor).
 * Redeem:  100 pts → $30 discount.
 *
 * Levels (based on total_orders):
 *   nuevo      (0–4 orders)   — no bonus
 *   regular    (5–14 orders)  — no bonus
 *   frecuente  (15–29 orders) — +10% discount on orders
 *   vip        (30+ orders)   — +15% discount + free delivery
 *
 * Tables:
 *   loyalty_accounts(customer_id PK, total_points, redeemed_points, total_orders, level)
 *   loyalty_transactions(id, customer_id, order_id, points_delta, reason)
 */

import { getSupabaseAdmin } from '@/lib/db.server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoyaltyLevel = 'nuevo' | 'regular' | 'frecuente' | 'vip';

export interface LoyaltyAccount {
  customerId: string;
  totalPoints: number;
  redeemedPoints: number;
  availablePoints: number;    // totalPoints - redeemedPoints
  totalOrders: number;
  level: LoyaltyLevel;
  levelBenefits: LevelBenefits;
}

export interface LevelBenefits {
  discountPercent: number;    // 0 | 10 | 15
  freeDelivery: boolean;
}

export interface AddPointsResult {
  pointsEarned: number;
  newTotal: number;
  message: string;
}

export interface RedeemResult {
  success: boolean;
  discountAmount: number;
  remainingPoints: number;
  errorMessage?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POINTS_PER_PESO = 1 / 10;           // 1 pt per $10
const POINTS_TO_DISCOUNT_RATE = 30 / 100; // 100 pts = $30

const LEVEL_THRESHOLDS: Record<LoyaltyLevel, number> = {
  nuevo:     0,
  regular:   5,
  frecuente: 15,
  vip:       30,
};

const LEVEL_BENEFITS: Record<LoyaltyLevel, LevelBenefits> = {
  nuevo:     { discountPercent: 0,  freeDelivery: false },
  regular:   { discountPercent: 0,  freeDelivery: false },
  frecuente: { discountPercent: 10, freeDelivery: false },
  vip:       { discountPercent: 15, freeDelivery: true  },
};

const LEVEL_EMOJIS: Record<LoyaltyLevel, string> = {
  nuevo:     '🌱',
  regular:   '⭐',
  frecuente: '🔥',
  vip:       '💎',
};

const LEVEL_NAMES: Record<LoyaltyLevel, string> = {
  nuevo:     'Nuevo',
  regular:   'Regular',
  frecuente: 'Frecuente',
  vip:       'VIP',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeLevel(totalOrders: number): LoyaltyLevel {
  if (totalOrders >= LEVEL_THRESHOLDS.vip)       return 'vip';
  if (totalOrders >= LEVEL_THRESHOLDS.frecuente)  return 'frecuente';
  if (totalOrders >= LEVEL_THRESHOLDS.regular)    return 'regular';
  return 'nuevo';
}

function computePointsEarned(orderTotal: number): number {
  return Math.floor(orderTotal * POINTS_PER_PESO);
}

function computeDiscount(points: number): number {
  // Only redeem in multiples of 100
  const redeemable = Math.floor(points / 100) * 100;
  return Math.round(redeemable * POINTS_TO_DISCOUNT_RATE * 100) / 100;
}

function rowToAccount(row: any): LoyaltyAccount {
  const level = computeLevel(row.total_orders ?? 0);
  return {
    customerId: row.customer_id,
    totalPoints: row.total_points ?? 0,
    redeemedPoints: row.redeemed_points ?? 0,
    availablePoints: (row.total_points ?? 0) - (row.redeemed_points ?? 0),
    totalOrders: row.total_orders ?? 0,
    level,
    levelBenefits: LEVEL_BENEFITS[level],
  };
}

/** Creates a default account row (does NOT persist — caller must upsert) */
function defaultAccount(customerId: string): LoyaltyAccount {
  return {
    customerId,
    totalPoints: 0,
    redeemedPoints: 0,
    availablePoints: 0,
    totalOrders: 0,
    level: 'nuevo',
    levelBenefits: LEVEL_BENEFITS.nuevo,
  };
}

// ─── getLoyaltyAccount ────────────────────────────────────────────────────────

/**
 * Fetches (or initializes) the loyalty account for a customer.
 * Returns a default account with 0 points if the customer has no record yet.
 */
export async function getLoyaltyAccount(customerId: string): Promise<LoyaltyAccount> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('loyalty_accounts')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    console.error('[loyaltyEngine] getLoyaltyAccount error:', error.message);
    return defaultAccount(customerId);
  }

  if (!data) {
    return defaultAccount(customerId);
  }

  return rowToAccount(data);
}

// ─── addPoints ────────────────────────────────────────────────────────────────

/**
 * Awards points for a completed, paid order.
 * - Upserts loyalty_accounts (increments points + orders)
 * - Inserts a loyalty_transactions row
 * - Returns pointsEarned, newTotal, and a WhatsApp-ready message
 *
 * Idempotent: checks loyalty_transactions for the orderId before inserting.
 */
export async function addPoints(
  customerId: string,
  orderTotal: number,
  orderId: string,
): Promise<AddPointsResult> {
  const supabase = getSupabaseAdmin();

  // Idempotency: skip if already credited for this order
  const { data: existing } = await supabase
    .from('loyalty_transactions')
    .select('id')
    .eq('customer_id', customerId)
    .eq('order_id', orderId)
    .eq('reason', 'order_paid')
    .maybeSingle();

  if (existing) {
    const acct = await getLoyaltyAccount(customerId);
    return {
      pointsEarned: 0,
      newTotal: acct.availablePoints,
      message: '',  // No message — already processed
    };
  }

  const pointsEarned = computePointsEarned(orderTotal);

  // Upsert account (increment atomically via RPC or client-side)
  const { data: current } = await supabase
    .from('loyalty_accounts')
    .select('total_points, redeemed_points, total_orders')
    .eq('customer_id', customerId)
    .maybeSingle();

  const prevPoints  = current?.total_points   ?? 0;
  const prevRedeemed = current?.redeemed_points ?? 0;
  const prevOrders  = current?.total_orders    ?? 0;

  const newTotalPoints = prevPoints + pointsEarned;
  const newTotalOrders = prevOrders + 1;
  const newLevel       = computeLevel(newTotalOrders);

  await supabase.from('loyalty_accounts').upsert({
    customer_id:     customerId,
    total_points:    newTotalPoints,
    redeemed_points: prevRedeemed,
    total_orders:    newTotalOrders,
    level:           newLevel,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'customer_id' });

  // Record transaction
  await supabase.from('loyalty_transactions').insert({
    customer_id:  customerId,
    order_id:     orderId,
    points_delta: pointsEarned,
    reason:       'order_paid',
  });

  const available = newTotalPoints - prevRedeemed;
  const canRedeem = available >= 100;

  const message = [
    `🎁 *+${pointsEarned} puntos Snacks 911*`,
    '',
    `Saldo: *${available} pts* ${LEVEL_EMOJIS[newLevel]} _${LEVEL_NAMES[newLevel]}_`,
    canRedeem
      ? `\\n¡Ya puedes canjear *$${computeDiscount(available)} de descuento*! Escribe *"canjear puntos"* en tu próximo pedido.`
      : `\\nFaltan *${100 - (available % 100)} pts* para tu próximo descuento de $30.`,
  ].join('\\n');

  console.log(`[loyaltyEngine] +${pointsEarned} pts for customer ${customerId} (order ${orderId})`);

  return { pointsEarned, newTotal: available, message };
}

// ─── redeemPoints ─────────────────────────────────────────────────────────────

/**
 * Redeems loyalty points for a discount on a new order.
 * Points must be a multiple of 100.
 * Returns success, discountAmount, and remainingPoints.
 */
export async function redeemPoints(
  customerId: string,
  points: number,
  orderId: string,
): Promise<RedeemResult> {
  if (points <= 0 || points % 100 !== 0) {
    return {
      success: false,
      discountAmount: 0,
      remainingPoints: 0,
      errorMessage: 'Debes canjear en múltiplos de 100 puntos.',
    };
  }

  const supabase = getSupabaseAdmin();
  const acct = await getLoyaltyAccount(customerId);

  if (acct.availablePoints < points) {
    return {
      success: false,
      discountAmount: 0,
      remainingPoints: acct.availablePoints,
      errorMessage: `No tienes suficientes puntos. Saldo: ${acct.availablePoints} pts.`,
    };
  }

  const discountAmount = computeDiscount(points);
  const newRedeemed    = acct.redeemedPoints + points;
  const remaining      = acct.availablePoints - points;

  // Update account
  await supabase
    .from('loyalty_accounts')
    .update({
      redeemed_points: newRedeemed,
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', customerId);

  // Record transaction (negative delta = redeemed)
  await supabase.from('loyalty_transactions').insert({
    customer_id:  customerId,
    order_id:     orderId,
    points_delta: -points,
    reason:       'redemption',
  });

  console.log(`[loyaltyEngine] Redeemed ${points} pts for ${customerId} → $${discountAmount} discount`);

  return { success: true, discountAmount, remainingPoints: remaining };
}

// ─── getLoyaltyStatus ────────────────────────────────────────────────────────

/**
 * Returns a formatted WhatsApp message with the customer's loyalty status.
 * Includes: level badge, point balance, progress bar to next level, and
 * a redemption prompt if they have 100+ pts.
 */
export async function getLoyaltyStatus(customerId: string): Promise<string> {
  const acct = await getLoyaltyAccount(customerId);
  const { level, availablePoints, totalOrders, levelBenefits } = acct;

  const emoji   = LEVEL_EMOJIS[level];
  const name    = LEVEL_NAMES[level];

  // Progress bar to next level
  const nextLevelEntry = Object.entries(LEVEL_THRESHOLDS)
    .filter(([, threshold]) => threshold > totalOrders)
    .sort(([, a], [, b]) => a - b)[0];

  let progressSection = '';
  if (nextLevelEntry) {
    const [nextLevel, nextThreshold] = nextLevelEntry;
    const ordersNeeded = nextThreshold - totalOrders;
    const nextEmoji    = LEVEL_EMOJIS[nextLevel as LoyaltyLevel];
    const nextName     = LEVEL_NAMES[nextLevel as LoyaltyLevel];

    // ASCII progress bar (10 segments)
    const progress      = Math.min(totalOrders / nextThreshold, 1);
    const filled        = Math.round(progress * 10);
    const bar           = '█'.repeat(filled) + '░'.repeat(10 - filled);

    progressSection = [
      '',
      `📈 Próximo nivel: *${nextEmoji} ${nextName}*`,
      `[${bar}] ${totalOrders}/${nextThreshold} pedidos`,
      `Faltan *${ordersNeeded} pedido(s)* más.`,
    ].join('\n');
  } else {
    progressSection = '\n🏆 ¡Eres *VIP*! Nivel máximo alcanzado.';
  }

  // Benefits summary
  const benefits: string[] = [];
  if (levelBenefits.discountPercent > 0)
    benefits.push(`${levelBenefits.discountPercent}% de descuento en cada pedido`);
  if (levelBenefits.freeDelivery)
    benefits.push('🛵 Delivery GRATIS');
  const benefitsSection = benefits.length > 0
    ? `\n\n🎁 *Tus beneficios:*\n${benefits.map(b => `• ${b}`).join('\n')}`
    : '';

  // Redemption prompt
  const redeemSection = availablePoints >= 100
    ? `\n\n💡 *¡Tienes puntos para canjear!*\nEscribe *"canjear ${Math.floor(availablePoints / 100) * 100} puntos"* y te aplicamos *$${computeDiscount(availablePoints)} de descuento* en tu pedido.`
    : `\n\nFaltan *${100 - (availablePoints % 100)} pts* para tu siguiente descuento de $30.`;

  return [
    `${emoji} *Tu cuenta Snacks 911 — Nivel ${name}*`,
    '',
    `⭐ *Puntos disponibles: ${availablePoints} pts*`,
    `📦 Pedidos realizados: ${totalOrders}`,
    progressSection,
    benefitsSection,
    redeemSection,
  ].join('\n');
}

// ─── Checkout loyalty prompt ──────────────────────────────────────────────────

/**
 * Returns a redemption prompt message if the customer has 100+ available points.
 * Call this at checkout start before showing the payment link.
 * Returns null if no points to redeem.
 */
export async function getCheckoutLoyaltyPrompt(customerId: string): Promise<string | null> {
  const acct = await getLoyaltyAccount(customerId);

  if (acct.availablePoints < 100) return null;

  const redeemablePoints   = Math.floor(acct.availablePoints / 100) * 100;
  const discountAmount     = computeDiscount(redeemablePoints);

  return [
    `💎 *¡Tienes ${acct.availablePoints} puntos de lealtad!*`,
    '',
    `Puedes canjear *${redeemablePoints} pts* y obtener *$${discountAmount} de descuento* en este pedido.`,
    '',
    '¿Quieres aplicar el descuento? Responde *"sí, canjear"* o *"no"*.',
  ].join('\n');
}
