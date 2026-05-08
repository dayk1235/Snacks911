import { NextResponse } from 'next/server';
import { getSystemHealth } from '@/core/healthMetrics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Public (or internal) observability endpoint for system status.
 */
export async function GET() {
  try {
    const health = await getSystemHealth();
    
    // Return appropriate status code based on health
    const statusCode = health.status === 'CRITICAL' ? 503 : 200;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (err) {
    return NextResponse.json({
      status: "CRITICAL",
      error: "Metrics engine failed"
    }, { status: 500 });
  }
}
