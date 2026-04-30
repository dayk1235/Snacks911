/**
 * core/intentDetector.ts — Unified Intent Detection for the Sales OS.
 * 
 * Merges high-quality regex/priority logic from intents.ts into a 
 * single robust NLU agent for the modular pipeline.
 * 
 * Priority: rechazo_fuerte > rechazo > duda > pedido > precio > exploracion > browsing
 */

import { Intent } from './types';

export interface IntentResult {
  intent: Intent;
  confidence: number;
}

interface IntentRule {
  intent: Intent;
  keywords: string[];
  patterns: RegExp[];
  priority: number; // 1-10, higher wins
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'rechazo_fuerte',
    keywords: ['no quiero', 'no me interesa', 'muy caro', 'demasiado caro', 'no puedo', 'adiós', 'adios'],
    patterns: [
      /no (quiero|tengo|puedo)/i,
      /está (muy )?caro/i,
      /no me (interesa|gusta|convence)/i,
      /demasiado (caro|costoso)/i,
    ],
    priority: 10,
  },
  {
    intent: 'pago_problema',
    keywords: [
      'no tengo efectivo', 'no traigo dinero', 'no tengo cash', 'puedo pagar',
      'aceptan tarjeta', 'aceptan transferencia', 'tienes qr', 'pago con qr',
      'solo tarjeta', 'no traigo',
    ],
    patterns: [
      /no tengo (efectivo|cash|dinero|cambio)/i,
      /no traigo (efectivo|cash|dinero|cambio)/i,
      /puedo pagar con (tarjeta|qr|transferencia)/i,
      /aceptan (tarjeta|qr|transferencia)/i,
      /tienes (qr|terminal)/i,
      /pago con (qr|tarjeta|transferencia)/i,
    ],
    priority: 10,
  },
  {
    intent: 'duda',
    keywords: [
      'duda', 'no sé', 'no se', 'nose', 'no estoy seguro', 'no sabría',
      'no sabria', 'mmm no se', 'cuál', 'cual', 'mejor', 'recomiendas',
      'recomienda', 'opción', 'opcion', 'indeciso', 'hmm', 'ehhh', 'este',
    ],
    patterns: [
      /^no\s*s[ée]$/i,
      /^no\s*se\s*$/i,
      /no\s*s[ée]\s*$/i,
      /no\s*estoy\s*segur/i,
      /no\s*sabr/i,
      /mmm?\s*no\s*s[ée]/i,
      /no\s*(sé|se)\s*(cual|que|cuál)/i,
      /me (recomiendas|sugieres|aconsejas)/i,
      /cuál (es|me conviene|es mejor)/i,
      /estoy (entre|indeciso|dudando)/i,
      /^(hmm+|ehh+|umm+|uuh+)$/i,
    ],
    priority: 9,
  },
  {
    intent: 'aceptacion',
    keywords: ['sí', 'si', 'va', 'dale', 'quiero', 'dámelo', 'ok', 'perfecto', 'claro', 'ya que', 'ándale', 'andale'],
    patterns: [
      /ya (pues|que|va)/i,
      /dale (pues|entonces)/i,
      /sí (pues|vale|ok)/i,
      /eso suena/i,
      /^(va|dale|sí|si|ok|yep|yes)$/i,
    ],
    priority: 9,
  },
  {
    intent: 'pedido',
    keywords: ['pedir', 'orden', 'pedido', 'manda', 'envía', 'envia', 'dame', 'dámelo', 'llevo', 'pido', 'listo'],
    patterns: [
      /quiero (pedir|ordenar|hacer un pedido)/i,
      /me (llevas|mandas|envías)/i,
      /dame (un|el|ese)/i,
      /te (pido|hago)/i,
      /listo para/i,
    ],
    priority: 9,
  },
  {
    intent: 'rechazo',
    keywords: ['mejor no', 'así está', 'sin', 'sin eso', 'no gracias'],
    patterns: [
      /^no$/i,
      /no gracias/i,
      /así (estoy|queda|está bien)/i,
      /solo el combo/i,
      /sin (papas|bebida|postre)/i,
    ],
    priority: 8,
  },
  {
    intent: 'edicion',
    keywords: ['agregar', 'agrego', 'quitar', 'quito', 'cambiar', 'modificar', 'más cosas', 'mas cosas', 'olvidé', 'olvide'],
    patterns: [
      /quiero (agregar|agregarle|ponerle|quitar)/i,
      /se me olvidó/i,
      /puedo (agregar|poner|meter)/i,
      /me (hace falta|falta)/i,
    ],
    priority: 8,
  },
  {
    intent: 'urgencia',
    keywords: ['rápido', 'rapido', 'pronto', 'tarde', 'tardan', 'cuánto tarda', 'cuanto tarda', 'hambre ya'],
    patterns: [
      /no tardan/i,
      /cuánto (tiempo|tardan|tarda)/i,
      /tengo (mucha )?hambre/i,
      /es (para )?ahora/i,
    ],
    priority: 8,
  },
  {
    intent: 'hambre',
    keywords: ['hambre', 'antojo', 'comer', 'comida', 'almuerzo', 'cena', 'atascada', 'llenar', 'grande', 'bestia'],
    patterns: [
      /tengo (hambre|antojo)/i,
      /quiero (algo de )?comer/i,
      /se me antoja/i,
      /me da hambre/i,
      /hambre (fuerte|atascada)/i,
    ],
    priority: 8,
  },
  {
    intent: 'precio',
    keywords: ['precio', 'costo', 'cuánto', 'cuanto', 'caro', 'barato', 'económico', 'promo', 'descuento', 'oferta', '$'],
    patterns: [
      /cuánto (es|cuesta|vale|cobran)/i,
      /hay (promo|descuento|oferta)/i,
      /tiene (algo )?barato/i,
      /precio (de|del)/i,
    ],
    priority: 7,
  },
  {
    intent: 'exploracion',
    keywords: ['qué más', 'que más', 'qué hay', 'que hay', 'qué ofrecen', 'qué tienen', 'menú', 'menu', 'catálogo', 'opciones', 'más cosas'],
    patterns: [
      /qué (más|hay|ofrecen|tienen)/i,
      /tienes (algo )?más/i,
      /muéstrame/i,
      /ver (más|todo|menú)/i,
    ],
    priority: 7,
  },
  {
    intent: 'browsing',
    keywords: ['solo veo', 'estoy viendo', 'mirando', 'solo estoy', 'pasando', 'viendo'],
    patterns: [
      /solo (estoy )?(viendo|mirando)/i,
      /no (quiero|voy a )?comprar( todavía)?/i,
      /solo (estoy )?mirando/i,
      /pasaba (por|a)? ver/i,
    ],
    priority: 6,
  },
  {
    intent: 'gratitud',
    keywords: ['gracias', 'thanks', 'thank', 'agradezco', 'amable'],
    patterns: [
      /muchas gracias/i,
      /te (agradezco|pasé)/i,
      /qué amable/i,
      /muy (amable|atento)/i,
    ],
    priority: 5,
  },
  {
    intent: 'despedida',
    keywords: ['adiós', 'adios', 'bye', 'nos vemos', 'hasta luego', 'chao'],
    patterns: [
      /nos (vemos|hablamos)/i,
      /hasta (luego|pronto)/i,
    ],
    priority: 6,
  },
  {
    intent: 'complaint',
    keywords: ['tarda', 'mal', 'falla', 'no llega', 'queja', 'problema'],
    patterns: [
      /tarda (mucho|demasiado)/i,
      /problema con/i,
    ],
    priority: 8,
  },
];

