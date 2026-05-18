import { NextResponse } from 'next/server'
import { getBotResponse } from '@/core/botEngine'
import { getSystemMode } from '@/core/selfHealingEngine'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: Request) {
  try {
    const { message, phone, cart } = await req.json()
    const userId = phone || 'web-user'

    const allowed = rateLimit(userId)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const result = await getBotResponse({
      message,
      phone: userId,
      initialCart: cart
    })

    const mode = await getSystemMode()

    return NextResponse.json({
      ...result,
      system_state: { mode }
    })
  } catch (e) {
    console.error('AI CHAT ERROR', e)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
