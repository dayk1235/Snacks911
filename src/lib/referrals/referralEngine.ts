/**
 * lib/referrals/referralEngine.ts
 * 
 * Referral system logic for Snacks 911.
 */

import { getSupabaseAdmin } from '@/lib/db.server';

const NEW_CUSTOMER_DISCOUNT = 20;
const REFERRER_CREDIT = 30;

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Generates a unique, idempotent referral code for a customer.
 * Format: WINGS-XXXX
 */
export async function generateReferralCode(customerId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  
  // 1. Check existing
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (existing) return existing.code;

  // 2. Generate new
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const code = `WINGS-${randomSuffix}`;

  try {
    const { error } = await supabase
      .from('referral_codes')
      .insert({ code, customer_id: customerId });

    if (error) {
      // Retry once if collision
      const retrySuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const retryCode = `WINGS-${retrySuffix}`;
      await supabase.from('referral_codes').insert({ code: retryCode, customer_id: customerId });
      return retryCode;
    }

    return code;
  } catch (err) {
    console.error('[referralEngine] Error generating code:', err);
    return code;
  }
}

/**
 * Returns a shareable WhatsApp message for the customer.
 */
export async function getReferralMessage(customerId: string): Promise<string> {
  const code = await generateReferralCode(customerId);
  return [
    `🍗 *¡Regala Snacks, Gana Crédito!* 🍟`,
    '',
    `Comparte tu código con amigos que aún no prueban Snacks 911:`,
    '',
    `👉 *${code}*`,
    '',
    `🎁 Ellos reciben *$${NEW_CUSTOMER_DISCOUNT} de descuento* en su primer pedido.`,
    `💰 Tú recibes *$${REFERRER_CREDIT} de crédito* cuando ellos realicen su compra.`,
    '',
    `¡Entre más compartas, más WINGS gratis ganas! 🤘`,
  ].join('\n');
}

/**
 * Validates and applies a referral code to a new customer's order.
 */
export async function applyReferralCode(
  newCustomerId: string, 
  code: string,
  orderId?: string
): Promise<{ valid: boolean; discount: number; message: string }> {
  const supabase = getSupabaseAdmin();
  const cleanCode = code.toUpperCase().trim();

  // 1. Validate the code exists
  const { data: refCode, error: codeErr } = await supabase
    .from('referral_codes')
    .select('customer_id')
    .eq('code', cleanCode)
    .maybeSingle();

  if (!refCode || codeErr) {
    return { valid: false, discount: 0, message: '❌ Ese código no es válido. Verifica que esté bien escrito.' };
  }

  // 2. Prevent self-referral
  if (refCode.customer_id === newCustomerId) {
    return { valid: false, discount: 0, message: '😅 No puedes usar tu propio código, ¡pillo!' };
  }

  // 3. Verify customer is new (0 prior successful orders)
  const { data: priorOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_phone', newCustomerId)
    .in('status', ['confirmed', 'preparing', 'ready', 'delivered', 'completed'])
    .limit(1);

  if (priorOrders && priorOrders.length > 0) {
    return { valid: false, discount: 0, message: '😅 Los códigos de referido son solo para el primer pedido de clientes nuevos.' };
  }

  // 4. Verify they haven't used a referral before
  const { data: existingTx } = await supabase
    .from('referral_transactions')
    .select('id')
    .eq('new_customer_id', newCustomerId)
    .maybeSingle();

  if (existingTx) {
    return { valid: false, discount: 0, message: '😅 Ya has utilizado un código de descuento anteriormente.' };
  }

  // 5. Create transaction record (pending)
  try {
    await supabase.from('referral_transactions').insert({
      code: cleanCode,
      new_customer_id: newCustomerId,
      order_id: orderId,
      discount_given: NEW_CUSTOMER_DISCOUNT,
      credit_activated: false
    });

    return {
      valid: true,
      discount: NEW_CUSTOMER_DISCOUNT,
      message: `✅ ¡Código *${cleanCode}* aplicado! Se descontarán *$${NEW_CUSTOMER_DISCOUNT}* de tu primer pedido. 🎁`
    };
  } catch (err) {
    return { valid: false, discount: 0, message: '❌ Error al aplicar el código. Intenta de nuevo.' };
  }
}

/**
 * Activates the referrer's credit once the new customer's order is paid.
 */
export async function activateReferrerCredit(newCustomerId: string, orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 1. Find the transaction
  const { data: tx } = await supabase
    .from('referral_transactions')
    .select('code, credit_activated')
    .eq('new_customer_id', newCustomerId)
    .eq('credit_activated', false)
    .maybeSingle();

  if (!tx) return;

  // 2. Mark as activated
  await supabase
    .from('referral_transactions')
    .update({ credit_activated: true, order_id: orderId })
    .eq('new_customer_id', newCustomerId);

  // 3. Increment referrer's count
  await supabase.rpc('increment_referral_count', { p_code: tx.code });

  console.log(`[referralEngine] Referrer credit activated for code ${tx.code} via customer ${newCustomerId}`);
}
