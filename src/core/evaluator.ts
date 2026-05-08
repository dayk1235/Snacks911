export type EvalCase = {
  input: string
  expectedIntent: string
  expectedCartCount?: number
}

export type EvalResult = {
  intentAccuracy: number
  cartAccuracy: number
  /** Ratio of CONFIRM_ORDER cases that were actually reached */
  flowCompletion: number
  /** Ratio of upsell prompts (shown by bot) that were accepted on the next turn */
  upsellSuccess: number
  total: number
}

type RunResult = {
  intent: string
  cartCount: number
  text: string
}

// Patterns that indicate the bot showed an upsell offer
const UPSELL_PATTERNS = [
  /¿Le agregamos papas/i,
  /Te conviene el combo/i,
  /🔥.*papas/i,
  /😏.*ahorras/i,
]

function botShowedUpsell(text: string): boolean {
  return UPSELL_PATTERNS.some((re) => re.test(text))
}

export async function evaluateBot(
  cases: EvalCase[],
  run: (input: string) => Promise<RunResult>,
): Promise<EvalResult> {
  let intentOk = 0
  let cartOk = 0

  // flowCompletion counters
  let flowTotal = 0
  let flowOk = 0

  // upsellSuccess counters
  let upsellTotal = 0
  let upsellOk = 0

  let prevText = ""
  const failures: any[] = [];

  for (const c of cases) {
    const res = await run(c.input)

    // ── Intent accuracy ─────────────────────────────────────────
    if (res.intent === c.expectedIntent) intentOk++
    else failures.push({ input: c.input, expected: c.expectedIntent, got: res.intent });

    // ── Cart accuracy ────────────────────────────────────────────
    if (c.expectedCartCount !== undefined) {
      if (res.cartCount === c.expectedCartCount) cartOk++
    }

    // ── Flow completion ──────────────────────────────────────────
    // A "flow" case is one that expects CONFIRM_ORDER
    if (c.expectedIntent === "CONFIRM_ORDER") {
      flowTotal++
      if (res.intent === "CONFIRM_ORDER") flowOk++
    }

    // ── Upsell success ───────────────────────────────────────────
    // Previous bot response showed an upsell → did the user add something next?
    if (botShowedUpsell(prevText)) {
      upsellTotal++
      if (res.intent === "ADD_TO_CART") upsellOk++
    }

    prevText = res.text
  }

  const totalCartCases = cases.filter((c) => c.expectedCartCount !== undefined).length

  // Save failures for debugging
  try {
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'src/data/learning/failures.json');
    if (!fs.existsSync(path.dirname(reportPath))) fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2), 'utf8');
  } catch {}

  return {
    intentAccuracy:  intentOk / cases.length,
    cartAccuracy:    totalCartCases > 0 ? cartOk / totalCartCases : 1,
    flowCompletion:  flowTotal > 0 ? flowOk / flowTotal : 1,
    upsellSuccess:   upsellTotal > 0 ? upsellOk / upsellTotal : 0,
    total: cases.length,
  }
}
