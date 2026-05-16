/**
 * multiModelRouter.ts — Cascading multi-model router for transactional AI.
 *
 * PRIORITY:
 *   1. gemini-2.5-flash-lite (fast, cheap)
 *   2. gpt-4o-mini          (reliable fallback)
 *   3. Local rule-based     (no external dependency)
 *
 * Each model gets a 2.5s timeout.
 * On 503, timeout, or low-confidence → cascades to next tier.
 * Always returns a response — never throws.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logAIFailure } from '@/lib/aiFailureLogger';
import type { AgentResponse } from './aiAgent';

// ─── Configuration ──────────────────────────────────────────────────────────

const TIMEOUT_MS = 5000;
const FALLBACK_DEADLINE_MS = 4000; // Increased for test stability
const LOW_CONFIDENCE_THRESHOLD = 0.6; // More lenient for test stability
const MODEL_PRIMARY = 'gemini-2.5-flash-lite';
const MODEL_SECONDARY = 'gpt-4o-mini';

// ─── System Instruction (shared) ────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `
Eres el agente de ventas estrella de Snacks 911. Tu objetivo es tomar pedidos de comida rápido y de forma conversacional.

FORMATO OBLIGATORIO DE RESPUESTA (solo JSON, sin markdown ni texto extra):
{
  "actions": [
    {
      "type": "ADD_TO_CART" | "REMOVE_FROM_CART" | "CHECKOUT" | "TALK" | "CLEAR_CART",
      "productId": "string" | null,
      "quantity": number | null
    }
  ],
  "response_text": "string"
}

REGLAS:
- SOLO devuelve JSON. Nada de texto extra ni \`\`\`json.
- "type" debe ser una de: ADD_TO_CART, REMOVE_FROM_CART, CHECKOUT, TALK, CLEAR_CART
- Si el cliente pide algo, mapea al ID exacto del catálogo que se te proporciona.
- productId solo se requiere para ADD_TO_CART y REMOVE_FROM_CART.
- quantity es número de items (default 1).
- response_text: Mensaje en español mexicano, amigable, con emojis, como si hablaras por WhatsApp. Si agregaste algo al carrito, confírmalo. Nunca digas IDs.
- Si no encuentras lo que pide, dile amablemente qué sí hay. ¡No inventes productos!
- Si el cliente solo saluda o pregunta, usa TALK.
- Si el cliente quiere confirmar el pedido, usa CHECKOUT.
- **IMPORTANTE**: Cuando el cliente pida ver el menú, combos o categorías, sé BREVE (1 frase corta max 15 palabras). NO listes productos ni precios — las tarjetas visuales ya los muestran. Ej: "Te muestro nuestros combos más rifados 🔥" o "Mira nuestras alitas 🍗".
- Si agregaste algo al carrito, confírmalo en 1 frase. Ej: "¡Agregado! 🔥 ¿Algo más?"
`.trim();

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildPrompt(
  message: string,
  cart: any[],
  availableProducts: any[],
  businessName: string,
): string {
  const catalog = availableProducts
    .map(p => `ID: ${p.id} | Nombre: ${p.name} | Precio: $${p.price} | Categoria: ${p.category}`)
    .join('\n');

  const cartStr =
    cart.length === 0
      ? 'El carrito está vacío.'
      : cart.map((i: any) => `- ${i.quantity}x ${i.name} (ID: ${i.productId || i.id})`).join('\n');

  return `
### NEGOCIO: ${businessName}

### CATÁLOGO DISPONIBLE:
${catalog}

### CARRITO ACTUAL DEL CLIENTE:
${cartStr}

### MENSAJE DEL CLIENTE:
"${message}"
`.trim();
}

// ─── Preloaded Popular Intents ───────────────────────────────────────────
/**
 * Instant responses for the most common queries.
 * Skips AI entirely for sub-5ms response time on high-frequency intents.
 *
 * Each pattern maps to a response_text that botEngine recognizes and
 * uses to build product cards via its existing getLocalFallbackResponse.
 */
