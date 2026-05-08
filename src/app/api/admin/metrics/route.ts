/**
 * app/api/admin/metrics/route.ts
 * 
 * Secure API endpoint for fetching dashboard metrics.
 */

import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/admin/metricsEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // 30 second cache

export async function GET(req: Request) {
  // 1. Verify Authorization
  const authHeader = req.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET_KEY;

  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metrics = await getDashboardMetrics();
    
    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[api/admin/metrics] Error:', err);
    return NextResponse.json({ 
      success: false, 
      error: String(err) 
    }, { status: 500 });
  }
}
