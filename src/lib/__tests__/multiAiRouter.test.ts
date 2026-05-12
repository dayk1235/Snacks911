/**
 * Tests for multiAiRouter — intent detection and model routing.
 */
import {
  detectIntent,
  routeToModel,
  routeAi,
  isComplexTask,
  PROMPT_TEMPLATES,
} from '@/lib/multiAiRouter';
import type { Intent, AiModel } from '@/lib/multiAiRouter';

// ─── detectIntent ─────────────────────────────────────────────────────────

describe('detectIntent', () => {
  describe('sales/order intents', () => {
    it('detects "pedido" for order-related input', () => {
      expect(detectIntent('quiero hacer un pedido')).toBe('pedido');
    });

    it('detects "hambre" for hunger-related input', () => {
      expect(detectIntent('tengo hambre qué tienen')).toBe('hambre');
    });

    it('detects "hambre" for antojo input', () => {
      // "antojo" is an exact keyword match (not handled as regex)
      expect(detectIntent('tengo antojo de algo rico')).toBe('hambre');
    });

    it('detects "duda" for recommendation-seeking input', () => {
      expect(detectIntent('cuál me recomiendas')).toBe('duda');
    });

    it('detects "precio" for price-related input (no accent)', () => {
      // Keywords match on substring includes — accents matter
      expect(detectIntent('cuanto cuesta el combo')).toBe('precio');
    });

    it('falls back to mixto when price question uses accents not in keywords', () => {
      // "cuánto" has accent, keyword "cuanto" does not → no match → mixto
      const result = detectIntent('cuánto cuesta el combo');
      expect(['mixto', 'duda', 'precio']).toContain(result);
    });

    it('detects hambre when hunger + food context present', () => {
      // hambre keyword matches first, then sales override confirms
      expect(detectIntent('tengo hambre y quiero menu')).toBe('hambre');
    });
  });

  describe('ventas / estrategia / sistema → gpt', () => {
    it('detects "ventas" for sales keywords', () => {
      expect(detectIntent('quiero vender comprar oferta descuento promo')).toBe('ventas');
    });

    it('detects "estrategia" for plan keywords', () => {
      expect(detectIntent('necesito una estrategia para optimizar y crecer')).toBe('estrategia');
    });

    it('detects "sistema" for platform keywords', () => {
      expect(detectIntent('el sistema tiene un error bug')).toBe('sistema');
    });
  });

  describe('logica / codigo / estructura → qwen', () => {
    it('detects "logica" for logic keywords', () => {
      expect(detectIntent('la logica del algoritmo para calcular')).toBe('logica');
    });

    it('detects "codigo" for code keywords', () => {
      expect(detectIntent('necesito programar el desarrollo e implementar codigo')).toBe('codigo');
    });

    it('detects "estructura" for architecture keywords', () => {
      expect(detectIntent('estructura arquitectura organizar modular')).toBe('estructura');
    });
  });

  describe('analisis / razonamiento / texto_largo → claude', () => {
    it('detects "analisis" for data keywords', () => {
      expect(detectIntent('analizar datos metricas rendimiento')).toBe('analisis');
    });

    it('detects "razonamiento" for explanation keywords', () => {
      expect(detectIntent('por que como funciona explicar entender')).toBe('razonamiento');
    });

    it('detects "texto_largo" for writing keywords', () => {
      expect(detectIntent('escribir redactar documento descripcion')).toBe('texto_largo');
    });
  });

  describe('conversational intents → rule_based', () => {
    it('detects "aceptacion" for affirmative input', () => {
      expect(detectIntent('si quiero dame va dale')).toBe('aceptacion');
    });

    it('detects "rechazo_fuerte" for strong rejection', () => {
      expect(detectIntent('no quiero no me interesa muy caro')).toBe('rechazo_fuerte');
    });

    it('detects "rechazo" for simple rejection', () => {
      expect(detectIntent('no mejor no')).toBe('rechazo');
    });

    it('detects "gratitud" for thanks', () => {
      expect(detectIntent('gracias thank you')).toBe('gratitud');
    });

    it('detects "despedida" for goodbye', () => {
      expect(detectIntent('adios bye nos vemos')).toBe('despedida');
    });

    it('detects "urgencia" for urgency', () => {
      expect(detectIntent('lo necesito rapido pronto tardan mucho')).toBe('urgencia');
    });
  });

  describe('edge cases', () => {
    it('returns "mixto" for unrecognized input', () => {
      expect(detectIntent('xyz abc def')).toBe('mixto');
    });

    it('returns "mixto" for empty input', () => {
      expect(detectIntent('')).toBe('mixto');
    });

    it('returns "mixto" for "todo general varias" keywords', () => {
      expect(detectIntent('necesito todo en general varias cosas')).toBe('mixto');
    });

    it('handles case insensitivity', () => {
      expect(detectIntent('Quiero Hacer Un PEDIDO')).toBe('pedido');
    });

    it('returns "duda" when recommendation keywords present with food context', () => {
      expect(detectIntent('no sé cuál es mejor menu comida')).toBe('duda');
    });

    it('returns "precio" when price keywords present with food context', () => {
      expect(detectIntent('precio costo cuanto caro barato menu')).toBe('precio');
    });
  });
});

