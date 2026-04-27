/**
 * intentDetector.ts
 * Maps raw WhatsApp text → Intent + Entities
 * 80% of classification done here with keyword rules — zero AI cost.
 */

export type Intent =
  | 'SHOW_MENU' | 'SHOW_CATEGORY' | 'PRODUCT_INFO' | 'RECOMMEND'
  | 'ADD_TO_CART' | 'SELECT_SAUCE' | 'ADD_EXTRAS' | 'UPSELL_COMBO'
  | 'VIEW_CART' | 'EDIT_CART' | 'CONFIRM_ORDER' | 'CHECKOUT'
  | 'HOURS' | 'LOCATION' | 'DELIVERY_INFO' | 'PAYMENT_METHODS'
  | 'PROMOS_ACTIVE' | 'ANNOUNCEMENTS'
  | 'HANDOFF_HUMAN' | 'UNKNOWN';

export interface DetectionResult {
  intent: Intent;
  entities: Record<string, any>;
  confidence: 'HIGH' | 'LOW'; // LOW → consider sending to AI
}

// ── Product aliases (slang → canonical name) ──────────────────────────────────
const PRODUCT_ALIASES: Record<string, string> = {
  'boneless':             'Boneless 250g',
  'boni':                 'Boneless 250g',
  'boneless 250':         'Boneless 250g',
  'boneless power':       'Boneless Power 911',
  'power':                'Boneless Power 911',
  'alitas':               'Alitas 6pz',
  'alas':                 'Alitas 6pz',
  'alitas 6':             'Alitas 6pz',
  'alitas fuego':         'Alitas Fuego 911',
  'fuego':                'Alitas Fuego 911',
  'combo mixto':          'Combo Mixto 911',
  'mixto':                'Combo Mixto 911',
  'combo 911':            'Combo Mixto 911',
  'combo callejero':      'Combo Callejero 911',
  'callejero':            'Combo Callejero 911',
  'banderilla suprema':   'Combo Banderilla Suprema',
  'suprema':              'Combo Banderilla Suprema',
  'dedos':                'Dedos de queso (6)',
  'dedos de queso':       'Dedos de queso (6)',
  'banderilla':           'Banderilla coreana',
  'banderilla coreana':   'Banderilla coreana',
  'papas':                'Papas clásicas',
  'papas clasicas':       'Papas clásicas',
  'papas con queso':      'Papas con queso',
  'salchipapas':          'Salchipapas',
  'papas loaded':         'Papas 911 Loaded',
  'loaded':               'Papas 911 Loaded',
  'refresco':             'Refresco 400ml',
  'bebida':               'Refresco 400ml',
  'coca':                 'Refresco 400ml',
};

// ── Category aliases ──────────────────────────────────────────────────────────
const CATEGORY_ALIASES: Record<string, string> = {
  'combos':       'COMBOS',
  'combo':        'COMBOS',
  'proteina':     'PROTEINA',
  'proteína':     'PROTEINA',
  'papas':        'PAPAS',
  'banderillas':  'BANDERILLAS',
  'bebidas':      'BEBIDAS',
  'extras':       'EXTRAS',
};

