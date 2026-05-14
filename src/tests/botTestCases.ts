export interface TestCase {
  name: string;
  conversation: string[];
  expected: {
    intent: string;
    must_include: string[];
    must_not_include: string[];
  };
}

/**
 * botTestCases.ts
 * 
 * Standardised evaluation scenarios for Snacks 911 bot intelligence.
 * Intents must match those returned by src/core/intentDetector.ts:
 * (ADD_TO_CART, SHOW_CATEGORY, SHOW_MENU, RECOMMEND, VIEW_CART, EDIT_CART, CONFIRM_ORDER)
 */
export const botTestCases: TestCase[] = [
  {
    name: "context_follow_up",
    conversation: [
      "Quiero un Boneless Power 911",
      "Con salsa BBQ por favor"
    ],
    expected: {
      intent: "ORDER",
      must_include: ["BBQ", "agregado", "Boneless"],
      must_not_include: ["no entiendo", "error"]
    }
  },
  {
    name: "sauces_only",
    conversation: [
      "¿Qué salsas tienen para mis alitas?"
    ],
    expected: {
      intent: "VIEW_SAUCES",
      must_include: ["salsa", "BBQ", "Mango Habanero", "puedes elegir"],
      must_not_include: ["confirmar pedido", "pago"]
    }
  },
  {
    name: "vague_intent",
    conversation: [
      "Tengo mucha hambre, no sé qué pedir"
    ],
    expected: {
      intent: "CLARIFY",
      must_include: ["antojo", "alitas", "boneless", "papas"],
      must_not_include: ["pedido listo", "WhatsApp"]
    }
  },
  {
    name: "upsell_correct",
    conversation: [
      "Quiero unas Alitas Fuego 911",
      "Y agrégale un dip de queso cheddar"
    ],
    expected: {
      intent: "ORDER",
      must_include: ["Alitas", "Cheddar", "agregado"],
      must_not_include: ["no disponible", "agotado"]
    }
  },
  {
    name: "fallback_mode",
    conversation: [
      "Hola, quiero lo de siempre"
    ],
    expected: {
      intent: "CLARIFY",
      must_include: ["antojo", "alitas", "boneless", "papas"],
      must_not_include: ["error", "quién eres"]
    }
  },
  {
    name: "contextual_complement",
    conversation: ["quiero boneless", "y algo más"],
    expected: {
      intent: "ADD_COMPLEMENT",
      must_include: ["papas", "salsa", "bebida", "acompañar"],
      must_not_include: ["error", "no entiendo"]
    }
  }
];
