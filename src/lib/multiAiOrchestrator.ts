/**
 * multiAiOrchestrator.ts — Orquestador multi-IA para Snacks 911.
 *
 * FLUJO DE EJECUCIÓN:
 * 1. Recibir input
 * 2. Router decide modelos
 * 3. Enviar prompt a cada AI
 * 4. Recibir respuestas
 * 5. Normalizar outputs
 * 6. Fusionar
 * 7. Enviar respuesta final
 *
 * COMMANDS:
 * - multi_ai → activar_orquestador()
 * - usar_qwen → ejecutar_qwen()
 * - usar_claude → ejecutar_claude()
 * - fusionar → combinar_respuestas()
 * - decision_final → elegir_mejor()
 */

import type { AiModel, Intent } from './multiAiRouter';

// ─── Response types ────────────────────────────────────────────────────────

export interface AiResponse {
  model: 'qwen' | 'claude' | 'gpt' | 'rule_based';
  text: string;
  confidence: number; // 0-1
  latency: number; // ms
  metadata?: Record<string, unknown>;
}

export interface OrchestratorResult {
  input: string;
  intent: Intent;
  modelsUsed: string[];
  responses: AiResponse[];
  normalized: AiResponse[];
  winner: AiResponse;
  combined?: string;
  decision: string;
  totalLatency: number;
}

// ─── Step 3: Enviar prompt a cada AI ───────────────────────────────────────

/**
 * ejecutar_qwen() — Best for: código, lógica, estructura
 */
export async function ejecutarQwen(
  prompt: string,
  intent: Intent,
  context?: Record<string, unknown>,
): Promise<AiResponse> {
  const start = Date.now();
  // TODO: Replace with actual QWEN API call
  // const res = await fetch('/api/ai/qwen', { method: 'POST', body: JSON.stringify({ prompt, context, intent }) });
  // const data = await res.json();

  // Simulated execution
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
  const latency = Date.now() - start;

  const isCodeRelated = ['codigo', 'logica', 'estructura'].includes(intent);

  return {
    model: 'qwen',
    text: isCodeRelated
      ? `Análisis técnico: ${prompt}. Solución óptima implementada con patrón singleton y cache TTL.`
      : `Para Snacks 911, optimiza el flujo de pedidos: combos primero, upsell automático.`,
    confidence: isCodeRelated ? 0.94 : 0.78,
    latency,
    metadata: { intent, model: 'qwen-coder', step: 'ejecutar_qwen' },
  };
}

/**
 * ejecutar_claude() — Best for: análisis, razonamiento, texto largo
 */
export async function ejecutarClaude(
  prompt: string,
  intent: Intent,
  context?: Record<string, unknown>,
): Promise<AiResponse> {
  const start = Date.now();
  // TODO: Replace with actual CLAUDE API call
  // const res = await fetch('/api/ai/claude', { method: 'POST', body: JSON.stringify({ prompt, context, intent }) });
  // const data = await res.json();

  await new Promise(r => setTimeout(r, 150 + Math.random() * 250));
  const latency = Date.now() - start;

  const isAnalysis = ['analisis', 'razonamiento', 'estrategia'].includes(intent);

  return {
    model: 'claude',
    text: isAnalysis
      ? `Análisis detallado: ${prompt}. Recomendación basada en datos de conversión y AOV.`
      : `Estrategia: Snacks 911 debe enfocarse en combos premium para maximizar ticket promedio.`,
    confidence: isAnalysis ? 0.96 : 0.82,
    latency,
    metadata: { intent, model: 'claude-sonnet', step: 'ejecutar_claude' },
  };
}

/**
 * ejecutar_gpt() — Best for: ventas, estrategia, marketing
 */
export async function ejecutarGpt(
  prompt: string,
  intent: Intent,
  context?: Record<string, unknown>,
): Promise<AiResponse> {
  const start = Date.now();
  // TODO: Replace with actual GPT API call
  // const res = await fetch('/api/ai/gpt', { method: 'POST', body: JSON.stringify({ prompt, context, intent }) });
  // const data = await res.json();

  await new Promise(r => setTimeout(r, 120 + Math.random() * 220));
  const latency = Date.now() - start;

  const isSales = ['ventas', 'estrategia', 'sistema'].includes(intent);

  return {
    model: 'gpt',
    text: isSales
      ? `Estrategia de ventas: ${prompt}. Implementar urgency + social proof + scarcity.`
      : `Snacks 911: Crear combos de $119-189 con percepción de valor alto. Upsell en cada paso.`,
    confidence: isSales ? 0.93 : 0.75,
    latency,
    metadata: { intent, model: 'gpt-4o', step: 'ejecutar_gpt' },
  };
}

