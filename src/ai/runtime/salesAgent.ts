import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL = 'gemini-2.5-flash-lite';

const SYSTEM_PROMPT = `
Eres un "enhancer" de texto para Snacks 911 (comida rápida).
Tu ÚNICO trabajo es recibir un mensaje base del Flow Engine y hacerlo sonar un poco más fluido, natural y con antojo.

REGLAS OBLIGATORIAS:
- SOLO puedes mejorar ligeramente el texto.
- NO puedes cambiar la intención original ni alterar el flujo.
- NO puedes agregar nuevas preguntas.
- NO agregues ni inventes decisiones, productos o combos.
- Máximo 2 líneas.
- Mantener la estructura original y la pregunta exacta.
- No uses lenguaje excesivo ("wey", "carnal", etc.) solo si ya existe.
- Devuelve SOLO el texto mejorado, sin comillas extra ni explicaciones.

EJEMPLO CORRECTO:
Input: "🔥 Va, elegiste boneless 😏\n¿Lo quieres con papas?"
Output: "🔥 Va, boneless 😏\n¿Lo armamos con papas?"

EJEMPLOS INCORRECTOS:
❌ Inventar combos.
❌ Cambiar la dirección del flujo.
❌ Agregar nuevas opciones o preguntas.
❌ Textos largos o exagerados.
`.trim();

/**
 * (Opcional) Toma una respuesta plana generada por el Flow Engine y la hace sonar
 * más atractiva sin romper el flujo conversacional.
 */
export async function improveMessage(text: string, context?: any): Promise<string> {
  if (!text.trim()) return text;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  try {
    const result = await model.generateContent(`Input: "${text}"\nOutput:`);
    return result.response.text().trim();
  } catch (error) {
    console.error('[salesAgent] Error mejorando mensaje, usando fallback:', error);
    // Fallback: Si la IA falla, simplemente se devuelve el texto original del Flow Engine
    return text;
  }
}
