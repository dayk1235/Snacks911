import { GoogleGenerativeAI } from '@google/generative-ai';
import { getKnowledgeContext } from "@/lib/ai/obsidianSync";
import { logAIFailure } from "@/lib/aiFailureLogger";

/**
 * core/ai/aiAgent.ts
 * 
 * Cerebro transaccional. Usa Gemini 2.5 Flash Lite con systemInstruction
 * y JSON parsing robusto (regex + auto-corrección).
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL = 'gemini-2.5-flash-lite';

export interface AgentAction {
  type: 'ADD_TO_CART' | 'REMOVE_FROM_CART' | 'CHECKOUT' | 'TALK' | 'CLEAR_CART';
  productId?: string;
  quantity?: number;
}

export interface AgentResponse {
  actions: AgentAction[];
  response_text: string;
}

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

export async function processTransaction(
  message: string, 
  cart: any[], 
  availableProducts: any[],
  businessName: string
): Promise<AgentResponse> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[AIAgent] Missing GEMINI_API_KEY');
    return {
      actions: [{ type: 'TALK' }],
      response_text: "⚙️ Estamos en mantenimiento. Vuelve en unos minutos. 🙏"
    };
  }

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const catalog = availableProducts.map(p => 
    `ID: ${p.id} | Nombre: ${p.name} | Precio: $${p.price} | Categoria: ${p.category}`
  ).join('\n');

  const cartStr = cart.length === 0 
    ? 'El carrito está vacío.' 
    : cart.map((i: any) => `- ${i.quantity}x ${i.name} (ID: ${i.productId || i.id})`).join('\n');

  const knowledge = await getKnowledgeContext();

  const prompt = `
### NEGOCIO: ${businessName}

### CONTEXTO (REGLAS Y PROMOS):
${knowledge || 'Sin reglas adicionales.'}

### CATÁLOGO DISPONIBLE:
${catalog}

### CARRITO ACTUAL DEL CLIENTE:
${cartStr}

### MENSAJE DEL CLIENTE:
"${message}"
`.trim();

  // ─── Retry Logic with Exponential Backoff ────────────────────────────────
  const MAX_RETRIES = 3;
  const BACKOFF_DELAYS = [500, 1000, 2000]; // ms

  const isRetryableError = (err: any): boolean => {
    const msg = String(err?.message || err || '');
    return msg.includes('503') || 
           msg.includes('overloaded') || 
           msg.includes('UNAVAILABLE') ||
           msg.includes('rate limit') ||
           msg.includes('quota');
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const callAI = async (): Promise<AgentResponse> => {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    if (!raw) throw new Error('Empty response from AI model');

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in AI response');
      return JSON.parse(jsonMatch[0]) as AgentResponse;
    } catch (parseErr) {
      console.warn('[AIAgent] Invalid JSON, attempting auto-correction...', raw.substring(0, 200));

      const correctionPrompt = `
Corrige este texto para que sea un JSON válido con exactamente esta estructura:
{
  "actions": [{"type": "TALK"}],
  "response_text": "string"
}

IMPORTANTE: SOLO devuelve JSON. Sin markdown, sin explicaciones.

Texto a corregir:
"""
${raw}
"""
`.trim();

      const correctionResult = await model.generateContent(correctionPrompt);
      const correctedRaw = correctionResult.response.text().trim();
      const correctedMatch = correctedRaw.match(/\{[\s\S]*\}/);

      if (!correctedMatch) throw new Error('Auto-correction failed to produce JSON');

      return JSON.parse(correctedMatch[0]) as AgentResponse;
    }
  };

  // ─── Execute with retries ─────────────────────────────────────────────────
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callAI();
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      const isLast = attempt === MAX_RETRIES;

      // Classify error type for logging
      const errorType =
        errMsg.includes('503') || errMsg.includes('UNAVAILABLE') ? '503_UNAVAILABLE' :
        errMsg.includes('overloaded') ? '503_OVERLOADED' :
        errMsg.includes('rate limit') || errMsg.includes('quota') ? 'RATE_LIMIT' :
        errMsg.includes('API key') || errMsg.includes('401') || errMsg.includes('403') ? 'AUTH_ERROR' :
        errMsg.includes('JSON') || errMsg.includes('Unexpected token') ? 'JSON_PARSE' :
        errMsg.includes('Empty response') ? 'EMPTY_RESPONSE' :
        'UNKNOWN';

      if (isRetryableError(error) && !isLast) {
        const delay = BACKOFF_DELAYS[attempt];
        console.warn(`[AIAgent] Attempt ${attempt + 1} failed (retryable). Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Final failure — log it
      logAIFailure({
        userInput: prompt.slice(prompt.indexOf('"MENSAJE DEL CLIENTE"') + 22, prompt.indexOf('"MENSAJE DEL CLIENTE"') + 100).replace(/["\n]/g, '').trim(),
        errorType,
        errorMessage: errMsg.slice(0, 200),
        retryCount: attempt,
        fallbackTriggered: false, // botEngine sets this after the fact
        degradedMode: false,      // botEngine checks this
      });

      // Non-retryable or exhausted retries
      console.error('[AIAgent] Error processing transaction:', errMsg);

      if (errorType === 'AUTH_ERROR') {
        return {
          actions: [{ type: 'TALK' }],
          response_text: "⚙️ Estamos en mantenimiento. Vuelve en unos minutos. 🙏"
        };
      }

      return {
        actions: [{ type: 'TALK' }],
        response_text: "Tuve un pequeño problema procesando eso. ¿Me lo repites? 😅"
      };
    }
  }

  // Fallback (should never reach here)
  return {
    actions: [{ type: 'TALK' }],
    response_text: "Tuve un pequeño problema procesando eso. ¿Me lo repites? 😅"
  };
}
