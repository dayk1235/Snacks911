import { NextResponse } from 'next/server';
import { dbGetSales } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch sales records for the last 30 days
 */
export async function GET() {
  try {
    const sales = await dbGetSales();
    return NextResponse.json(sales);
  } catch (err: any) {
    console.error('[API GET /api/sales] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
