/**
 * core/antojo.ts — Desire-trigger phrase generators for the DAYK Sales OS.
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 *
 * Provides 4 strategy pools used by the anti-loop STRATEGY_ROTATOR:
 *   0 → ANTOJO   (sensory crave copy)
 *   1 → FOMO     (scarcity / urgency)
 *   2 → SOCIAL   (social proof)
 *   3 → ANCHOR   (price anchoring / value)
 *
 * All phrases are short, persuasive, human-like Spanish.
 * No filler. No long explanations.
 */

// ─── ANTOJO — sensory desire triggers per category ──────────────────────────

const ANTOJO_BY_CATEGORY: Record<string, string[]> = {
  boneless: [
    'Crujientes por fuera, jugosos por dentro. 🔥',
    'Bañados en salsa caliente, recién hechos. 🤤',
    'Sin hueso, full sabor. El antojo perfecto.',
    'Crujientes, dorados, imposibles de resistir.',
  ],
  alitas: [
    'BBQ caramelizada. Bien doradas. Hueso limpio. 🍗',
    'Alitas que saben a que sí. Calientes y jugosas.',
    'Buffalo o BBQ — igual de adictivas. 🔥',
    'Las que se acaban primero. Siempre.',
  ],
  papas: [
    'Queso derretido encima. Calientes. Imposible no pedir. 🧀',
    'Papas loaded: la guarnición que siempre regresa. 🍟',
    'Crujientes, gajo, con queso que escurre.',
    'La combinación perfecta al lado del combo.',
  ],
  combos: [
    'El combo que más se repite. No es coincidencia.',
    'Todo incluido: proteína + papas + aderezo. 🔥',
    'El más pedido de la semana. Ahora es tu turno.',
    'Hecho para que no sobre nada en el plato.',
  ],
  postres: [
    'Brownie caliente + helado frío = el cierre perfecto. 🤯',
    'Dulce, caliente, inevitable.',
    'El postre que nadie rechaza. Nunca. 🍫',
  ],
  extras: [
    'El detalle que sube el pedido al siguiente nivel.',
    'Pequeño extra, gran diferencia.',
  ],
  default: [
    'Recién hecho. Caliente. Listo para ti. 🔥',
    'Snacks 911 — rápido, bueno y sin bronca.',
    'El antojo que no puedes ignorar. 🤤',
  ],
};

export function getAntojoPhrase(category: string): string {
  const pool = ANTOJO_BY_CATEGORY[category] ?? ANTOJO_BY_CATEGORY.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── FOMO — scarcity & urgency ───────────────────────────────────────────────

const FOMO_PHRASES = [
  '⚡ Se están acabando. Es ahora o después.',
  '🔥 Quedan pocos en preparación ahora mismo.',
  '⏰ El antojo no espera. Tú tampoco deberías.',
  '🚨 Pedidos abiertos. Pero no por siempre.',
  '⚡ El que llega primero, come caliente.',
];

export function getFOMOPhrase(): string {
  return FOMO_PHRASES[Math.floor(Math.random() * FOMO_PHRASES.length)];
}

// ─── SOCIAL PROOF ─────────────────────────────────────────────────────────────

const SOCIAL_PHRASES: ((name: string) => string)[] = [
  (n) => `El ${n} es lo más pedido hoy. Razón hay. 🔥`,
  (n) => `Todos piden el ${n}. Algo tienen de especial.`,
  (n) => `El ${n} es el favorito de la semana sin dudar.`,
  (n) => `Si tuvieras que elegir uno, todos elegirían el ${n}.`,
];

export function getSocialProofPhrase(productName: string): string {
  const fn = SOCIAL_PHRASES[Math.floor(Math.random() * SOCIAL_PHRASES.length)];
  return fn(productName);
}

// ─── PRICE ANCHOR ─────────────────────────────────────────────────────────────

const ANCHOR_TEMPLATES: ((price: number, anchor: number) => string)[] = [
  (p, a) => `Lo individual sale en $${a}. Así: $${p}. Ahorras $${a - p}. 💰`,
  (p, a) => `Individual: $${a}. Combo: $${p}. Diferencia en tu bolsillo: $${a - p}.`,
  (p, a) => `$${a} si lo pides por separado. $${p} así. La lógica es clara. 🔥`,
  (p, a) => `Ahorras $${a - p} vs pedirlo por piezas. A ese precio, no hay duda.`,
];

export function getPriceAnchorPhrase(price: number, anchor: number): string {
  if (anchor <= price) return `Todo por $${price}. Sin bronca.`;
  const fn = ANCHOR_TEMPLATES[Math.floor(Math.random() * ANCHOR_TEMPLATES.length)];
  return fn(price, anchor);
}

// ─── STRATEGY ROTATOR ─────────────────────────────────────────────────────────

export type AntiLoopStrategy = 'antojo' | 'fomo' | 'social' | 'anchor';

const STRATEGY_SEQUENCE: AntiLoopStrategy[] = ['antojo', 'fomo', 'social', 'anchor'];

/**
 * Returns the next strategy to use after a loop is detected.
 * Cycles: antojo → fomo → social → anchor → antojo → …
 */
export function getNextStrategy(retryCount: number): AntiLoopStrategy {
  return STRATEGY_SEQUENCE[retryCount % STRATEGY_SEQUENCE.length];
}

/**
 * Applies the anti-loop strategy to a base response text.
 * Prepends a strategy-specific phrase that changes the angle of the message.
 */
export function applyLoopStrategy(
  baseText: string,
  strategy: AntiLoopStrategy,
  productName = 'Combo 911',
  category = 'combos',
  price = 119,
  anchorPrice = 154,
): string {
  switch (strategy) {
    case 'antojo':
      return `${getAntojoPhrase(category)}\n\n${baseText}`;
    case 'fomo':
      return `${getFOMOPhrase()}\n\n${baseText}`;
    case 'social':
      return `${getSocialProofPhrase(productName)}\n\n${baseText}`;
    case 'anchor':
      return `${getPriceAnchorPhrase(price, anchorPrice)}\n\n${baseText}`;
  }
}
