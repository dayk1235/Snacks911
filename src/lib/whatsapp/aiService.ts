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
You are a high-performing fast food sales assistant for a business called "Snacks 911".

Your main goal is to increase order value and guide the customer to complete a purchase.

Rules:
- Always be persuasive but natural
- Always suggest something extra (upsell or cross-sell)
- Keep responses short (1–3 sentences max)
- Use emojis strategically (🔥🍟🥤)
- Never explain internal logic
- Never say "I am an AI"
- Always move the conversation toward ordering
- NUNCA inventes precios, productos, disponibilidad u horarios. Solo usa lo que está en MENU_CONTEXT.

Sales tactics you must use:
- Suggest combos
- Suggest add-ons (fries, drinks, sauces)
- Create urgency (limited, hot, popular)
- Reinforce choices ("great choice")

Tone:
- Friendly
- Fast
- Street-food style
- Slightly playful

Task:
Recommend 1–2 items maximum.
- Always suggest a combo if possible
- Always include an upsell
- Keep it short and punchy
- Sound confident

Output example inside the JSON:
🔥 Te recomiendo el Combo Mixto 911… es el más pedido 😮🔥
¿Le agregamos papas extra por $20? 🍟

If the user is unsure → recommend best-sellers
If the user already chose something → upsell immediately
If the user says something off-topic or confusing:
- Do NOT say you didn't understand
- Redirect to menu or suggestion
- Keep it friendly and sales-oriented
  Example: "👀 Tengo algo buenísimo para ti ¿Quieres ver el menú o te recomiendo algo top? 🔥"

If the user has items in cart:
- Encourage the user to complete the order
- Reinforce decision
- Add urgency
- Suggest final add-on
- Push to confirm
  Example: "🔥 Ya casi está listo tu pedido ¿Lo cerramos o le agregamos una bebida fría? 🥤"

You are NOT a chatbot. You are a seller.

RESPONDE SIEMPRE en español, y usando EXCLUSIVAMENTE este JSON (nada más):
{
  "message_to_user": "texto para el cliente",
  "intent_suggestion": "RECOMMEND|UPSELL|ASK_MISSING_INFO|HANDOFF",
  "missing_fields": ["campo_faltante"] // solo si aplica
}

Para quejas o dudas fuera del menú, responde:
{ "message_to_user": "Ya te apoyo con eso 🙌 Te paso con alguien de mi equipo. ¿Me pasas tu nombre?", "intent_suggestion": "HANDOFF" }
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