// ── Sauce aliases ─────────────────────────────────────────────────────────────
const SAUCE_ALIASES: Record<string, string> = {
  'bbq':            'BBQ',
  'mango':          'Mango Habanero',
  'habanero':       'Mango Habanero',
  'mango habanero': 'Mango Habanero',
  'sin salsa':      'NONE',
  'sin enchilada':  'NONE',
  'sin enchilar':   'NONE',
  'natural':        'NONE',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function extractQty(text: string): number {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

function extractProduct(text: string): string | null {
  const n = normalize(text);
  // Longest match first (more specific aliases win)
  const sorted = Object.keys(PRODUCT_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (n.includes(normalize(alias))) return PRODUCT_ALIASES[alias];
  }
  return null;
}

function extractCategory(text: string): string | null {
  const n = normalize(text);
  for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
    if (n.includes(normalize(alias))) return cat;
  }
  return null;
}

function extractSauce(text: string): string | null {
  const n = normalize(text);
  for (const [alias, sauce] of Object.entries(SAUCE_ALIASES)) {
    if (n.includes(normalize(alias))) return sauce;
  }
  return null;
}

// ── Main detector ─────────────────────────────────────────────────────────────
export function detectIntent(rawText: string): DetectionResult {
  const text = rawText.trim();
  const n    = normalize(text);

  // ── Handoff (priority — detect first) ────────────────────────────────────
  const handoffTriggers = ['queja', 'reclamo', 'problema', 'no llego', 'no me llego',
    'molesto', 'molesta', 'hablar con', 'humano', 'persona', 'asesor', 'ayuda urgente'];
  if (handoffTriggers.some(t => n.includes(t))) {
    return { intent: 'HANDOFF_HUMAN', entities: { reason: 'user_request' }, confidence: 'HIGH' };
  }

  // ── Menu browsing ─────────────────────────────────────────────────────────
  const menuTriggers = ['menu', 'carta', 'tienen', 'que hay', 'que venden', 'que tienen', 'ver todo'];
  if (menuTriggers.some(t => n.includes(t))) {
    const cat = extractCategory(n);
    if (cat) return { intent: 'SHOW_CATEGORY', entities: { category: cat }, confidence: 'HIGH' };
    return { intent: 'SHOW_MENU', entities: {}, confidence: 'HIGH' };
  }

  // ── Show category ────────────────────────────────────────────────────────
  const cat = extractCategory(n);
  if (cat && (n.includes('ver') || n.includes('mostrar') || n.includes('que') || n.includes('lista'))) {
    return { intent: 'SHOW_CATEGORY', entities: { category: cat }, confidence: 'HIGH' };
  }

  // ── Product info ─────────────────────────────────────────────────────────
  const infoTriggers = ['cuanto cuesta', 'que incluye', 'que trae', 'que tiene', 'precio', 'costo', 'vale'];
  if (infoTriggers.some(t => n.includes(t))) {
    const product = extractProduct(n);
    return { intent: 'PRODUCT_INFO', entities: product ? { product } : {}, confidence: product ? 'HIGH' : 'LOW' };
  }

  // ── Sauce selection ──────────────────────────────────────────────────────
  const sauce = extractSauce(n);
  if (sauce) {
    return { intent: 'SELECT_SAUCE', entities: { sauce }, confidence: 'HIGH' };
  }

  // ── Add to cart ──────────────────────────────────────────────────────────
  const addTriggers = ['quiero', 'dame', 'ponme', 'pideme', 'agrega', 'uno de', 'una de', 'pide', 'ordena'];
  if (addTriggers.some(t => n.includes(t))) {
    const product = extractProduct(n);
    if (product) {
      return { intent: 'ADD_TO_CART', entities: { product, qty: extractQty(n) }, confidence: 'HIGH' };
    }
  }

  // ── Product name alone = ADD_TO_CART ────────────────────────────────────
  const productAlone = extractProduct(n);
  if (productAlone) {
    return { intent: 'ADD_TO_CART', entities: { product: productAlone, qty: extractQty(n) }, confidence: 'HIGH' };
  }

  // ── Add extras ──────────────────────────────────────────────────────────
  const extraTriggers = ['dip', 'salsa extra', 'parmesano', 'cheddar', 'extra'];
  if (extraTriggers.some(t => n.includes(t))) {
    const dipName = n.includes('parmesano') ? 'Dip Parmesano'
      : n.includes('cheddar') ? 'Dip Queso Cheddar'
      : n.includes('salsa') ? 'Salsa extra' : 'extra';
    return { intent: 'ADD_EXTRAS', entities: { extra: dipName, qty: extractQty(n) }, confidence: 'HIGH' };
  }

  // ── Cart operations ──────────────────────────────────────────────────────
  if (n.includes('carrito') || n.includes('mi pedido') || n.includes('que llevo') || n.includes('que tengo')) {
    return { intent: 'VIEW_CART', entities: {}, confidence: 'HIGH' };
  }
  const editTriggers = ['quita', 'borra', 'elimina', 'cambia', 'bajale', 'subele', 'mejor'];
  if (editTriggers.some(t => n.includes(t))) {
    return { intent: 'EDIT_CART', entities: { raw: text }, confidence: 'LOW' };
  }

  // ── Upsell combo ─────────────────────────────────────────────────────────
  if (n.includes('combo') && (n.includes('cambia') || n.includes('convierte') || n.includes('si'))) {
    return { intent: 'UPSELL_COMBO', entities: {}, confidence: 'HIGH' };
  }

  // ── Confirm / checkout ───────────────────────────────────────────────────
  const confirmTriggers = ['confirmo', 'listo', 'ordena', 'si', 'sí', 'andale', 'dale', 'va', 'ok', 'pagar'];
  if (confirmTriggers.some(t => n === t || n.includes(t))) {
    if (n.includes('delivery') || n.includes('envio') || n.includes('a domicilio')) {
      return { intent: 'CHECKOUT', entities: { delivery_type: 'DELIVERY' }, confidence: 'HIGH' };
    }
    if (n.includes('pickup') || n.includes('recoger') || n.includes('paso por')) {
      return { intent: 'CHECKOUT', entities: { delivery_type: 'PICKUP' }, confidence: 'HIGH' };
    }
    return { intent: 'CONFIRM_ORDER', entities: {}, confidence: 'HIGH' };
  }

  // ── Payment methods ──────────────────────────────────────────────────────
  if (n.includes('efectivo') || n.includes('cash')) {
    return { intent: 'CHECKOUT', entities: { payment_method: 'CASH' }, confidence: 'HIGH' };
  }
  if (n.includes('transferencia') || n.includes('transfer')) {
    return { intent: 'CHECKOUT', entities: { payment_method: 'TRANSFER' }, confidence: 'HIGH' };
  }
  if (n.includes('tarjeta') || n.includes('card')) {
    return { intent: 'CHECKOUT', entities: { payment_method: 'CARD' }, confidence: 'HIGH' };
  }

  // ── FAQs ─────────────────────────────────────────────────────────────────
  if (n.includes('horario') || n.includes('hora') || n.includes('cierran') || n.includes('abren')) {
    return { intent: 'HOURS', entities: {}, confidence: 'HIGH' };
  }
  if (n.includes('donde') || n.includes('ubicacion') || n.includes('direccion') || n.includes('donde estan')) {
    return { intent: 'LOCATION', entities: {}, confidence: 'HIGH' };
  }
  if (n.includes('delivery') || n.includes('domicilio') || n.includes('envio') || n.includes('reparto')) {
    return { intent: 'DELIVERY_INFO', entities: {}, confidence: 'HIGH' };
  }
  if (n.includes('pago') || n.includes('pagos') || n.includes('aceptan')) {
    return { intent: 'PAYMENT_METHODS', entities: {}, confidence: 'HIGH' };
  }
  if (n.includes('promo') || n.includes('oferta') || n.includes('descuento')) {
    return { intent: 'PROMOS_ACTIVE', entities: {}, confidence: 'HIGH' };
  }
  if (n.includes('anuncio') || n.includes('abierto') || n.includes('cerrado') || n.includes('aviso')) {
    return { intent: 'ANNOUNCEMENTS', entities: {}, confidence: 'HIGH' };
  }

  // ── Recommend ────────────────────────────────────────────────────────────
  const recommendTriggers = ['recomiend', 'sugier', 'que me conviene', 'no se que pedir', 'no sé',
    'presupuesto', 'hambre', 'picante', 'sin picante', 'caro', 'barato'];
  if (recommendTriggers.some(t => n.includes(t))) {
    const entities: Record<string, any> = {};
    if (n.includes('sin picante') || n.includes('no picante')) entities.spice = 'low';
    if (n.includes('mucha hambre') || n.includes('muy hambre')) entities.hunger = 'high';
    const budgetMatch = n.match(/\$?(\d{2,3})/);
    if (budgetMatch) entities.budget = parseInt(budgetMatch[1]);
    if (n.includes('caro')) entities.objection = 'price';
    return { intent: 'RECOMMEND', entities, confidence: 'LOW' }; // send to AI
  }

  // ── Unknown (fallback → may go to AI) ────────────────────────────────────
  return { intent: 'UNKNOWN', entities: { raw: text }, confidence: 'LOW' };
}
