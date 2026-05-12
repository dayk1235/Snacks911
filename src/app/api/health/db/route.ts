import { NextResponse } from 'next/server';
import { getDBCircuitHealth } from '@/lib/db.server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/db
 * Returns the current health of the database circuit breaker.
 * Useful for debugging missing tables or connection issues.
 */
export async function GET() {
  try {
    const health = getDBCircuitHealth();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      health
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch DB circuit health'
    }, { status: 500 });
  }
}
