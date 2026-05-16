/**
 * core/intentDetector.ts — Unified Intent Detection for the Sales OS.
 * 
 * Merges high-quality regex/priority logic from intents.ts into a 
 * single robust NLU agent for the modular pipeline.
 * 
 * Priority: rechazo_fuerte > rechazo > duda > pedido > precio > exploracion > browsing
 */

import { Intent } from './types';
import { isGreetingOnly } from './nluBaseline';

/**
 * Safely loads learned rules (server-only, lazy).
 */
function loadLearnedRules(): any[] {
  if (typeof window !== 'undefined') return []; // Browser: skip
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'src/data/learning/learnedRules.json');
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Persists learned rules hit counts (server-only).
 */
function persistLearnedRules(rules: any[]): void {
  if (typeof window !== 'undefined') return;
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'src/data/learning/learnedRules.json');
    fs.writeFileSync(file, JSON.stringify(rules, null, 2), 'utf8');
  } catch { }
}


export type IntentActionType = 'quiero' | 'ver' | 'duda' | 'rechazo' | 'aceptacion' | 'precio' | 'edicion' | 'other';
export type CategoryType = 'combo' | 'boneless' | 'alitas' | 'papas' | 'bebida' | 'postre' | 'extra' | 'none';

export interface Entities {
  products: string[];
  categories: string[];
  qty: number[];
  sauces: string[];
  restrictions: string[];
}

function entitiesToRecord(e: Entities): Record<string, string> {
  return {
    products: JSON.stringify(e.products),
    categories: JSON.stringify(e.categories),
    qty: JSON.stringify(e.qty),
    sauces: JSON.stringify(e.sauces),
    restrictions: JSON.stringify(e.restrictions),
  };
}

export function parseEntitiesRecord(r: Record<string, string> | undefined): Entities {
  if (!r) return { products: [], categories: [], qty: [], sauces: [], restrictions: [] };
  try {
    return {
      products: JSON.parse(r.products || '[]'),
      categories: JSON.parse(r.categories || '[]'),
      qty: JSON.parse(r.qty || '[]'),
      sauces: JSON.parse(r.sauces || '[]'),
      restrictions: JSON.parse(r.restrictions || '[]'),
    };
  } catch {
    return { products: [], categories: [], qty: [], sauces: [], restrictions: [] };
  }
}

export interface IntentResult {
  intent: Intent;
  confidence: number;
  entities: Record<string, string>;
  action?: IntentActionType;
  filters?: string[];
  category?: CategoryType;
  allergies?: string[];
  scores?: Record<string, number>;
}

interface IntentRule {
  intent: Intent;
  keywords: string[];
  patterns: RegExp[];
  priority: number; // 1-10, higher wins
}

