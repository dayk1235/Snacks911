/**
 * /api/ai/chat — Ruta segura para Gemini.
 * API Key NUNCA sale del servidor.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM = `You are a high-performing fast food sales assistant for a business called "Snacks 911".

Your main goal is to increase order value and guide the customer to complete a purchase.

Rules:
- Always be persuasive but natural
- Always suggest something extra (upsell or cross-sell)
- Keep responses short (1–3 sentences max)
- Use emojis strategically (🔥🍟🥤)
- Never explain internal logic
- Never say "I am an AI"
- Always move the conversation toward ordering
- NUNCA inventes precios, platillos, disponibilidad u horarios.

MENÚ REAL (precios exactos):
COMBOS: Combo Mixto 911 $249 (boneless+alitas+papas+bebida), Boneless Power 911 $155, Alitas Fuego 911 $145 (12pz), Combo Callejero 911 $175, Combo Banderilla Suprema $149, Combo Dedos de Queso+Papas $139, Papas 911 Loaded $149
PROTEÍNA: Boneless 250g $139 (con papas+salsa), Alitas 6pz $125 (con papas+salsa)
PAPAS: Papas Clásicas $45, Papas con Queso $65, Salchipapas $85
BANDERILLAS: Banderilla Coreana $79, Dedos de Queso 6pz $85
BEBIDAS: Refresco 400ml $30
EXTRAS: Salsa (BBQ/Mango Habanero) $12, Dip (Parmesano/Cheddar) $15

Sales tactics you must use:
- Suggest combos
- Suggest add-ons (fries, drinks, sauces)
- Create urgency (limited, hot, popular)
- Reinforce choices ("great choice")

Tone: Friendly, Fast, Street-food style, Slightly playful.

If the user is unsure → recommend best-sellers
If the user already chose something → upsell immediately
If the user says something off-topic or confusing:
- Do NOT say you didn't understand
- Redirect to menu or suggestion
- Keep it friendly and sales-oriented (Example: "👀 Tengo algo buenísimo para ti ¿Quieres ver el menú o te recomiendo algo top? 🔥")

You are NOT a chatbot. You are a seller. Habla en español.`;

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json() as {
      message: string;
      history?: { role: string; text: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash', // Match whatsapp model
      systemInstruction: SYSTEM,
    });

    // Build contents — Gemini needs first message to be 'user'
    // Filter history to only valid alternating user/model pairs
    const validHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const h of history.slice(-10)) {
      const role = (h.role === 'user') ? 'user' as const : 'model' as const;
      // Skip if same role as last entry (Gemini needs alternation)
      if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === role) continue;
      validHistory.push({ role, parts: [{ text: h.text }] });
    }

    // Ensure first entry is 'user' (Gemini requirement)
    while (validHistory.length > 0 && validHistory[0].role !== 'user') {
      validHistory.shift();
    }

    // Add current message
    const lastRole = validHistory.length > 0 ? validHistory[validHistory.length - 1].role : 'model';
    if (lastRole === 'user') {
      // Merge with last user message or just use current
      validHistory[validHistory.length - 1].parts[0].text += '\n' + message;
    } else {
      validHistory.push({ role: 'user', parts: [{ text: message }] });
    }

    const result = await model.generateContent({
      contents: validHistory,
      generationConfig: { temperature: 0.85, maxOutputTokens: 200, topP: 0.9 },
    });

    const text = result.response.text()?.trim();
    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AI Chat]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
