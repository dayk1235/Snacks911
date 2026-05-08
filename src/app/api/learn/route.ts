import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/db.server'

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = getSupabaseAdmin()

  await supabase.from('learning_events').insert({
    phone: body.phone,
    event_type: body.type,
    data: body
  })

  return NextResponse.json({ ok: true })
}