/**
 * Normalizes text: lowercase, no accents, trim, no symbols.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/gi, '') // Remove symbols
    .replace(/\bq\b/g, 'que') // Slang: q -> que
    .replace(/\bk\b/g, 'que') // Slang: k -> que
    .replace(/\bqiero\b/g, 'quiero') // Slang: qiero -> quiero
    .replace(/bonles|boneles|bnls/g, 'boneless') // Slang: boneless variants
    .replace(/papas l/g, 'papas loaded') // Slang: papas loaded
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'list_products',
    keywords: [
      'todos', 'ver', 'mostrar', 'muestra', 'menu', 'menú', 'lista', 'opciones',
      'combos', 'boneless', 'alitas', 'papas', 'que hay', 'qué hay',
    ],
    patterns: [
      /(muestra|muestrame|ver|enseñame|pásame|pasame|todos los|todas las) (combos|boneless|alitas|papas)/i,
      /(qué|que) (tienes|hay|tienen|ofrecen) (de |los |las )?(combos|boneless|alitas|papas|todo|menú|menu)/i,
      /todos los (combos|boneless|alitas|papas)/i,
      /ver (todos |todas las )?(los |las )?(combos|boneless|alitas|papas)/i,
      /(combos|boneless|alitas|papas) (disponibles|tienes|hay)/i,
      /^(que hay|qué hay|tienes menú|tienes menu|pásame el menú)/i,
    ],
    priority: 10,
  },
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
      'recomienda', 'opción', 'opcion', 'indeciso', 'hmm', 'ehhh', 'este', 'algo',
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
    keywords: ['quiero', 'dame', 'ponme', 'agrega', 'añade', 'pido', 'llevo', 'dámelo', 'damelo'],
    patterns: [
      /(quiero|dame|ponme|pido|llevo|agrega|añade|ordenar) (un|una|el|la|los|las|unos|unas)?\s*(combos?|boneless|alitas|papas|banderillas?|dedos|queso)/i,
      /me (llevas|mandas|envías|envia)/i,
      /dame (un|el|ese)/i,
      /te (pido|hago un pedido de)/i,
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
    keywords: ['qué más', 'que más', 'qué ofrecen', 'menú', 'menu', 'catálogo', 'opciones', 'más cosas'],
    patterns: [
      /qué (más|hay|ofrecen|tienen)/i,
      /tienes (algo )?más/i,
      /muéstrame/i,
      /ver (más|todo|menú)/i,
    ],
    priority: 5,
  },
  {
    intent: 'browsing',
    keywords: ['solo veo', 'estoy viendo', 'mirando', 'solo estoy', 'pasando', 'viendo'],
    patterns: [
      /solo (estoy )?(viendo|mirando)/i,
      /no (quiero|voy a )?comprar( todavía)?/i,
      /solo (estoy )?mirando/i,
      /^(hola|buenas|buen(os)? d[ií]as|tardes|noches)/i,
    ],
    priority: 1,
  },
  {
    intent: 'gratitud',
    keywords: ['gracias', 'thanks', 'thank', 'agradezco', 'amable'],
    patterns: [
      /(gracias|perfecto|ok|enterado|vale|va|arreado|excelente|chido|buenisimo)/i,
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
 * Extracts the user's action type from the message.
 */
function extractAction(lower: string): IntentActionType {
  const purchaseVerbs = ['quiero', 'dame', 'ponme', 'pido', 'llevo', 'agrega', 'añade', 'ordenar'];
  const exploreVerbs = ['ver', 'mostrar', 'muestra', 'enseñame', 'pasame'];
  const rejectWords = ['no', 'mejor no', 'sin eso', 'no gracias'];
  const acceptWords = ['si', 'sí', 'va', 'dale', 'ok', 'perfecto', 'claro'];
  const priceWords = ['cuanto', 'cuánto', 'precio', 'costo', 'caro', 'barato'];
  const editWords = ['quitar', 'quita', 'elimina', 'borra', 'cambiar', 'modificar'];

  if (purchaseVerbs.some(v => lower.startsWith(v) || lower.includes(` ${v} `) || lower.includes(` ${v}`))) return 'quiero';
  if (exploreVerbs.some(v => lower.startsWith(v) || lower.includes(` ${v} `) || lower.includes(` ${v}`))) return 'ver';
  if (editWords.some(v => lower.includes(v))) return 'edicion';
  if (priceWords.some(v => lower.includes(v))) return 'precio';
  if (rejectWords.some(v => lower.startsWith(v))) return 'rechazo';
  if (acceptWords.some(v => lower === v || lower.startsWith(`${v} `))) return 'aceptacion';
  return 'other';
}

/**
 * Extracts the product category from the message.
 */
function extractCategory(lower: string): CategoryType {
  if (/combo/i.test(lower)) return 'combo';
  if (/boneless/i.test(lower)) return 'boneless';
  if (/alitas?/i.test(lower)) return 'alitas';
  if (/papas?/i.test(lower)) return 'papas';
  if (/bebida|refresco|tomar/i.test(lower)) return 'bebida';
  if (/postre|brownie|helado/i.test(lower)) return 'postre';
  if (/salsa|dip|extra/i.test(lower)) return 'extra';
  return 'none';
}

