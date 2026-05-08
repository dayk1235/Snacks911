/**
 * core/nluBaseline.ts — Single source of truth for greeting detection.
 *
 * isGreetingOnly: returns TRUE only when the ENTIRE user message
 * is a pure greeting with NO purchase intent, product mention, or
 * substantive content.
 *
 * This replaces the scattered greeting checks across botEngine,
 * responseEngine, and intentDetector.
 */

const GREETING_ONLY_WORDS = new Set([
  'hola',
  'holi',
  'hey',
  'hi',
  'buenas',
  'buenos dias',
  'buenas tardes',
  'buenas noches',
  'qué tal',
  'que tal',
  'saludos',
  'buen dia',
]);

const GREETING_PREFIXES = [
  'hola',
  'hey',
  'holi',
  'buenas',
  'buenos dias',
  'buen dia',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns true ONLY when the message is a pure greeting.
 * "hola, quiero papas" → false (has purchase content)
 * "hola"              → true
 * "buenas tardes"     → true
 * "hey, qué tienes?"  → false (has question)
 */
export function isGreetingOnly(text: string): boolean {
  const n = normalize(text);

  if (GREETING_ONLY_WORDS.has(n)) return true;

  for (const prefix of GREETING_PREFIXES) {
    if (n.startsWith(prefix + ' ')) return false;
  }

  if (GREETING_PREFIXES.some(p => n === p)) return true;

  return false;
}

/**
 * Returns true when the message STARTS with a greeting word,
 * regardless of what follows. Used to block ADD_TO_CART
 * when the user is just saying hi.
 */
export function startsWithGreeting(text: string): boolean {
  const n = normalize(text);
  return GREETING_PREFIXES.some(p => n.startsWith(p));
}