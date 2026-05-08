/**
 * AI Security Utility
 * Prevents prompt injection and sanitizes tenant-defined configurations.
 */

const MAX_PROMPT_LENGTH = 2000;
const MIN_PROMPT_LENGTH = 10;

const DANGEROUS_KEYWORDS = [
  'ignore previous instructions',
  'bypass',
  'override',
  'system:',
  'user:',
  'assistant:',
  'dan mode',
  'jailbreak',
  'root access',
  'sql injection',
  'javascript:',
  '<script'
];

const DEFAULT_SAFE_PROMPT = 'Eres un asistente virtual amable enfocado en ayudar al cliente con su pedido.';

/**
 * Validates and sanitizes a tenant-defined personality prompt.
 */
export function sanitizePrompt(input: string | null | undefined): string {
  if (!input || input.trim().length < MIN_PROMPT_LENGTH) {
    return DEFAULT_SAFE_PROMPT;
  }

  let sanitized = input.trim();

  // 1. Length Restriction
  if (sanitized.length > MAX_PROMPT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_PROMPT_LENGTH);
  }

  // 2. Keyword Filtering (Case-insensitive)
  for (const keyword of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(keyword, 'gi');
    if (regex.test(sanitized)) {
      console.warn(`[AI SECURITY] Dangerous keyword detected and removed: ${keyword}`);
      sanitized = sanitized.replace(regex, '[removed]');
    }
  }

  // 3. Structural Cleaning
  // Remove markdown headers or blockquotes that could trick the LLM
  sanitized = sanitized.replace(/^#+/gm, ''); 
  sanitized = sanitized.replace(/^>+/gm, '');

  // 4. Final check - if too much was removed or it's empty, use fallback
  if (sanitized.length < MIN_PROMPT_LENGTH) {
    return DEFAULT_SAFE_PROMPT;
  }

  return sanitized;
}

/**
 * Validation rules for UI forms
 */
export const PromptValidationRules = {
  required: true,
  minLength: MIN_PROMPT_LENGTH,
  maxLength: MAX_PROMPT_LENGTH,
  pattern: /^[a-zA-Z0-9\s.,!?¡¿áéíóúÁÉÍÓÚñÑ]+$/, // Basic alphanumeric + common Spanish chars
  message: 'El prompt debe ser seguro y no contener comandos de sistema.'
};
