/**
 * lib/tips/tipModule.ts
 *
 * Post-payment tip flow for Snacks 911.
 *
 * Flow:
 *   1. Webhook receives `order.paid`
 *   2. After 10 s, sendTipRequest() is called  →  sends a WhatsApp message
 *   3. Customer replies → webhook routes to processTipResponse()
 *   4. Result is persisted in `customer_tips` table
 *
 * Rules:
 *   - Never ask twice for the same order (idempotency via hasPendingTipRequest)
 *   - Accepts numeric ("20"), currency ("$20"), Spanish words ("veinte"),
 *     and decline signals ("no", "0", "omitir")
 */

import { getSupabaseAdmin } from '@/lib/db.server';
import { sendText } from '@/lib/whatsapp/metaClient';

// ─── Tip calculation ──────────────────────────────────────────────────────────

/**
 * Returns suggested tip amounts based on order total (MXN).
 *
 * < $150  → [10, 15, 20]
 * < $300  → [20, 30, 50]
 * ≥ $300  → [30, 50, 80]
 */
export function calculateTipOptions(total: number): number[] {
  if (total < 150) return [10, 15, 20];
  if (total < 300) return [20, 30, 50];
  return [30, 50, 80];
}

// ─── Message builder ──────────────────────────────────────────────────────────

interface TipMessageParams {
  options: number[];
  lastTipAmount?: number;
}

/**
 * Builds the WhatsApp message asking the customer for a tip.
 * Displays 3 suggested amounts + "0 para omitir".
 */
export function buildTipMessage({ options, lastTipAmount }: TipMessageParams): string {
  const [a, b, c] = options;

  const lines = [
    '💛 *¡Gracias por tu pedido!*',
    '',
    '¿Te gustaría dejar propina para nuestro repartidor? 🛵',
    '',
    `Puedes escribir el monto que prefieras:`,
    `  • $${a}`,
    `  • $${b}`,
    `  • $${c}`,
    '',
    '_(Escribe 0 para omitir)_',
  ];

  if (lastTipAmount && lastTipAmount > 0) {
    lines.splice(2, 0, `_(La última vez dejaste $${lastTipAmount})_`, '');
  }

  return lines.join('\n');
}

// ─── Spanish number words ─────────────────────────────────────────────────────

const SPANISH_NUMBERS: Record<string, number> = {
  cero: 0,
  uno: 1,
  diez: 10,
  quince: 15,
  veinte: 20,
  veinticinco: 25,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
};

const DECLINE_WORDS = new Set([
  'no', 'nop', 'nope', 'gracias', 'no gracias',
  'omitir', 'sin propina', 'ninguna', 'ninguno',
  '0', 'cero',
]);

// ─── Response parser ──────────────────────────────────────────────────────────

export interface TipResult {
  tipAmount: number;
  responseMessage: string;
}

/**
 * Parses a free-form customer reply and returns the tip amount + a confirmation.
 *
 * Accepts: "20" | "$20" | "20 pesos" | "veinte" | "no" | "0" | "omitir"
 */
