import type { ChatState } from './flowEngine';

export type RouteDecision = 'flow' | 'sales' | 'order';

/**
 * Orquesta la toma de decisiones para saber qué agente debe ejecutarse.
 * Evalúa el estado actual y la intención del usuario.
 */
export function routeDecision(intent: string, state: Partial<ChatState>): RouteDecision {
  // 1. Si state.producto existe:
  // → NO permitir recomendacion ni desvios
  // → retornar "flow"
  if (state.producto) {
    return 'flow';
  }

  // 2. Si intent === "recomendacion":
  // → retornar "sales"
  if (intent === 'recomendacion') {
    return 'sales';
  }

  // 3. Si intent === "pedido":
  // → retornar "order"
  if (intent === 'pedido') {
    return 'order';
  }

  // 4. Si intent === "confirmar":
  // → retornar "flow"
  if (intent === 'confirmar') {
    return 'flow';
  }

  // 5. Default:
  // → retornar "flow"
  return 'flow';
}
