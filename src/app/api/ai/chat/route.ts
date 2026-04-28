/**
 * /api/ai/chat — Ruta segura para Gemini (Capa 1.5 - Flow Engine).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { detectIntent } from '@/ai/runtime/intentAgent';
import { handleMessage, type ChatState } from '@/ai/runtime/flowEngine';
import { improveMessage } from '@/ai/runtime/salesAgent';

import { routeDecision } from '@/ai/runtime/decisionRouter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message as string;
    
    // Permitir recibir el estado desde el cliente, o iniciar uno por defecto
    const state = (body.state as ChatState) || {
      producto: null,
      extras: [],
      bebida: null,
      paso: 'inicio',
      lastMessage: null,
      ambiguousCount: 0,
      pendingRecommendation: null
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    // 1. Detectar Intención usando IA
    const intentData = await detectIntent(message);

    // 2. Controlar el Flujo de la Conversación de forma determinística
    const flowResult = handleMessage(message, intentData, state);

    // 3. Orquestador de Agentes (Decision Router)
    // Se usa nextState porque operaciones previas (ej. flowEngine) pudieron agregar un producto
    const decision = routeDecision(intentData.intent, flowResult.nextState);

    // 4. Mejorar el texto para vender (opcional/AI enhancement)
    let finalText = flowResult.message;
    if (decision === 'sales' || intentData.intent === 'test_ai') {
      finalText = await improveMessage(flowResult.message);
    }

    // 4. Retornar texto manteniendo la compatibilidad ({ text: string })
    // También enviamos el nextState por si la UI quiere aprovecharlo más adelante.
    return NextResponse.json({ 
      text: finalText,
      state: flowResult.nextState 
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AI Chat]', msg);
    // Fallback absoluto por si algo explota
    return NextResponse.json({ 
      text: '🔥 Aguanta, se me saturó la línea. ¿Qué se te antojaba del menú?',
      state: { producto: null, paso: 'inicio' }
    });
  }
}
