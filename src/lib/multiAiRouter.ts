/**
 * multiAiRouter.ts — Routes user intent to the best AI model.
 *
 * MAPEO:
 * ventas, estrategia, sistema → GPT
 * logica, codigo, estructura → QWEN
 * analisis, razonamiento, texto_largo → CLAUDE
 * mixto → multi_ai (fallback)
 *
 * REGLA:
 * - Tarea compleja → multi_ai
 * - Tarea simple → 1 modelo
 */

export type AiModel = 'gpt' | 'qwen' | 'claude' | 'multi_ai' | 'rule_based';

export type Intent =
  | 'ventas'
  | 'estrategia'
  | 'sistema'
  | 'logica'
  | 'codigo'
  | 'estructura'
  | 'analisis'
  | 'razonamiento'
  | 'texto_largo'
  | 'mixto'
  | 'pedido'
  | 'hambre'
  | 'duda'
  | 'precio'
  | 'aceptacion'
  | 'rechazo'
  | 'rechazo_fuerte'
  | 'pago_problema'
  | 'exploracion'
  | 'browsing'
  | 'gratitud'
  | 'despedida'
  | 'edicion'
  | 'urgencia';

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  ventas: ['comprar', 'vender', 'oferta', 'descuento', 'promo', 'precio', 'costo'],
  estrategia: ['estrategia', 'plan', 'mejorar', 'optimizar', 'crecer'],
  sistema: ['sistema', 'plataforma', 'funciona', 'error', 'bug'],
  logica: ['logica', 'algoritmo', 'funcion', 'calcular'],
  codigo: ['codigo', 'programar', 'desarrollo', 'implementar'],
  estructura: ['estructura', 'arquitectura', 'organizar', 'modular'],
  analisis: ['analizar', 'datos', 'metricas', 'rendimiento'],
  razonamiento: ['por que', 'como funciona', 'explicar', 'entender'],
  texto_largo: ['escribir', 'redactar', 'documento', 'descripcion'],
  mixto: ['todo', 'general', 'varias'],
  pedido: ['pedir', 'orden', 'pedido', 'menu', 'comer', 'hambre', 'antojo'],
  hambre: ['hambre', 'antojo', 'comer', 'comida', 'menu'],
  duda: ['duda', 'no se', 'cual', 'mejor', 'recomienda', 'opcion'],
  precio: ['precio', 'costo', 'cuanto', 'caro', 'barato', 'economico'],
  aceptacion: ['si', 'quiero', 'dame', 'va', 'dale'],
  rechazo: ['no', 'mejor no', 'no quiero'],
  rechazo_fuerte: ['no quiero', 'no me interesa', 'muy caro'],
  pago_problema: ['no tengo efectivo', 'aceptan tarjeta', 'pago con qr'],
  exploracion: ['que mas', 'menu', 'opciones'],
  browsing: ['solo viendo', 'mirando'],
  gratitud: ['gracias', 'thank'],
  despedida: ['adios', 'bye', 'nos vemos'],
  edicion: ['agregar', 'quitar', 'cambiar'],
  urgencia: ['rapido', 'pronto', 'tardan'],
};

const MODEL_ROUTING: Record<Intent, AiModel> = {
  ventas: 'gpt', estrategia: 'gpt', sistema: 'gpt',
  logica: 'qwen', codigo: 'qwen', estructura: 'qwen',
  analisis: 'claude', razonamiento: 'claude', texto_largo: 'claude',
  mixto: 'multi_ai',
  pedido: 'rule_based', hambre: 'rule_based', duda: 'rule_based', precio: 'rule_based',
  aceptacion: 'rule_based', rechazo: 'rule_based', rechazo_fuerte: 'rule_based',
  pago_problema: 'rule_based', exploracion: 'rule_based', browsing: 'rule_based',
  gratitud: 'rule_based', despedida: 'rule_based', edicion: 'rule_based', urgencia: 'rule_based',
};

/** Detect primary intent from user input */
export function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  let bestScore = 0;
  let bestIntent: Intent = 'mixto';

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as Intent;
    }
  }

  // Sales/order keywords override
  if (/pedido|orden|comer|hambre|antojo|menu/.test(lower) && bestScore >= 1) {
    if (/hambre|antojo|comer/.test(lower)) return 'hambre';
    if (/duda|no se|cual|mejor|recomien/.test(lower)) return 'duda';
    if (/precio|costo|cuanto|caro|barato/.test(lower)) return 'precio';
    return 'pedido';
  }

  return bestIntent;
}

/** Route intent to best AI model */
export function routeToModel(intent: Intent): AiModel {
  return MODEL_ROUTING[intent] ?? 'multi_ai';
}

/** Full pipeline: text → intent → model */
export function routeAi(text: string): { intent: Intent; model: AiModel } {
  const intent = detectIntent(text);
  const model = routeToModel(intent);
  return { intent, model };
}

/** Check if task is simple (rule-based) or complex (needs AI) */
export function isComplexTask(intent: Intent): boolean {
  return !['pedido', 'hambre', 'duda', 'precio'].includes(intent);
}

/**
 * Prompt templates per model
 * Used when sending requests to different AI providers
 */
export const PROMPT_TEMPLATES: Record<Exclude<AiModel, 'rule_based'>, string> = {
  gpt: `Eres un experto en ventas y estrategia para Snacks 911, una marca de comida rapida. Responde de forma directa, con enfoque en ventas y conversion.`,
  qwen: `Eres un ingeniero de software senior trabajando en Snacks 911, una app de pedidos. Responde con codigo limpio y arquitectura solida.`,
  claude: `Eres un analista senior para Snacks 911. Proporciona analisis detallado, razonamiento estructurado y recomendaciones basadas en datos.`,
  multi_ai: `Analiza la siguiente consulta para Snacks 911 y proporciona la mejor respuesta posible combinando ventas, tecnica y analisis.`,
};
