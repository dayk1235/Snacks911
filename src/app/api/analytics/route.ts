import { NextResponse } from 'next/server';
import { getBusinessMetrics } from '@/core/analytics';
import { authGuard } from '@/middleware/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Protection: Admin only
  const auth = await authGuard(req, ['admin', 'gerente']);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  try {
    const metrics = await getBusinessMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[API ANALYTICS] Error:', err);
    return NextResponse.json({ 
      revenue: 0,
      aiCost: 0,
      profit: 0,
      orders: 0,
      avgTicket: 0,
      topStrategy: 'none'
    }, { status: 500 });
  }
}
