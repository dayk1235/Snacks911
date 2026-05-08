import { getSupabaseAdmin } from '@/lib/db.server';

export interface ReferralValidationResult {
  valid: boolean;
  reason?: 'SELF_REFERRAL' | 'ALREADY_REFERRED' | 'NOT_NEW_CUSTOMER' | 'CODE_INVALID' | 'LIMIT_EXCEEDED';
}

/**
 * Validates a referral application for potential fraud.
 */
export async function validateReferralFraud(
  code: string,
  newCustomerId: string,
  newCustomerPhone: string
): Promise<ReferralValidationResult> {
  const supabase = getSupabaseAdmin();

  // 1. Check if code exists and get owner
  const { data: referralCode, error: codeError } = await supabase
    .from('referral_codes')
    .select('customer_id, total_referrals, max_referrals')
    .eq('code', code.toUpperCase())
    .single();

  if (codeError || !referralCode) {
    return { valid: false, reason: 'CODE_INVALID' };
  }

  // 2. Prevent Self-Referral
  if (referralCode.customer_id === newCustomerId) {
    return { valid: false, reason: 'SELF_REFERRAL' };
  }

  // 3. Check for Limit Abuse
  if (referralCode.total_referrals >= referralCode.max_referrals) {
    return { valid: false, reason: 'LIMIT_EXCEEDED' };
  }

  // 4. Verify Customer is actually NEW (0 prior paid orders)
  const { count: priorOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', newCustomerId)
    .in('status', ['paid', 'completed']);

  if (priorOrders && priorOrders > 0) {
    return { valid: false, reason: 'NOT_NEW_CUSTOMER' };
  }

  // 5. Check if this customer ID has already used a referral
  const { data: existingTx } = await supabase
    .from('referral_transactions')
    .select('id')
    .eq('new_customer_id', newCustomerId)
    .maybeSingle();

  if (existingTx) {
    return { valid: false, reason: 'ALREADY_REFERRED' };
  }

  return { valid: true };
}

/**
 * Example Usage in Flow Controller:
 * 
 * const fraudCheck = await validateReferralFraud(code, userId, phone);
 * if (!fraudCheck.valid) {
 *   return { text: `Lo siento, este código no es válido para ti (${fraudCheck.reason}).` };
 * }
 */