// ─── Step 2: Router decide modelos ─────────────────────────────────────────

function selectModels(model: AiModel, intent: Intent): ('qwen' | 'claude' | 'gpt')[] {
  switch (model) {
    case 'qwen':
      return ['qwen'];
    case 'claude':
      return ['claude'];
    case 'gpt':
      return ['gpt'];
    case 'multi_ai':
      // Run all 3 in parallel
      return ['qwen', 'claude', 'gpt'];
    default:
      // Fallback: pick best model for intent
      if (['codigo', 'logica', 'estructura'].includes(intent)) return ['qwen'];
      if (['analisis', 'razonamiento', 'texto_largo'].includes(intent)) return ['claude'];
      if (['ventas', 'estrategia', 'sistema'].includes(intent)) return ['gpt'];
      return ['qwen', 'claude'];
  }
}

// ─── Step 5: Normalizar outputs ────────────────────────────────────────────

/**
 * normalizarRespuestas()
 * Estandariza formato y escala de confianza
 */
export function normalizarRespuestas(responses: AiResponse[]): AiResponse[] {
  if (responses.length <= 1) return responses;

  // Normalize confidence to 0-1 scale (some models may use different scales)
  const maxConf = Math.max(...responses.map(r => r.confidence));
  const minConf = Math.min(...responses.map(r => r.confidence));
  const range = maxConf - minConf || 1;

  return responses.map(r => ({
    ...r,
    // Min-max normalization
    confidence: Math.round(((r.confidence - minConf) / range) * 100) / 100,
    text: r.text.trim(),
    // Normalize latency to relative score (lower = better)
    metadata: {
      ...r.metadata,
      latencyScore: Math.round((1 - (r.latency / Math.max(...responses.map(x => x.latency)))) * 100) / 100,
    },
  }));
}

// ─── Step 6: Fusionar ──────────────────────────────────────────────────────

/**
 * combinar_respuestas() — Fusion Engine
 * 1. Extraer lo mejor de cada modelo
 * 2. Eliminar redundancia
 * 3. Simplificar
 * 4. Convertir a acción
 *
 * REGLA: claridad > cantidad, acción > teoría
 */
export function combinarRespuestas(responses: AiResponse[]): string | undefined {
  if (responses.length <= 1) return undefined;

  // Sort by confidence (descending)
  const sorted = [...responses].sort((a, b) => b.confidence - a.confidence);

  // Step 1: Extract best insights per model
  const insights = sorted.map(r => {
    const label = r.model.toUpperCase();
    // Extract key action/recommendation (first sentence or first 100 chars)
    const key = r.text.split('.')[0];
    return `[${label}] ${key}`;
  });

  // Step 2: Eliminate redundancy — keep unique points only
  const uniqueInsights = insights.filter((point, i, arr) =>
    i === 0 || !arr.slice(0, i).some(existing =>
      existing.toLowerCase().includes(point.toLowerCase().slice(0, 30))
    ),
  );

  // Step 3: Simplify — take top 2-3 most relevant points
  const simplified = uniqueInsights.slice(0, 3);

  // Step 4: Convert to action — structured format
  const fused = `🧠 **Análisis Multi-IA:**\n\n${simplified.join('\n\n')}`;

  return fused;
}

// ─── Step 7: Decision Engine — Enviar respuesta final ──────────────────────

/**
 * elegir_mejor() — Decision Engine
 * OBJETIVO: Elegir la mejor respuesta final
 * CRITERIOS: más clara, más útil, más accionable, más alineada a ventas
 * SI hay conflicto → gana la más simple y ejecutable
 */
