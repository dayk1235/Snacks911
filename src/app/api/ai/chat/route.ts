/**
 * /api/ai/chat — Ruta segura para Gemini (Capa 1.5 - Flow Engine).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBotResponse } from "@/core/botEngine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message as string;
    const phone = body.phone as string;
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    const response = await getBotResponse({ message, phone });

    return NextResponse.json({ reply: response });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AI Chat]', msg);
    return NextResponse.json({ 
      reply: '🔥 Aguanta, se me saturó la línea. ¿Qué se te antojaba del menú?'
    });
  }
}
