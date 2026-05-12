import { NextResponse } from 'next/server';
import { getCustomerProfileFromDB } from '@/lib/db.server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/memory?phone=...
 * Returns summarized memory for a specific phone number.
 * Used by botEngine to contextualize responses.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone || phone === 'anonymous') {
      return NextResponse.json({ 
        isReturning: false,
        lastOrder: null 
      });
    }

    // Fetch profile (includes orders count, last date, etc)
    const profile = await getCustomerProfileFromDB(phone);
    
    if (!profile) {
      return NextResponse.json({
        isReturning: false,
        lastOrder: null
      });
    }

    return NextResponse.json({
      isReturning: profile.totalOrders > 0,
      customerName: profile.name,
      restrictions: profile.restrictions || [],
      preferences: profile.preferences || [],
      lastOrderAt: profile.lastOrderAt,
      // Metadata for strategy engine
      lastOrder: profile.totalOrders > 0 ? {
          total: profile.totalSpent,
          date: profile.lastOrderAt
      } : null
    });

  } catch (err) {
    console.error('[API MEMORY] Error:', err);
    return NextResponse.json({ 
      isReturning: false, 
      error: 'Memory fetch failed' 
    }, { status: 500 });
  }
}
