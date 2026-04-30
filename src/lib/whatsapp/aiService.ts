/**
 * aiService.ts
 * 20% layer — calls Gemini with strict guardrails.
 * The AI only "writes" responses; all prices/products come from DB.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL  = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

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
  intent?: string;
  entities?: Record<string, any>;
  message_to_user: string;
  intent_suggestion: 'RECOMMEND' | 'UPSELL' | 'ASK_MISSING_INFO' | 'HANDOFF';
  missing_fields?: string[];
}

// ── System Prompt (Guardrails) ─────────────────────────────────────────────
const SYSTEM_PROMPT = `
Eres el motor de inteligencia de un chatbot de ventas para Snacks 911 (comida rápida en México).

Tu tarea es analizar el mensaje del usuario y responder SOLO con un JSON válido.

IMPORTANTE: Tu respuesta será procesada automáticamente. Si no cumples el formato EXACTO, el sistema fallará.

---

OBJETIVO:
- Detectar intención
- Extraer datos clave
- Generar mensaje de venta corto y efectivo

---

INTENTS PERMITIDOS:
["menu","combos","producto","armar_combo","pedido","recomendacion","upsell","confirmar","cancelar","saludo","horario","ubicacion","otro","handoff"]

---

FORMATO OBLIGATORIO:

Responde EXACTAMENTE así:

{
  "intent": "string",
  "entities": {},
  "suggestion": "string",
  "message_to_user": "string"
}

---

REGLAS CRÍTICAS:

- SOLO JSON (sin texto antes o después)
- NO usar \`\`\`json ni markdown
- SIEMPRE incluir "message_to_user"
- SIEMPRE incluir "intent"
- SIEMPRE incluir "suggestion"
- "entities" debe existir aunque esté vacío: {}
- Si el usuario pide hablar con humano o tiene queja grave → intent: "handoff"

---

REGLAS DE message_to_user:

- máximo 2 líneas
- tono casual mexicano
- enfocado en vender
- SIEMPRE terminar con pregunta o acción

---

GUARDRAILS:

- Si el usuario rechazó un upsell en el turno anterior, NO repetir upsell en este turno
- Máximo 1 sugerencia por turno (combo o upsell, nunca ambos)
- Evitar mensajes largos: directo, natural y breve

---

REGLAS DE ENTITIES:

- Si no hay datos → usar {}
- NO inventar datos

---

COMPORTAMIENTO:

- saludo → llevar a combos
- indeciso → recomendar 1 combo
- producto → confirmar + upsell
- pedido → avanzar compra
- otro → guiar a menú

---

EJEMPLOS:

Usuario: hola

{
  "intent": "saludo",
  "entities": {},
  "suggestion": "ofrecer combos",
  "message_to_user": "¡Qué onda! 🔥\\nTe recomiendo el Combo Mixto 911, ¿te lo armo?"
}

---

Usuario: quiero boneless bbq

{
  "intent": "producto",
  "entities": {
    "producto": "boneless",
    "salsa": "bbq"
  },
  "suggestion": "agregar papas",
  "message_to_user": "Va ese boneless BBQ 😏\\n¿Le sumo papas loaded para dejarlo completo?"
}

---

Usuario: que tienes

{
  "intent": "menu",
  "entities": {},
  "suggestion": "mostrar combos",
  "message_to_user": "Si quieres ir a la segura, pídete el Boneless Power 🔥\\n¿Te lo preparo?"
}

---

Si el mensaje es confuso:

{
  "intent": "otro",
  "entities": {},
  "suggestion": "guiar",
  "message_to_user": "Te ayudo rápido 🙌\\n¿Prefieres que te recomiende un combo?"
}
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

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in AI response');
      return JSON.parse(jsonMatch[0]) as AIResponse;
    } catch (parseErr) {
      console.warn('[aiService] Formato JSON inválido. Iniciando auto-corrección...', raw);
      
      const correctionPrompt = `
Corrige este texto para que sea un JSON válido.

IMPORTANTE:
- SOLO devuelve JSON
- SIN texto extra
- SIN explicaciones
- Mantén exactamente estos campos:

{
  "intent": "string",
  "entities": {},
  "suggestion": "string",
  "message_to_user": "string"
}

Texto a corregir:
"""
${raw}
"""
`.trim();

      const correctionResult = await model.generateContent(correctionPrompt);
      const correctedRaw = correctionResult.response.text().trim();
      const correctedMatch = correctedRaw.match(/\{[\s\S]*\}/);
      if (!correctedMatch) throw new Error('Auto-correction failed to produce JSON');
      
      return JSON.parse(correctedMatch[0]) as AIResponse;
    }
  } catch (err) {
    console.error('[aiService] Gemini error (or correction failed):', err);
    // Safe fallback — don't crash the bot
    return {
      intent: 'otro',
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

// ── Embellish Static Messages ──────────────────────────────────────────────
export async function rewriteMessage(rawMessage: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = `
Base message:
"${rawMessage}"

Task:
Rewrite this message to sound more appetizing and persuasive.

Rules:
- Add emotion
- Add food appeal
- Add 1 upsell suggestion
- Keep it short
- Use emojis

Do NOT change meaning, only improve it.
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('[aiService] rewriteMessage error:', err);
    return rawMessage; // Safe fallback
  }
}