/**
 * extractEntities() — Extracts products, categories, quantities, sauces, and restrictions.
 */
function extractEntities(n: string, raw: string): Entities {
  const entities: Entities = {
    products: [],
    categories: [],
    qty: [],
    sauces: [],
    restrictions: []
  };

  // 1. Categories
  const category = extractCategory(n);
  if (category !== 'none') entities.categories.push(category);

  // 2. Products (Aliases)
  const productAliases: Record<string, string[]> = {
    'Combo Mixto 911': ['mixto', 'combo mixto'],
    'Boneless Power 911': ['boneless power', 'power'],
    'Alitas Fuego 911': ['alitas fuego', 'fuego'],
    'Combo Callejero 911': ['callejero'],
    'Combo Banderilla Suprema': ['suprema', 'banderilla suprema'],
    'Papas 911 Loaded': ['loaded', 'papas loaded'],
    'Boneless 250g': ['boneless'],
    'Alitas 6 piezas': ['alitas'],
    'Papas Clásicas': ['papas clasicas'],
    'Papas con Queso': ['papas con queso', 'papas queso'],
    'Salchipapas': ['salchipapas'],
    'Banderilla Coreana': ['coreana', 'banderilla coreana'],
    'Dedos de Queso': ['dedos', 'dedos de queso'],
    'Refresco 400ml': ['refresco', 'bebida', 'coca', 'sprite', 'fanta', 'manzanita'],
  };

  for (const [prod, aliases] of Object.entries(productAliases)) {
    if (aliases.some(a => n.includes(a))) {
      entities.products.push(prod);
    }
  }

  // 3. Sauces
  const sauceKeywords = ['bbq', 'barbecue', 'mango', 'habanero', 'parmesano', 'cheddar'];
  for (const sauce of sauceKeywords) {
    if (n.includes(sauce)) entities.sauces.push(sauce);
  }

  // 4. Quantities
  const qtyMap: Record<string, number> = {
    'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
    'un': 1, 'una': 1
  };
  const numMatches = n.match(/\b\d+\b/g);
  if (numMatches) {
    numMatches.forEach(m => entities.qty.push(parseInt(m)));
  }
  for (const [word, num] of Object.entries(qtyMap)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(n)) {
      entities.qty.push(num);
    }
  }

  // 5. Restrictions
  entities.restrictions = extractFilters(n);

  return entities;
}

/**
 * Extracts filter/restriction terms from "sin X" / "no X" patterns.
 */
function extractFilters(lower: string): string[] {
  const filters: string[] = [];
  const sinMatches = lower.match(/sin\s+(\w+)/g);
  if (sinMatches) {
    for (const m of sinMatches) {
      filters.push(m.replace(/^sin\s+/, '').trim());
    }
  }
  const noMatches = lower.match(/no\s+(quiero|me|puedo)\s+(\w+)/g);
  if (noMatches) {
    for (const m of noMatches) {
      const word = m.split(/\s+/).pop();
      if (word) filters.push(word);
    }
  }
  return filters;
}

/**
 * detectIntent() — Scored intent detection using keywords and patterns.
 * 
 * Decomposes input into: action, filters, category.
 * ADD_TO_CART only allowed if: no filters AND action is 'quiero'.
 */