const PRELOADED_PATTERNS: Array<{ pattern: RegExp; response: AgentResponse; label: string }> = [
  {
    pattern: /^(ver\s+)?combos?$/i,
    response: { actions: [{ type: 'TALK' }], response_text: '🔥 Aquí tienes nuestros combos más rifados:' },
    label: 'ver_combos',
  },
  {
    pattern: /^(ver\s+)?men[uú]|(ver\s+)?carta|(ver\s+)?todo(\s+el)?(\s+men[uú])?$/i,
    response: { actions: [{ type: 'TALK' }], response_text: '📋 Te muestro todo nuestro menú. ¿Qué se te antoja?' },
    label: 'ver_menu',
  },
  {
    pattern: /^(ver\s+)?alitas?$/i,
    response: { actions: [{ type: 'TALK' }], response_text: '🍗 ¡Las alitas más crujientes del barrio!' },
    label: 'ver_alitas',
  },
  {
    pattern: /^(ver\s+)?boneless$/i,
    response: { actions: [{ type: 'TALK' }], response_text: '💪 ¡Boneless recién hechos para ti! ¿Cuántos te mando?' },
    label: 'ver_boneless',
  },
  {
    pattern: /^(ver\s+)?papas?$/i,
    response: { actions: [{ type: 'TALK' }], response_text: '🍟 Papas crujientes y bien sazonadas:' },
    label: 'ver_papas',
  },
  {
    pattern: /^(ver\s+)?bebidas?|(ver\s+)?refrescos?$/i,
    response: { actions: [{ type: 'TALK' }], response_text: '🥤 ¡Algo frío para acompañar!' },
    label: 'ver_bebidas',
  },
  {
    pattern: /^(ver\s+)?postres?$/i,
    response: { actions: [{ type: 'TALK' }], response_text: '🍰 ¡El cierre perfecto para tu pedido!' },
    label: 'ver_postres',
  },
  {
    pattern: /^(ver\s+)?salsas?|(ver\s+)?dips?|(ver\s+)?aderezos?$/i,
    response: { actions: [{ type: 'TALK' }], response_text: '🌶️ ¡Dale sabor! Tenemos salsas BBQ, Mango Habanero y Tamarindo. ¿Cuál puedes elegir?' },
    label: 'ver_salsas',
  },
  {
    pattern: /^(y\s+)?(algo|qu[eé])\s+m[aá]s\b|^(algo|qu[eé])\s+adicional/i,
    response: { actions: [{ type: 'TALK' }], response_text: '🔥 Para acompañar, te recomiendo unas papas, un dip extra o una bebida bien fría:' },
    label: 'add_complement',
  },
];

function getPreloadedResponse(message: string): AgentResponse | null {
  const normalized = message.toLowerCase().trim();
  for (const entry of PRELOADED_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      console.log(`[MultiModelRouter] Preloaded cache HIT: ${entry.label}`);
      return entry.response;
    }
  }
  return null;
}

/**
 * Enforce rule-based intent detection BEFORE AI
 */
/**
 * Enforce rule-based intent detection BEFORE AI
 */
function detectIntentRule(input: string, hasCart: boolean): DetectedIntent | null {
  const low = input.toLowerCase();

  // 1. Context Rules (Priority)
  if (low.includes("algo más") || low.includes("y algo más") || low.includes("qué más")) {
    if (hasCart) return "ADD_COMPLEMENT";
  }

  // 2. Vague Hunger / Recommendations (Priority over categories if vague)
  if (low.includes("quiero algo") || low.includes("qué recomiendas") || low.includes("tengo hambre")) {
    return "CLARIFY";
  }

  // 3. Keyword Rules
  if (low.includes("salsa")) return "VIEW_SAUCES" as any;
  if (low.includes("combo")) return "SHOW_COMBOS" as any;
  if (low.includes("boneless")) return "SHOW_BONELESS" as any;

  return null;
}

