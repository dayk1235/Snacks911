/**
 * aiService.ts
 * 20% layer — calls Gemini with strict guardrails.
 * The AI only "writes" responses; all prices/products come from DB.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL  = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// ── Types ──────────────────────────────────────────────────────────────────
export interface MenuItemContext {
  name: string;
  price: number;
  category: string;
  description?: string;
  best_seller?: boolean;
}

export interface AIContext {
  menu_items: MenuItemContext[];
  modifiers: { type: string; name: string; price: number }[];
  announcements_active: string[];
  promos_active: string[];
  cart_state: { product: string; qty: number; unit_price: number }[];
  customer_message: string;
}

export interface AIResponse {
  message_to_user: string;
  intent_suggestion: 'RECOMMEND' | 'UPSELL' | 'ASK_MISSING_INFO' | 'HANDOFF';
  missing_fields?: string[];
}

// ── System Prompt (Guardrails) ─────────────────────────────────────────────
const SYSTEM_PROMPT = `
Eres el experto de ventas digital de Snacks 911. Eres breve, directo y persuasivo.
Tu objetivo: guiar al cliente hacia el mejor pedido y aumentar el ticket promedio.

REGLAS ABSOLUTAS (nunca las rompas):
1. NUNCA inventes precios, productos, disponibilidad u horarios.
2. Solo menciona productos que existen en MENU_CONTEXT.
3. Si no tienes un dato → di "déjame verificar" pero NUNCA inventes.
4. Siempre intenta cerrar con: resumen del pedido + pregunta de confirmación.
5. Prioriza productos marcados como best_seller cuando hagas recomendaciones.
6. Mensajes cortos: máximo 3 oraciones. Bullets si hay lista. Emoji mínimo (1-2 por respuesta).
7. Si el cliente está molesto, hay queja, o pides algo fuera del menú → responde ÚNICAMENTE con el JSON de handoff.

RESPONDE SIEMPRE en este JSON (nada más):
{
  "message_to_user": "texto para el cliente",
  "intent_suggestion": "RECOMMEND|UPSELL|ASK_MISSING_INFO|HANDOFF",
  "missing_fields": ["campo_faltante"] // solo si aplica
}

Para handoff responde:
{ "message_to_user": "Ya te apoyo con eso 🙌 Te paso con alguien que puede resolverlo rápido. ¿Me confirmas tu nombre?", "intent_suggestion": "HANDOFF" }
`.trim();

// ── Main AI call ───────────────────────────────────────────────────────────
export async function getAIResponse(context: AIContext): Promise<AIResponse> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  const contextPayload = `
MENU_CONTEXT:
${JSON.stringify({
  menu_items: context.menu_items,
  modifiers: context.modifiers,
  announcements_active: context.announcements_active,
  promos_active: context.promos_active,
  cart_state: context.cart_state,
}, null, 2)}

MENSAJE DEL CLIENTE:
"${context.customer_message}"
`.trim();

  try {
    const result = await model.generateContent(contextPayload);
    const raw = result.response.text().trim();

    // Parse JSON response from AI
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');

    const parsed = JSON.parse(jsonMatch[0]) as AIResponse;
    return parsed;
  } catch (err) {
    console.error('[aiService] Gemini error:', err);
    // Safe fallback — don't crash the bot
    return {
      message_to_user: 'Permíteme un momento para revisar eso. ¿Me puedes decir qué producto te interesa? 🔥',
      intent_suggestion: 'ASK_MISSING_INFO',
    };
  }
}

// ── Build context payload from DB data ────────────────────────────────────
export function buildContextPayload(
  products: MenuItemContext[],
  modifiers: { type: string; name: string; price: number }[],
  announcements: string[],
  promos: string[],
  cart: { product: string; qty: number; unit_price: number }[],
  message: string
): AIContext {
  return {
    menu_items: products,
    modifiers,
    announcements_active: announcements,
    promos_active: promos,
    cart_state: cart,
    customer_message: message,
  };
}
