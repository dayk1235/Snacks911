import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db.server';

export async function POST(req: NextRequest) {
  try {
    const { id, action } = await req.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    // status: 'approved' or 'rejected'
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('ai_suggestions')
      .update({ status: action })
      .eq('id', id);

    if (error) {
      console.error('[AI Approve] Database error:', error);
      return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok', message: `Suggestion ${action}` });
  } catch (error) {
    console.error('[AI Approve] Request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