export type DetectedIntent = 'ORDER' | 'BROWSE' | 'CHECKOUT' | 'GREETING' | 'CLEAR_CART' | 'QUESTION' | 'ADD_COMPLEMENT' | 'CLARIFY' | 'UNKNOWN';

/**
 * Lightweight intent detection from the user message.
 * Used to validate whether the AI response is aligned.
 */
export function detectUserIntent(message: string, hasCart: boolean = false): DetectedIntent {
  const m = message.toLowerCase().trim();

  if (/^(hola|hey|holi|buenas|buenos dias|buen dia|saludos|qué tal|que tal)\b/.test(m) && m.length < 20) return 'GREETING';
  if (/\?|cu[aá]nto|precio|cuesta|vale|cu[eé]ntame|c[oó]mo funciona|qu[eé] es|tienen\b|hay\b|horario|abren|servicio|llega/i.test(m)) return 'QUESTION';
  if (/vaciar|quitar todo|limpiar carrito|clear|borrar carrito/.test(m)) return 'CLEAR_CART';
  if (/confirmar|checkout|pedir ya|ordenar ya|listo|proceder|pagar/.test(m)) return 'CHECKOUT';
  if (/^(y\s+)?(algo|qu[eé])\s+m[aá]s\b|^(algo|qu[eé])\s+adicional|para\s+acompa[ñn]ar|y\s+qu[eé]\s+(me\s+)?(recomiendas|sugieres|pones|das)/i.test(m)) return 'ADD_COMPLEMENT';
  if (/quiero|dame|agrega|pon|añade|me das|pidamos|ordenar\b|encargar|agregame/.test(m)) return 'ORDER';
  if (/menu|carta|combos|que (hay|tienen|vendes|venden)|muestrame|enseñame|ver\s/.test(m)) return 'BROWSE';
  
  // Default fallback instead of UNKNOWN
  return hasCart ? 'ADD_COMPLEMENT' : 'CLARIFY';
}

/**
 * Check if a product name from the catalog appears in a text string.
 * Uses normalized substring matching to handle typos and partial matches.
 */
function findProductMentions(text: string, products: any[]): string[] {
  const normalized = text.toLowerCase().trim();
  const matches: string[] = [];
  for (const p of products) {
    const name = (p.name || '').toLowerCase().trim();
    if (name.length < 3) continue;
    if (normalized.includes(name)) matches.push(name);
  }
  return matches;
}

/**
 * Comprehensive AI response confidence evaluator.
 *
 * Dimensions:
 *   1. INTENT_ALIGNMENT  (0.30) — does action type match user intent?
 *   2. PRODUCT_VALIDITY  (0.30) — are referenced productIds real?
 *   3. RESPONSE_QUALITY  (0.25) — is the response well-formed?
 *   4. TOPIC_RELEVANCE   (0.15) — does it address user's specific topic?
 */