/**
 * detectIntent() — Scored intent detection using keywords and patterns.
 * 
 * Highest score wins. Confidence is normalized (0-1).
 */
export function detectIntent(message: string): IntentResult {
  const lower = message.toLowerCase().trim();
  if (!lower) return { intent: 'other', confidence: 0 };

  let bestScore = 0;
  let bestIntent: Intent = 'other';

  for (const rule of INTENT_RULES) {
    let score = 0;

    // Keyword scoring: exact = 3, contains = 1
    for (const kw of rule.keywords) {
      if (lower === kw) score += 3;
      else if (lower.includes(kw)) score += 1;
    }

    // Pattern scoring: regex match = 3
    for (const pattern of rule.patterns) {
      if (pattern.test(lower)) score += 3;
    }

    if (score > 0) {
      const finalScore = score * (rule.priority / 5);
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestIntent = rule.intent;
      }
    }
  }

  // Map legacy names to maintain compatibility with components using old strings
  // but pushing them to the new standardized set.
  const mappedIntent = mapLegacyIntent(bestIntent);

  return { 
    intent: mappedIntent, 
    confidence: Math.min(bestScore / 10, 1) 
  };
}

function mapLegacyIntent(intent: Intent): Intent {
  const map: Record<string, Intent> = {
    'ready_to_order': 'pedido',
    'pricing': 'precio',
    'hungry_strong': 'hambre',
    'hungry_light': 'hambre',
    'undecided': 'duda',
  };
  return map[intent] || intent;
}
