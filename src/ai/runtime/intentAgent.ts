import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL = 'gemini-2.5-flash-lite';

export interface IntentResponse {
  intent: string;
  producto: string | null;
}

const SYSTEM_PROMPT = `
Eres un clasificador de intenciones para Snacks 911 (comida rápida).
Tu única tarea es analizar el mensaje del usuario y devolver un JSON estricto.

FORMATO OBLIGATORIO:
{
  "intent": "saludo" | "menu" | "combos" | "producto" | "recomendacion" | "upsell" | "confirmar" | "pedido" | "cancelar" | "test_ai" | "otro",
  "producto": "string" | null
}

REGLAS:
- SOLO devuelve JSON. Nada de texto extra ni formato markdown (sin \`\`\`json).
- "intent" debe ser una de las palabras clave de arriba.
- "producto" debe ser el nombre del producto mencionado (ej: "boneless", "papas") o null si no se menciona ninguno.
- Si el usuario escribe "test", "ai" o "prueba ai", devuelve SIEMPRE: { "intent": "test_ai", "producto": null }
`.trim();

/**
 * Detecta la intención de un mensaje usando Gemini 2.5 Flash Lite.
 * @param message El mensaje crudo del usuario.
 * @returns Un objeto con la intención y el producto extraído.
 */
export async function detectIntent(message: string): Promise<IntentResponse> {
  if (!message.trim()) {
    return { intent: 'vacio', producto: null };
  }

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  try {
    const result = await model.generateContent(`Mensaje: "${message}"`);
    const raw = result.response.text().trim();

    try {
      // Intentar extraer el JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent ?? 'otro',
        producto: parsed.producto ?? null,
      };
    } catch (parseError) {
      console.warn('[intentAgent] JSON inválido. Intentando auto-corrección...', raw);
      
      // Auto-corrección si el JSON vino roto o con texto extra
      const correctionPrompt = `
Extrae estrictamente el JSON de este texto y arréglalo si está roto. No uses markdown.
Formato: { "intent": "string", "producto": "string" | null }
Texto: """${raw}"""
`.trim();

      const correctionResult = await model.generateContent(correctionPrompt);
      const correctedRaw = correctionResult.response.text().trim();
      const correctedMatch = correctedRaw.match(/\{[\s\S]*\}/);
      
      if (!correctedMatch) throw new Error('Falló la auto-corrección');
      const correctedParsed = JSON.parse(correctedMatch[0]);
      
      return {
        intent: correctedParsed.intent ?? 'otro',
        producto: correctedParsed.producto ?? null,
      };
    }
  } catch (error) {
    console.error('[intentAgent] Error al detectar intención:', error);
    // Fallback seguro en caso de error de red o timeout
    return { intent: 'error', producto: null };
  }
}