export function detectIntent(message: string, context?: any): IntentResult {
  const n = normalizeText(message);
  if (!n) return {
    intent: 'other',
    entities: entitiesToRecord({ products: [], categories: [], qty: [], sauces: [], restrictions: [] }),
    confidence: 0.3,
    action: 'other',
    filters: [],
    category: 'none',
    allergies: []
  };

  if (isGreetingOnly(message)) {
    return {
      intent: 'SHOW_MENU',
      entities: entitiesToRecord({ products: [], categories: [], qty: [], sauces: [], restrictions: [] }),
      confidence: 1.0,
      action: 'ver',
      filters: [],
      category: 'none',
      allergies: []
    };
  }

  // ─────────────────────────────────────────
  // HARD OVERRIDE (PRIORIDAD ABSOLUTA)
  // ─────────────────────────────────────────

  // 🟡 VIEW CART
  if (/(ver carrito|mi pedido|ver orden|que llevo|que pedi)/i.test(n)) {
    return {
      intent: 'VIEW_CART',
      entities: entitiesToRecord({ products: [], categories: [], qty: [], sauces: [], restrictions: [] }),
      confidence: 1.0,
      action: 'ver',
      filters: [],
      category: 'none',
      allergies: []
    };
  }

  // 🔵 SHOW_MENU
  if (/^(menu|ver menu|muestrame el menu|que hay de comer|que tienen|ver todo|carta|que venden|hola|buen dia|buenas tardes|buenas noches)/i.test(n)) {
    return {
      intent: 'SHOW_MENU',
      entities: entitiesToRecord({ products: [], categories: [], qty: [], sauces: [], restrictions: [] }),
      confidence: 1.0,
      action: 'ver',
      filters: [],
      category: 'none',
      allergies: []
    };
  }

  // 🟢 RECOMMEND
  if (/(sorprendeme|recomiendame|que es lo mejor|algo rico|no se que pedir|tu dime)/i.test(n)) {
    return {
      intent: 'RECOMMEND',
      entities: entitiesToRecord({ products: [], categories: [], qty: [], sauces: [], restrictions: [] }),
      confidence: 1.0,
      action: 'duda',
      filters: [],
      category: 'none',
      allergies: []
    };
  }

  // 💛 LOYALTY_QUERY — "mis puntos", "saldo", "nivel", "estado de puntos", etc.
  if (/(mis puntos|ver puntos|saldo de puntos|cuantos puntos|puntos tengo|mi nivel|estado de lealtad|puntos de lealtad|programa de puntos)/i.test(n)) {
    return {
      intent: 'LOYALTY_QUERY' as any,
      entities: entitiesToRecord({ products: [], categories: [], qty: [], sauces: [], restrictions: [] }),
      confidence: 1.0,
      action: 'ver',
      filters: [],
      category: 'none',
      allergies: []
    };
  }

  // 💰 REDEEM_POINTS — "canjear", "usar mis puntos", "descuento puntos", etc.
  if (/(canjear|canjeame|canjea|usar mis puntos|usar puntos|redimir|quiero mi descuento|aplicar descuento|descuento de puntos|si canjear|sí canjear)/i.test(n)) {
    return {
      intent: 'REDEEM_POINTS' as any,
      entities: entitiesToRecord({ products: [], categories: [], qty: [], sauces: [], restrictions: [] }),
      confidence: 1.0,
      action: 'aceptacion',
      filters: [],
      category: 'none',
      allergies: []
    };
  }

  // 🎁 APPLY_REFERRAL — "WINGS-XXXX" or "tengo un código"
  if (n.includes('wings-') || n.includes('tengo un codigo') || n.includes('mi codigo') || n.includes('descuento referido')) {
    return {
      intent: 'APPLY_REFERRAL' as any,
      entities: entitiesToRecord({ products: [], categories: [], qty: [], sauces: [], restrictions: [] }),
      confidence: 1.0,
      action: 'quiero',
      filters: [],
      category: 'none',
      allergies: []
    };
  }

  // Extract allergies from "sin X" patterns
  const allergies = extractAllergies(message); // Keep raw message for regexes that might expect punctuation

  // Decompose intent using normalized text
  const action = extractAction(n);
  const filters = extractFilters(n);
  const category = extractCategory(n);
  const entities = extractEntities(n, message);

  // ── UNIFIED SCORING SYSTEM ──
  // All signals contribute points to a single scoreboard.
  const scores: Record<string, number> = {
    ADD_TO_CART: 0,
    SHOW_CATEGORY: 0,
    SHOW_MENU: 0,
    RECOMMEND: 0,
    VIEW_CART: 0,
    EDIT_CART: 0,
    CONFIRM_ORDER: 0,
    UNKNOWN: 0
  };

  function addScore(intent: string, points: number) {
    if (intent === 'gratitud') return; // Absolute suppression: gratitude never competes
    const globalIntent = mapToGlobalIntent(intent);
    if (globalIntent === 'gratitud') return;

    if (scores[globalIntent] !== undefined) {
      scores[globalIntent] += points;
    } else {
      scores[globalIntent] = points;
    }
  }

  // A. Learned rules scoring (Primary context)
  const learnedRules = loadLearnedRules();
  let learnedRuleMatched = false;
  for (const rule of learnedRules) {
    const pattern = rule.pattern.toLowerCase();
    if (n.includes(pattern)) {
      let ruleIntent = rule.intent;

      // SAFETY GUARD: Do not allow learned rules to push ADD_TO_CART if restrictions are present
      if (ruleIntent === 'pedido' || ruleIntent === 'ADD_TO_CART' as any) {
        if (n.includes("sin") || entities.restrictions.length > 0) {
          ruleIntent = 'RECOMMEND' as any;
        }
      }

      // SAFETY GUARD: If "sin" is present, protect RECOMMEND from being overwritten by other learned intents
      if (n.includes("sin") && ruleIntent !== 'RECOMMEND' as any) {
        addScore('RECOMMEND', rule.priority / 2); // Soft push to recommend instead of full priority
      } else {
        addScore(ruleIntent, rule.priority);
      }

      // Track usage for pruning
      rule.hits = (rule.hits ?? 0) + 1;
      learnedRuleMatched = true;
    }
  }
  if (learnedRuleMatched) {
    persistLearnedRules(learnedRules);
  }

  // B. Core Semantic Weights
  // 1. Restrictions -> Soft push to RECOMMEND (duda)
  if (allergies.length > 0 || filters.length > 0) {
    addScore('duda', 5);
  }
  // 2. Exploratory verbs -> SHOW_CATEGORY (list_products)
  if (action === 'ver') {
    addScore('list_products', 40);
  }
  // 3. Purchase verbs -> ADD_TO_CART (pedido)
  else if (action === 'quiero') {
    addScore('pedido', 10);
  }

  // ─── Modern Intent Rules ───
  // A. ADD_TO_CART Specific Boosts
  const purchaseKeywords = ["quiero", "dame", "ponme", "ordena", "agrega"];
  if (purchaseKeywords.some(kw => n.includes(kw))) {
    scores.ADD_TO_CART += 1;
  }
  if (entities.products.length > 0) {
    scores.ADD_TO_CART += 1;
  }
  if (entities.qty.some(q => q > 1)) {
    scores.ADD_TO_CART += 0; // Remove small boost
  }

  // Navigation keywords check
  const navigationKeywords = [
    'ver', 'mostrar', 'muestrame', 'menu', 'combos',
    'opciones', 'que tienes', 'lista'
  ];

  if (navigationKeywords.some(k => n.includes(k))) {
    scores.SHOW_CATEGORY += 100;
    scores.ADD_TO_CART -= 50;
  }

  // B. SHOW_CATEGORY Specific Boosts
  const showKeywords = ["ver", "mostrar", "que hay", "que tienes", "lista"];
  if (showKeywords.some(kw => n.includes(kw))) {
    scores.SHOW_CATEGORY += 10;
  }
  if (entities.categories.length > 0) {
    scores.SHOW_CATEGORY += 2;
  }
  if (n.includes("todos")) {
    scores.SHOW_CATEGORY += 1;
  }

  // C. RECOMMEND Specific Boosts

  // High-priority patterns — score +10 each, override weaker signals
  const recommendPatterns = [
    /sorprendeme/i,
    /recomiendame/i,
    /que es lo mejor/i,
    /algo rico/i,
    /no se que pedir/i,
    /tu dime/i,
    /que me recomiendas/i,
  ];
  if (recommendPatterns.some((re) => re.test(n))) {
    scores.RECOMMEND += 10;
  }

  const recommendationKeywords = ["recomienda", "sugiere", "no se"];
  const restrictionKeywords = ["sin", "no", "evita"];

  if (restrictionKeywords.some(kw => n.includes(kw))) {
    scores.RECOMMEND += 40;
  }
  if (recommendationKeywords.some(kw => n.includes(kw))) {
    scores.RECOMMEND += 3;
  }
  if (entities.products.length > 0 && entities.restrictions.length > 0) {
    scores.RECOMMEND += 3;
  }

  // D. SHOW_MENU Specific Boosts
  const menuKeywords = ["menu", "carta", "ver todo"];
  if (menuKeywords.some(kw => n.includes(kw))) {
    scores.SHOW_MENU += 3;
  }

  // E. VIEW_CART Specific Boosts
  const cartPatterns = [
    /ver carrito/i,
    /ver orden/i,
    /mi pedido/i,
    /que llevo/i,
    /que pedi/i,
  ];
  if (cartPatterns.some((re) => re.test(n))) {
    scores.VIEW_CART += 50;
  }

  // Total keywords check
  const totalQuestions = [
    'cuanto voy a deber',
    'cuanto debo',
    'cuanto es',
    'total',
    'cuanto llevo',
    'cuanto voy'
  ];

  if (totalQuestions.some(q => n.includes(q))) {
    scores.VIEW_CART += 100;
    scores.ADD_TO_CART -= 100;
  }

  // Question penalty for ADD_TO_CART
  if (message.includes('?') || n.startsWith('cuanto') || n.startsWith('que')) {
    scores.ADD_TO_CART -= 80;
  }

  // Fallback keyword boost (lower priority)
  const viewCartKeywords = ["carrito", "que llevo", "mi pedido"];
  if (viewCartKeywords.some(kw => n.includes(kw))) {
    scores.VIEW_CART += 100;
  }

  // F. EDIT_CART Specific Boosts
  const editCartKeywords = ["quita", "elimina", "cambia"];
  if (editCartKeywords.some(kw => n.includes(kw))) {
    scores.EDIT_CART += 3;
  }

  // G. CONFIRM_ORDER Specific Boosts
  const checkoutPatterns = [
    /confirmo/i,
    /confirmar/i,
    /manda el pedido/i,
    /haz el pedido/i,
    /ya mandalo/i,
    /finalizar/i,
    /terminar pedido/i,
  ];
  if (checkoutPatterns.some((re) => re.test(n))) {
    scores.CONFIRM_ORDER += 100;
  }

  // Fallback keyword boost (lower priority)
  const checkoutKeywords = ["pagar", "confirmar", "listo", "ok"];
  if (checkoutKeywords.some((kw) => n.includes(kw))) {
    scores.CONFIRM_ORDER += 4;
  }
  
  // Penalize CONFIRM_ORDER if it looks like a question
  if (message.includes('?') || n.includes('llegas a') || n.includes('llevan a') || n.includes('puedo pagar')) {
    scores.CONFIRM_ORDER -= 50;
  }

  // ─── FINAL OVERRIDES ───
  // 1. Safety Penalty: If recommendation is triggered, strongly discourage direct purchase
  if (scores.RECOMMEND > 0) {
    scores.ADD_TO_CART -= 50;
  }
  // 2. Discovery Priority: "ver" with higher discovery score always wins over purchase
  if (n.includes("ver") && scores.SHOW_CATEGORY > scores.ADD_TO_CART) {
    scores.SHOW_CATEGORY += 5; // Hard prioritize discovery
  }
  // 3. Implicit Intent: Just product name usually means they want to add it
  if (entities.products.length > 0 && action === 'other') {
    scores.ADD_TO_CART += 1;
  }

  // C. Strong verb scoring (Fallback for other verbs)
  const strongVerbs: Record<string, Intent> = {
    'ver': 'list_products',
    'mostrar': 'list_products',
    'muestra': 'list_products',
    'enseñame': 'list_products',
    'enséñame': 'list_products',
    'quiero': 'pedido',
    'dame': 'pedido',
    'ponme': 'pedido',
    'pido': 'pedido',
    'llevo': 'pedido',
    'agrega': 'pedido',
    'añade': 'pedido',
    'ordenar': 'pedido',
    'no': 'rechazo',
    'si': 'aceptacion',
    'sí': 'aceptacion',
    'cuánto': 'precio',
    'cuanto': 'precio',
    'qué más': 'exploracion',
    'que más': 'exploracion',
  };

  // ── APPLY_REFERRAL: "WINGS-XXXX" or "tengo un código" ────────────────────
  if (n.includes('wings-') || n.includes('tengo un codigo') || n.includes('mi codigo')) {
    addScore('APPLY_REFERRAL', 1000);
  }

  for (const [verb, intent] of Object.entries(strongVerbs)) {
    if (n.startsWith(verb) || n.includes(` ${verb} `) || n.includes(` ${verb}`)) {
      let verbIntent = intent;

      // Override: exploratory action → redirect pedido to list_products
      if (verbIntent === 'pedido' && action === 'ver') {
        verbIntent = 'list_products';
      }

      addScore(verbIntent, 15);
      break;
    }
  }

  // C. Static rules scoring
  for (const rule of INTENT_RULES) {
    let score = 0;

    // Keyword scoring: exact = 3, contains = 1
    for (const kw of rule.keywords) {
      if (n === kw) score += 3;
      else if (n.includes(kw)) score += 1;
    }

    // Pattern scoring: regex match = 5
    for (const pattern of rule.patterns) {
      if (pattern.test(n)) score += 5;
    }

    if (score > 0) {
      const finalScore = score * (rule.priority / 5);
      addScore(rule.intent, finalScore);
    }
  }

  // ─── ABSOLUTE PRIORITY SYSTEM ───
  const PRIORITY: Record<string, number> = {
    CONFIRM_ORDER: 1000,
    VIEW_CART: 900,
    ADD_TO_CART: 50,
    RECOMMEND: 600,
    SHOW_CATEGORY: 400,
    SHOW_MENU: 200,
    UNKNOWN: 0,
  };

  for (const key in scores) {
    if (PRIORITY[key] !== undefined) {
      scores[key] = scores[key] * PRIORITY[key];
    }
  }

  // ─── FINAL SELECTION ───
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const bestScore = sortedScores[0][1];

  let mappedIntent = bestScore > 0 ? (sortedScores[0][0] as Intent) : ('UNKNOWN' as any);

  if (process.env.NODE_ENV !== "test") {
    console.log("INPUT:", n);
    console.log("SCORES:", scores);
    console.log("INTENT:", mappedIntent);
  }

  if (
    category !== 'none' &&
    !n.includes('carrito') &&
    (n.includes('ver') || n.includes('mostrar'))
  ) {
    mappedIntent = 'SHOW_CATEGORY' as any;
  }

  if (mappedIntent === 'UNKNOWN') {
    if (context?.cart?.items?.length > 0) {
      mappedIntent = 'VIEW_CART' as any;
    } else {
      mappedIntent = 'RECOMMEND' as any;
    }
  }

  // ─── SAFETY GUARD ───
  // ADD_TO_CART requires a clear product reference.
  // If no product entities, no category, and no purchase-action verb
  // were detected, downgrade to RECOMMEND to avoid phantom cart adds.
  if (
    mappedIntent === 'ADD_TO_CART' &&
    entities.products.length === 0 &&
    category === 'none' &&
    action !== 'quiero'
  ) {
    mappedIntent = 'RECOMMEND' as any;
  }

  return {
    intent: mappedIntent,
    entities: entitiesToRecord(entities),
    confidence: bestScore > 3 ? 1.0 : 0.3,
    action,
    filters,
    category,
    allergies: allergies.length > 0 ? allergies : undefined,
    scores
  };
}

