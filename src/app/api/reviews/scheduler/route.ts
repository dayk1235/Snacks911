/**
 * app/api/reviews/scheduler/route.ts
 *
 * Endpoint to trigger the review scheduler.
 * Secure with a simple secret key in production.
 */

import { NextResponse } from 'next/server';
import { runReviewScheduler } from '@/lib/reviews/reviewScheduler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Simple auth check (optional but recommended)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sentCount = await runReviewScheduler();
    
    return NextResponse.json({
      success: true,
      sent: sentCount,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[api/reviews/scheduler] CRITICAL ERROR:', err);
    return NextResponse.json({ 
      success: false, 
      error: String(err) 
    }, { status: 500 });
  }
}
