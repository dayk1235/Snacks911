/**
 * evaluateResponse.ts — Quantify correctness of bot responses.
 *
 * Pure scoring function with no side effects.
 * Isolated from bot logic — safe to use in test pipelines.
 */

export interface ExpectedOutput {
  intent: string;
  must_include: string[];
  must_not_include: string[];
}

export interface EvaluationDetails {
  intentMatch: boolean;
  includesCheck: boolean;
  excludesCheck: boolean;
}

export interface EvaluationResult {
  pass: boolean;
  score: number;
  details: EvaluationDetails;
}

/**
 * Evaluates a bot response against expected outputs.
 *
 * Scoring breakdown:
 *   - Intent match       → 40 pts
 *   - must_include hits  → 30 pts (all required keywords present)
 *   - must_not_include   → 30 pts (no prohibited keywords present)
 *   Total possible       → 100 pts
 *
 * @param response  - The actual bot response text
 * @param intent    - The detected intent from the bot
 * @param expected  - The expected output spec from the test case
 */
export function evaluateResponse(
  response: string,
  intent: string,
  expected: ExpectedOutput,
  products: any[] = []
): EvaluationResult {
  const normalizedResponse = response.toLowerCase();
  const productNames = products.map(p => (p.name || '').toLowerCase());
  const searchableText = `${normalizedResponse} ${productNames.join(' ')}`;

  // ── 1. Intent Match (40 pts) ──────────────────────────────────────────────
  const intentMatch = intent === expected.intent;

  // ── 2. must_include (30 pts) ──────────────────────────────────────────────
  // All required keywords must appear in the response
  const includesCheck = expected.must_include.every(keyword =>
    searchableText.includes(keyword.toLowerCase())
  );

  // ── 3. must_not_include (30 pts) ─────────────────────────────────────────
  // None of the prohibited keywords may appear in the response
  const excludesCheck = expected.must_not_include.every(keyword =>
    !searchableText.includes(keyword.toLowerCase())
  );

  // ── Score Accumulation ────────────────────────────────────────────────────
  let score = 0;
  if (intentMatch)   score += 40;
  if (includesCheck) score += 30;
  if (excludesCheck) score += 30;

  const pass = score === 100;

  return {
    pass,
    score,
    details: {
      intentMatch,
      includesCheck,
      excludesCheck,
    },
  };
}