export function elegirMejor(responses: AiResponse[]): AiResponse {
  if (responses.length === 0) {
    throw new Error('No responses to choose from');
  }
  if (responses.length === 1) return responses[0];

  // Decision scoring:
  // - 40% confidence (quality of reasoning)
  // - 20% actionability (presence of verbs, concrete steps)
  // - 20% sales alignment (presence of business/sales keywords)
  // - 20% simplicity (shorter, clearer is better)
  return responses.reduce((best, current) => {
    // Actionability score: count verbs, imperatives, concrete steps
    const actionWords = (current.text.match(/\b(hacer|crear|usar|implementar|optimizar|vender|agregar|pedir|comprar)\b/gi) || []).length;
    const actionScore = Math.min(actionWords / 3, 1); // Normalize to 0-1, cap at 3 matches

    // Sales alignment score: business/sales keywords
    const salesWords = (current.text.match(/\b(ventas|combo|ticket|conversion|upsell|precio|ahorro|promo)\b/gi) || []).length;
    const salesScore = Math.min(salesWords / 2, 1); // Normalize to 0-1, cap at 2 matches

    // Simplicity score: inverse of length (shorter = clearer)
    const wordCount = current.text.split(/\s+/).length;
    const simplicityScore = Math.max(1 - (wordCount / 100), 0); // Normalize: 0-100 words → 1-0

    // Weighted scoring
    const currentScore =
      current.confidence * 0.4 +
      actionScore * 0.2 +
      salesScore * 0.2 +
      simplicityScore * 0.2;

    const bestAction = (best.text.match(/\b(hacer|crear|usar|implementar|optimizar|vender|agregar|pedir|comprar)\b/gi) || []).length;
    const bestActionScore = Math.min(bestAction / 3, 1);
    const bestSales = (best.text.match(/\b(ventas|combo|ticket|conversion|upsell|precio|ahorro|promo)\b/gi) || []).length;
    const bestSalesScore = Math.min(bestSales / 2, 1);
    const bestWordCount = best.text.split(/\s+/).length;
    const bestSimplicity = Math.max(1 - (bestWordCount / 100), 0);

    const bestScore =
      best.confidence * 0.4 +
      bestActionScore * 0.2 +
      bestSalesScore * 0.2 +
      bestSimplicity * 0.2;

    // Tie-breaker: if scores are close (< 0.05 diff), pick simpler/more executable
    if (Math.abs(currentScore - bestScore) < 0.05) {
      return (simplicityScore > bestSimplicity || actionScore > bestActionScore) ? current : best;
    }

    return currentScore > bestScore ? current : best;
  });
}

// ─── Step 1: Recibir input → Full pipeline ─────────────────────────────────

/**
 * activar_orquestador()
 * Pipeline completo: input → router → execute → normalize → fuse → decision
 */
export async function activarOrquestador(
  prompt: string,
  intent: Intent,
  model: AiModel,
  context?: Record<string, unknown>,
): Promise<OrchestratorResult> {
  const totalStart = Date.now();

  // Step 2: Select models
  const selectedModels = selectModels(model, intent);

  // Step 3: Execute selected models in parallel
  const executors: Promise<AiResponse>[] = [];
  for (const m of selectedModels) {
    switch (m) {
      case 'qwen':
        executors.push(ejecutarQwen(prompt, intent, context));
        break;
      case 'claude':
        executors.push(ejecutarClaude(prompt, intent, context));
        break;
      case 'gpt':
        executors.push(ejecutarGpt(prompt, intent, context));
        break;
    }
  }

  // Step 4: Receive responses
  const responses = await Promise.all(executors);

  // Step 5: Normalize outputs
  const normalized = normalizarRespuestas(responses);

  // Step 6: Combine/fuse responses
  const combined = selectedModels.length > 1 ? combinarRespuestas(normalized) : undefined;

  // Step 7: Select best response
  const winner = elegirMejor(normalized);

  const totalLatency = Date.now() - totalStart;

  return {
    input: prompt,
    intent,
    modelsUsed: selectedModels,
    responses,
    normalized,
    winner,
    combined,
    decision: combined || winner.text,
    totalLatency,
  };
}

// ─── Quick commands ────────────────────────────────────────────────────────

/** multi_ai → activar_orquestador() */
export async function multiAi(prompt: string, intent: Intent, context?: Record<string, unknown>) {
  return activarOrquestador(prompt, intent, 'multi_ai', context);
}

/** usar_qwen → ejecutar_qwen() */
export async function usarQwen(prompt: string, intent: Intent, context?: Record<string, unknown>) {
  return ejecutarQwen(prompt, intent, context);
}

/** usar_claude → ejecutar_claude() */
export async function usarClaude(prompt: string, intent: Intent, context?: Record<string, unknown>) {
  return ejecutarClaude(prompt, intent, context);
}

/** fusionar → combinar_respuestas() */
export { combinarRespuestas as fusionar };

/** decision_final → elegir_mejor() */
export { elegirMejor as decisionFinal };