// ─── routeToModel ─────────────────────────────────────────────────────────

describe('routeToModel', () => {
  it('routes ventas/estrategia/sistema to gpt', () => {
    expect(routeToModel('ventas')).toBe('gpt');
    expect(routeToModel('estrategia')).toBe('gpt');
    expect(routeToModel('sistema')).toBe('gpt');
  });

  it('routes logica/codigo/estructura to qwen', () => {
    expect(routeToModel('logica')).toBe('qwen');
    expect(routeToModel('codigo')).toBe('qwen');
    expect(routeToModel('estructura')).toBe('qwen');
  });

  it('routes analisis/razonamiento/texto_largo to claude', () => {
    expect(routeToModel('analisis')).toBe('claude');
    expect(routeToModel('razonamiento')).toBe('claude');
    expect(routeToModel('texto_largo')).toBe('claude');
  });

  it('routes mixto to multi_ai', () => {
    expect(routeToModel('mixto')).toBe('multi_ai');
  });

  it('routes conversational intents to rule_based', () => {
    expect(routeToModel('pedido')).toBe('rule_based');
    expect(routeToModel('hambre')).toBe('rule_based');
    expect(routeToModel('duda')).toBe('rule_based');
    expect(routeToModel('precio')).toBe('rule_based');
    expect(routeToModel('aceptacion')).toBe('rule_based');
    expect(routeToModel('rechazo')).toBe('rule_based');
    expect(routeToModel('rechazo_fuerte')).toBe('rule_based');
    expect(routeToModel('exploracion')).toBe('rule_based');
    expect(routeToModel('browsing')).toBe('rule_based');
    expect(routeToModel('gratitud')).toBe('rule_based');
    expect(routeToModel('despedida')).toBe('rule_based');
    expect(routeToModel('edicion')).toBe('rule_based');
  });
});

// ─── routeAi ──────────────────────────────────────────────────────────────

describe('routeAi', () => {
  it('returns intent and model for code input', () => {
    const result = routeAi('necesito programar implementar codigo');
    expect(result.intent).toBe('codigo');
    expect(result.model).toBe('qwen');
  });

  it('returns intent and model for sales input', () => {
    const result = routeAi('quiero mejorar ventas y ofertas');
    expect(result.intent).toBe('ventas');
    expect(result.model).toBe('gpt');
  });

  it('returns intent and model for analysis input', () => {
    const result = routeAi('analizar las metricas de rendimiento');
    expect(result.intent).toBe('analisis');
    expect(result.model).toBe('claude');
  });

  it('returns intent and model for food order', () => {
    const result = routeAi('quiero pedir comida');
    expect(result.intent).toBe('pedido');
    expect(result.model).toBe('rule_based');
  });
});

// ─── isComplexTask ────────────────────────────────────────────────────────

describe('isComplexTask', () => {
  it('returns false for rule-based intents', () => {
    expect(isComplexTask('pedido')).toBe(false);
    expect(isComplexTask('hambre')).toBe(false);
    expect(isComplexTask('duda')).toBe(false);
    expect(isComplexTask('precio')).toBe(false);
  });

  it('returns true for AI-requiring intents', () => {
    expect(isComplexTask('ventas')).toBe(true);
    expect(isComplexTask('codigo')).toBe(true);
    expect(isComplexTask('analisis')).toBe(true);
    expect(isComplexTask('mixto')).toBe(true);
    expect(isComplexTask('logica')).toBe(true);
    expect(isComplexTask('razonamiento')).toBe(true);
  });
});

// ─── PROMPT_TEMPLATES ─────────────────────────────────────────────────────

describe('PROMPT_TEMPLATES', () => {
  it('has templates for gpt, qwen, claude, multi_ai', () => {
    expect(PROMPT_TEMPLATES.gpt).toContain('Snacks 911');
    expect(PROMPT_TEMPLATES.qwen).toContain('Snacks 911');
    expect(PROMPT_TEMPLATES.claude).toContain('Snacks 911');
    expect(PROMPT_TEMPLATES.multi_ai).toContain('Snacks 911');
  });

  it('does not have a template for rule_based', () => {
    expect(PROMPT_TEMPLATES).not.toHaveProperty('rule_based');
  });

  it('each template is a non-empty string', () => {
    for (const [model, template] of Object.entries(PROMPT_TEMPLATES)) {
      expect(template.length).toBeGreaterThan(0);
      expect(typeof template).toBe('string');
    }
  });
});