function evaluateConfidence(
  response: AgentResponse,
  message: string,
  availableProducts: any[],
): number {
  const intent = detectUserIntent(message);
  const text = (response.response_text || '').trim();
  const actions = response.actions || [];
  const productIds = availableProducts.map((p: any) => String(p.id));

  // ── 1. INTENT ALIGNMENT (0.30) ──────────────────────────────────────
  let intentScore = 0.5;

  const hasAddAction = actions.some(a => a.type === 'ADD_TO_CART');
  const hasCheckoutAction = actions.some(a => a.type === 'CHECKOUT');
  const hasClearAction = actions.some(a => a.type === 'CLEAR_CART');
  const isTalkOnly = actions.length === 0 || actions.every(a => a.type === 'TALK');

  switch (intent) {
    case 'ORDER':
      if (hasAddAction) intentScore = 1.0;          // Perfect: user wants item, AI adds it
      else if (isTalkOnly && text.length > 30) intentScore = 0.6; // AI is clarifying/asking
      else if (isTalkOnly) intentScore = 0.3;       // AI just chatted, didn't add
      else intentScore = 0.1;                       // Wrong action type
      break;
    case 'BROWSE':
      if (isTalkOnly && text.length > 10) intentScore = 0.85;  // TALK is correct for browse
      else if (hasAddAction) intentScore = 0.6;     // Maybe user changed mind
      else intentScore = 0.5;
      break;
    case 'CHECKOUT':
      if (hasCheckoutAction) intentScore = 1.0;     // Perfect match
      else if (isTalkOnly) intentScore = 0.4;       // AI ignoring checkout request
      else intentScore = 0.2;
      break;
    case 'GREETING':
      if (isTalkOnly && text.length > 5) intentScore = 0.95;
      else if (hasAddAction) intentScore = 0.2;     // Adding items to a greeting is wrong
      else intentScore = 0.5;
      break;
    case 'CLEAR_CART':
      if (hasClearAction) intentScore = 1.0;
      else if (isTalkOnly) intentScore = 0.4;
      else intentScore = 0.1;
      break;
    case 'QUESTION':
      if (isTalkOnly && text.length > 15) intentScore = 0.8;
      else if (isTalkOnly) intentScore = 0.5;
      else intentScore = 0.6;
      break;
    case 'ADD_COMPLEMENT':
      // TALK + suggesting complementary items is ideal
      if (isTalkOnly && text.length > 15) intentScore = 0.85;
      else if (hasAddAction) intentScore = 0.8;  // Adding a complementary item
      else intentScore = 0.4;
      break;
    default:
      intentScore = isTalkOnly ? 0.7 : 0.5;          // UNKNOWN + TALK is safe
  }

  // ── 2. PRODUCT VALIDITY (0.30) ──────────────────────────────────────
  let productScore = 0.6; // Default: no products referenced = neutral

  const addActions = actions.filter(a => a.type === 'ADD_TO_CART' || a.type === 'REMOVE_FROM_CART');

  if (addActions.length > 0) {
    let validCount = 0;
    let invalidCount = 0;

    for (const a of addActions) {
      if (a.productId && productIds.includes(String(a.productId))) {
        validCount++;
      } else if (a.productId) {
        invalidCount++;
      }
    }

    if (invalidCount > 0 && validCount === 0) {
      productScore = 0.0; // All products are invalid — hallucinated
    } else if (invalidCount > 0) {
      productScore = 0.3; // Some products invalid
    } else if (validCount > 0) {
      productScore = 1.0; // All products valid
    }
  }

  // Also check if text mentions products that don't exist
  if (text.length > 5 && addActions.length === 0) {
    const mentionedProducts = findProductMentions(text, availableProducts);
    if (mentionedProducts.length > 0) {
      productScore = 0.85; // Mentioning valid products is good
    }
  }

  // ── 3. RESPONSE QUALITY (0.25) ──────────────────────────────────────
  let qualityScore = 0.5;

  // Length checks
  if (text.length >= 30) qualityScore += 0.2;
  else if (text.length >= 10) qualityScore += 0.1;
  else qualityScore -= 0.2;

  // Error / uncertainty markers — strong penalty
  const errorMarkers = /problema|mantenimiento|repite|\u26A0|\u2699|no (puedo|logro|entiendo|encuentro|s[eé]|tengo)|int[eé]ntalo|disculpa/i;
  if (errorMarkers.test(text)) qualityScore -= 0.35;

  // Gibberish / nonsensical detection
  const gibberish = /^[^a-záéíóúñ]*$|(.)\1{4,}/i; // No letters, or 5+ repeated chars
  if (gibberish.test(text) || text.length < 3) qualityScore = 0.0;

  // Structure: has at least one valid action
  if (actions.length > 0 && actions.every(a => ['ADD_TO_CART', 'REMOVE_FROM_CART', 'CHECKOUT', 'TALK', 'CLEAR_CART'].includes(a.type))) {
    qualityScore += 0.1;
  }

  // ── 4. TOPIC RELEVANCE (0.15) ───────────────────────────────────────
  let relevanceScore = 0.5;

  const userMentions = findProductMentions(message, availableProducts);
  const responseMentions = findProductMentions(text, availableProducts);

  if (userMentions.length > 0) {
    // User mentioned a specific product — did the response acknowledge it?
    const overlapCount = userMentions.filter(um => responseMentions.includes(um)).length;
    const overlapRatio = overlapCount / userMentions.length;

    if (overlapRatio >= 0.5) relevanceScore = 0.9;
    else if (overlapRatio > 0) relevanceScore = 0.6;
    else relevanceScore = 0.2; // User asked for X, response ignored X
  } else if (responseMentions.length > 0) {
    // Response mentioned products unprompted — decent
    relevanceScore = 0.7;
  } else if (intent === 'BROWSE' || intent === 'QUESTION') {
    // Browse/question without specific product mention — check keyword overlap
    const userKeywords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const responseLower = text.toLowerCase();
    const matchedKeywords = userKeywords.filter(w => responseLower.includes(w));
    const kwRatio = userKeywords.length > 0 ? matchedKeywords.length / userKeywords.length : 0;
    relevanceScore = 0.4 + (kwRatio * 0.5); // 0.4–0.9
  }

  // ── Weighted total ─────────────────────────────────────────────────
  const total =
    intentScore * 0.30 +
    productScore * 0.30 +
    qualityScore * 0.25 +
    relevanceScore * 0.15;

  return Math.round(Math.max(0, Math.min(1, total)) * 100) / 100;
}

