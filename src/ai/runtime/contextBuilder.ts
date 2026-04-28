import type { ChatState } from './flowEngine';
import type { IntentResponse } from './intentAgent';

export interface AgentContext {
  producto: string | null;
  extras: string[];
  paso: ChatState['paso'];
  intent: string;
}

/**
 * Centraliza el contexto para los distintos agentes del sistema,
 * consolidando el estado conversacional y los datos extraídos de la intención.
 */
export function buildContext(
  state: Partial<ChatState>, 
  intentData: IntentResponse
): AgentContext {
  return {
    producto: state.producto || null,
    extras: state.extras || [],
    paso: state.paso || 'inicio',
    intent: intentData.intent
  };
}
