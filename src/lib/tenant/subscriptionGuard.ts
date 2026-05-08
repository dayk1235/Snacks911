import { getSupabaseAdmin } from '@/lib/db.server';

export interface SubscriptionStatus {
  isActive: boolean;
  plan: 'basic' | 'pro' | null;
  status: string | null;
}

/**
 * Validates if a tenant has an active subscription.
 * Throws an error if subscription is missing or inactive.
 */
export async function requireActiveSubscription(tenantId: string): Promise<SubscriptionStatus> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('SUBSCRIPTION_NOT_FOUND');
  }

  const now = new Date();
  const periodEnd = new Date(data.current_period_end);
  const isActive = (data.status === 'active' || data.status === 'trialing') && periodEnd > now;

  if (!isActive) {
    throw new Error('SUBSCRIPTION_INACTIVE');
  }

  return {
    isActive: true,
    plan: data.plan as 'basic' | 'pro',
    status: data.status,
  };
}

/**
 * Example Usage in Next.js API Route (src/app/api/premium-feature/route.ts)
 * 
 * import { NextResponse } from 'next/server';
 * import { requireActiveSubscription } from '@/lib/tenant/subscriptionGuard';
 * 
 * export async function POST(req: Request) {
 *   try {
 *     const tenantId = req.headers.get('x-tenant-id');
 *     if (!tenantId) return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
 * 
 *     // Guard: Only Pro users can access this
 *     const sub = await requireActiveSubscription(tenantId);
 *     if (sub.plan !== 'pro') {
 *       return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
 *     }
 * 
 *     return NextResponse.json({ success: true, data: 'Premium results' });
 *   } catch (err: any) {
 *     return NextResponse.json({ error: err.message }, { status: 402 });
 *   }
 * }
 */