/**
 * Extract allergies from "sin X" patterns in text.
 * Handles: "sin salchicha", "sin salchicha y papas", "sin salchicha, papas y queso"
 * Also handles: "soy alérgico a X", "no puedo comer X"
 */
export function extractAllergies(message: string): string[] {
  const lower = message.toLowerCase();
  const allergies: string[] = [];

  // SIMPLE APPROACH: Find "sin " and extract everything after it
  const sinIndex = lower.indexOf('sin ');
  if (sinIndex !== -1) {
    // Extract everything after "sin "
    let afterSin = lower.substring(sinIndex + 4).trim(); // +4 for "sin "

    // Remove trailing punctuation only (at end of string): ? ! . ; : ,
    afterSin = afterSin.replace(/[?.,!;:]+$/, '');

    // Replace " y " and " e " with ", " for consistent splitting
    afterSin = afterSin.replace(/\s+y\s+/g, ', ').replace(/\s+e\s+/g, ', ');

    // Split by commas and whitespace
    const items = afterSin
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s =>
        s.length > 2 &&
        !['sin', 'y', 'e', 'la', 'el', 'los', 'las', 'una', 'un', 'pero'].includes(s)
      );

    allergies.push(...items);
  }

  // Pattern 2: "evita X"
  const evitaMatch = lower.match(/evita\s+(.+)/i);
  if (evitaMatch && evitaMatch[1]) {
    const items = evitaMatch[1]
      .replace(/[?.,!;:$].*/, '')
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);
    allergies.push(...items);
  }

  // Pattern 3: "soy alérgico a X" / "soy alergico a X"
  const allergicMatch = lower.match(/soy\s+al[ée]rgic[oa]\s+a\s+(.+)/i);
  if (allergicMatch && allergicMatch[1]) {
    const items = allergicMatch[1]
      .replace(/[?.,!;:$].*/, '')
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);
    allergies.push(...items);
  }

  // Pattern 4: "no puedo comer X" / "no como X" / "nada de X" / "sin nada de X"
  const noComerMatch = lower.match(/no\s+(puedo\s+comer|como|quiero|quiero\s+nada\s+de)\s+(.+)/i);
  if (noComerMatch && noComerMatch[2]) {
    const items = noComerMatch[2]
      .replace(/[?.,!;:$].*/, '')
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);
    allergies.push(...items);
  }

  // Pattern 5: "quita X" / "elimina X" / "nada de X"
  const removeMatch = lower.match(/(quita|elimina|nada\s+de)\s+(.+)/i);
  if (removeMatch && removeMatch[2]) {
    const items = removeMatch[2]
      .replace(/[?.,!;:$].*/, '')
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);
    allergies.push(...items);
  }

  // Pattern 6: X "no puedo comer" / X "no quiero"
  const reverseNoMatch = lower.match(/(.+)\s+no\s+(puedo\s+comer|quiero|como)/i);
  if (reverseNoMatch && reverseNoMatch[1]) {
    const items = reverseNoMatch[1]
      .replace(/[?.,!;:$].*/, '')
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);
    allergies.push(...items);
  }

  // Remove duplicates and return
  const result = [...new Set(allergies)];
  return result;
}

function mapToGlobalIntent(intent: string): string {
  const map: Record<string, string> = {
    'pedido': 'ADD_TO_CART',
    'list_products': 'SHOW_CATEGORY',
    'duda': 'RECOMMEND',
    'precio': 'RECOMMEND',
    'hambre': 'RECOMMEND',
    'aceptacion': 'ADD_TO_CART',
    'exploracion': 'SHOW_CATEGORY',
    'edicion': 'EDIT_CART',
    'ready_to_order': 'ADD_TO_CART',
    'pricing': 'RECOMMEND',
    'hungry_strong': 'RECOMMEND',
    'hungry_light': 'RECOMMEND',
    'undecided': 'RECOMMEND',
  };
  return map[intent] || intent;
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