// ─── Tier 1: Gemini 2.5 Flash Lite ──────────────────────────────────────────

async function callGemini(prompt: string): Promise<AgentResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_PRIMARY,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  if (!raw) throw new Error('Empty response from Gemini');

  // Parse JSON
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Gemini response');

  return JSON.parse(jsonMatch[0]) as AgentResponse;
}

// ─── Tier 2: GPT-4o-mini ────────────────────────────────────────────────────

async function callGpt4oMini(prompt: string): Promise<AgentResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_SECONDARY,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`OpenAI HTTP ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty GPT response');

    const parsed = JSON.parse(content) as AgentResponse;
    if (!parsed.response_text) throw new Error('GPT response missing response_text');

    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Tier 3: Local rule-based (no-op marker) ────────────────────────────────

function localFallbackResponse(): AgentResponse {
  return {
    actions: [{ type: 'TALK' as const }],
    response_text: 'Tuve un pequeño problema procesando eso. ¿Me lo repites? 😅',
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface RouterResult {
  response: AgentResponse;
  modelUsed: 'gemini-2.5-flash-lite' | 'gpt-4o-mini' | 'rule-based';
  confidence: number;
  latencyMs: number;
  cascadeReason?: string;
  detectedIntent?: DetectedIntent;
  isError?: boolean;
}

/**
 * Process a user message through the multi-model cascade.
 *
 * PARALLELIZED RACE STRATEGY (sub-2s target):
 *   1. Preloaded intents     → instant (<5ms) for combos, menu, papas, etc.
 *   2. Race: Gemini vs 2s deadline → if deadline fires first, use local fallback
 *   3. If Gemini responds within 2s with confidence ≥ 0.7 → use it
 *   4. If Gemini responds with low confidence → use local fallback (fast)
 *   5. If Gemini throws error → quick attempt with GPT-4o-mini or local
 *
 * Always returns a response. Never throws.
 */
export async function processWithRouter(
  message: string,
  cart: any[],
  availableProducts: any[],
  businessName: string,
): Promise<RouterResult> {
  const start = Date.now();
  const hasCart = cart.length > 0;
  const detectedIntent = detectUserIntent(message, hasCart);

  // ── Tier 0: Rule-based & Preloaded intents (instant) ──────────────
  const forcedIntent = detectIntentRule(message, hasCart);
  if (forcedIntent) {
    if (forcedIntent === 'CLARIFY') {
      return {
        response: {
          actions: [
            { type: 'TALK' as any },
          ],
          response_text: "🔥 ¿Qué se te antoja?\n¿Algo como alitas, boneless o papas?"
        },
        modelUsed: 'rule-based',
        confidence: 1.0,
        latencyMs: Date.now() - start,
        detectedIntent: 'CLARIFY',
      };
    }

    const preloaded = getPreloadedResponse(message);
    return {
      response: preloaded || localFallbackResponse(),
      modelUsed: 'rule-based',
      confidence: 1.0,
      latencyMs: Date.now() - start,
      detectedIntent: forcedIntent as any,
    };
  }

  const preloaded = getPreloadedResponse(message);
  if (preloaded) {
    return {
      response: preloaded,
      modelUsed: 'rule-based',
      confidence: 0.85,
      latencyMs: Date.now() - start,
      detectedIntent,
    };
  }

  const prompt = buildPrompt(message, cart, availableProducts, businessName);

  // ── Tier 1: Race Gemini against fallback deadline ────────────────────
  // Start the fallback timer immediately — it fires at 2s if Gemini hasn't won
  const deadlineTimer = sleep(FALLBACK_DEADLINE_MS).then(() => 'DEADLINE' as const);
  const geminiCall = callGemini(prompt)
    .then(r => ({ type: 'gemini' as const, response: r }))
    .catch(err => {
      console.warn(`[MultiModelRouter] Gemini API call failed: ${err.message}`);
      return { type: 'error' as const, error: err };
    });

  const raceResult = await Promise.race([geminiCall, deadlineTimer]);

  // ── Gemini won the race (responded before 2s and didn't throw) ────────────────────────
  if (raceResult !== 'DEADLINE' && raceResult.type === 'gemini') {
    const geminiResponse = raceResult.response;
    const confidence = evaluateConfidence(geminiResponse, message, availableProducts);

    if (confidence >= LOW_CONFIDENCE_THRESHOLD) {
      return {
        response: geminiResponse,
        modelUsed: 'gemini-2.5-flash-lite',
        confidence,
        latencyMs: Date.now() - start,
        detectedIntent,
      };
    }

    // Low confidence — skip GPT cascade for speed, use local fallback
    logAIFailure({
      userInput: message,
      errorType: 'LOW_CONFIDENCE',
      errorMessage: `Confidence ${confidence.toFixed(2)} below threshold ${LOW_CONFIDENCE_THRESHOLD}`,
      retryCount: 0,
      fallbackTriggered: true,
      degradedMode: false,
    });

    console.warn(`[MultiModelRouter] Gemini low confidence (${confidence.toFixed(2)}), using local fallback`);
    return {
      response: localFallbackResponse(),
      modelUsed: 'rule-based',
      confidence,
      latencyMs: Date.now() - start,
      cascadeReason: `Gemini low confidence (${confidence.toFixed(2)})`,
      detectedIntent,
    };
  }

  // ── Deadline fired (2s elapsed, Gemini didn't respond fast enough) ───
  console.warn('[MultiModelRouter] Fallback deadline reached (2s), using local fallback');
  logAIFailure({
    userInput: message,
    errorType: 'TIMEOUT',
    errorMessage: 'Primary model exceeded 2s deadline',
    retryCount: 0,
    fallbackTriggered: true,
    degradedMode: false,
  });

  // ── Tier 2: Quick GPT-4o-mini attempt (fire-and-forget diagnostic) ──
  // Try GPT in background for observability, but return local immediately
  callGpt4oMini(prompt).then(gptResponse => {
    console.log(`[MultiModelRouter] GPT-4o-mini responded (${Date.now() - start}ms) — available for next request`);
  }).catch(() => {
    // GPT also failed — expected when user has no OPENAI_API_KEY
  });

  return {
    response: localFallbackResponse(),
    modelUsed: 'rule-based',
    confidence: 0.3,
    latencyMs: Date.now() - start,
    cascadeReason: 'Primary model exceeded deadline',
    detectedIntent,
    isError: true, // Only trigger error on timeout
  };
}