export async function processTipResponse(
  sessionId: string,
  orderId: string,
  message: string,
): Promise<TipResult> {
  const normalized = message.trim().toLowerCase().replace(/\s+/g, ' ');

  // Decline
  if (DECLINE_WORDS.has(normalized)) {
    return {
      tipAmount: 0,
      responseMessage: '¡Está bien! Gracias por tu preferencia. 🔥 *Snacks 911*',
    };
  }

  // Spanish word → number
  const wordAmount = SPANISH_NUMBERS[normalized];
  if (wordAmount !== undefined) {
    if (wordAmount === 0) {
      return {
        tipAmount: 0,
        responseMessage: '¡Está bien! Gracias por tu preferencia. 🔥 *Snacks 911*',
      };
    }
    return {
      tipAmount: wordAmount,
      responseMessage: buildTipConfirmation(wordAmount),
    };
  }

  // Numeric: "$20", "20", "20 pesos", "$ 20"
  const numericMatch = normalized.match(/^\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (numericMatch) {
    const amount = parseFloat(numericMatch[1]);

    if (amount === 0) {
      return {
        tipAmount: 0,
        responseMessage: '¡Está bien! Gracias por tu preferencia. 🔥 *Snacks 911*',
      };
    }

    if (amount > 0 && amount <= 9999) {
      return {
        tipAmount: amount,
        responseMessage: buildTipConfirmation(amount),
      };
    }
  }

  // Unrecognized
  return {
    tipAmount: -1, // Sentinel: not understood, caller may re-prompt once
    responseMessage:
      '¿Cuánto quieres dejar de propina? Escribe el monto (ej. *20*) o *0* para omitir.',
  };
}

function buildTipConfirmation(amount: number): string {
  return [
    `✅ ¡Gracias! Propina de *$${amount.toFixed(2)} MXN* registrada. 💛`,
    '',
    '🔥 *Snacks 911* — ¡Hasta la próxima!',
  ].join('\n');
}

// ─── DB persistence ───────────────────────────────────────────────────────────

export interface TipRecord {
  id?: string;
  customer_id: string;
  order_id: string;
  tip_amount: number;
  order_total: number;
  created_at?: string;
}

/**
 * Persists the tip decision to `customer_tips`.
 * Also stores tip_amount = 0 for explicit declines so we never ask again.
 */
export async function saveTipRecord(
  customerId: string,
  orderId: string,
  tipAmount: number,
  orderTotal: number,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('customer_tips').insert({
    customer_id: customerId,
    order_id: orderId,
    tip_amount: tipAmount,
    order_total: orderTotal,
  });

  if (error) {
    console.error('[tipModule] Error saving tip record:', error.message);
  } else {
    console.log(
      `[tipModule] Tip saved: orderId=${orderId} amount=${tipAmount} customerId=${customerId}`,
    );
  }
}

// ─── Idempotency guard ────────────────────────────────────────────────────────

/**
 * Returns true if a tip record (asked or answered) already exists for this order.
 * Call before sending the tip message to prevent double-asking.
 */
export async function hasTipRecord(orderId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('customer_tips')
    .select('id')
    .eq('order_id', orderId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[tipModule] hasTipRecord error:', error.message);
    return false; // fail-open so we'd rather ask than silently miss
  }

  return !!data;
}

// ─── Trigger: send tip request after payment ──────────────────────────────────

/**
 * Should be called from the webhook after `order.paid` is processed.
 * Waits 10 seconds, checks idempotency, then sends the tip message.
 *
 * @param orderId    Internal Snacks 911 order ID
 * @param customerId Customer ID (from orders table)
 * @param phone      WhatsApp phone number (E.164)
 * @param orderTotal Confirmed order total (MXN)
 * @param customerName Customer first name for the message
 */
export async function scheduleTipRequest(
  orderId: string,
  customerId: string,
  phone: string,
  orderTotal: number,
  customerName?: string,
): Promise<void> {
  // Non-blocking: fire-and-forget with 10 s delay
  setTimeout(async () => {
    try {
      // Idempotency check — never ask twice
      const alreadyAsked = await hasTipRecord(orderId);
      if (alreadyAsked) {
        console.log(`[tipModule] Tip already handled for order ${orderId}, skipping`);
        return;
      }

      const options = calculateTipOptions(orderTotal);
      const message = buildTipMessage({ options });

      await sendText(phone, message);

      // Mark as "asked" by inserting a sentinel with tip_amount = -1
      // so we never send the message again even if they don't reply
      const supabase = getSupabaseAdmin();
      await supabase.from('customer_tips').insert({
        customer_id: customerId,
        order_id: orderId,
        tip_amount: -1,          // -1 = asked but not yet answered
        order_total: orderTotal,
      });

      console.log(`[tipModule] Tip request sent for order ${orderId} → ${phone}`);
    } catch (err) {
      console.error('[tipModule] scheduleTipRequest error:', err);
    }
  }, 10_000); // 10 seconds
}
