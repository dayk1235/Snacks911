import { NextResponse } from 'next/server'
import { getBotResponse } from '@/core/botEngine'
import { getSystemMode, getSystemState } from '@/core/selfHealingEngine'
import { rateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimit'

export async function POST(req: Request) {
  try {
    const { message, phone } = await req.json()
    const userId = phone || 'web-user'

    const { allowed, retryAfter } = rateLimit(userId, RATE_LIMIT_CONFIG)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter },
        { status: 429 }
      )
    }

    const result = await getBotResponse({
      message,
      phone: userId
    })

    const systemState = {
      mode: getSystemMode(),
      errors: getSystemState().errors,
      consecutiveErrors: getSystemState().consecutiveErrors,
      lastRecovery: getSystemState().lastRecovery,
    }

    return NextResponse.json({
      ...result,
      system_state: systemState
    })
  } catch (e) {
    console.error('AI CHAT ERROR', e)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}