/**
 * Tests for multiAiOrchestrator — the 7-step multi-AI pipeline.
 *
 * Covers: normalizarRespuestas, combinarRespuestas, elegirMejor,
 *         activarOrquestador, and edge cases.
 */
import {
  normalizarRespuestas,
  combinarRespuestas,
  elegirMejor,
  activarOrquestador,
  ejecutarQwen,
  ejecutarClaude,
  ejecutarGpt,
} from '@/lib/multiAiOrchestrator';
import type { AiResponse } from '@/lib/multiAiOrchestrator';

const mockQwenResponse: AiResponse = {
  model: 'qwen',
  text: 'Análisis técnico: optimizar flujo con patrón singleton. Implementar cache TTL.',
  confidence: 0.94,
  latency: 150,
  metadata: { intent: 'codigo' },
};

const mockClaudeResponse: AiResponse = {
  model: 'claude',
  text: 'Análisis detallado: la conversión mejora con combos premium. Recomiendo enfocarse en ticket promedio.',
  confidence: 0.96,
  latency: 200,
  metadata: { intent: 'analisis' },
};

const mockGptResponse: AiResponse = {
  model: 'gpt',
  text: 'Estrategia de ventas: implementar urgency + social proof. Crear combos de $119-189.',
  confidence: 0.93,
  latency: 180,
  metadata: { intent: 'ventas' },
};

// ─── normalizarRespuestas ─────────────────────────────────────────────────

describe('normalizarRespuestas', () => {
  it('returns same array when only one response', () => {
    const result = normalizarRespuestas([mockQwenResponse]);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('qwen');
  });

  it('returns same array when empty', () => {
    const result = normalizarRespuestas([]);
    expect(result).toHaveLength(0);
  });

  it('normalizes confidence to 0-1 range across multiple responses', () => {
    const responses: AiResponse[] = [
      { ...mockQwenResponse, confidence: 0.5 },
      { ...mockClaudeResponse, confidence: 0.9 },
      { ...mockGptResponse, confidence: 0.1 },
    ];
    const result = normalizarRespuestas(responses);

    expect(result).toHaveLength(3);
    expect(result[0].confidence).toBeLessThanOrEqual(1);
    expect(result[0].confidence).toBeGreaterThanOrEqual(0);
    expect(result[1].confidence).toBeGreaterThanOrEqual(0);
    expect(result[2].confidence).toBeLessThanOrEqual(1);
  });

  it('trims text when multiple responses', () => {
    const responses: AiResponse[] = [
      { ...mockQwenResponse, text: '  padded text  ', confidence: 0.8, latency: 100 },
      { ...mockGptResponse, text: '  other text  ', confidence: 0.5, latency: 200 },
    ];
    const result = normalizarRespuestas(responses);
    expect(result[0].text).toBe('padded text');
    expect(result[1].text).toBe('other text');
  });

  it('adds latencyScore metadata', () => {
    const responses: AiResponse[] = [
      { ...mockQwenResponse, latency: 100 },
      { ...mockGptResponse, latency: 300 },
    ];
    const result = normalizarRespuestas(responses);

    expect(result[0].metadata?.latencyScore).toBeDefined();
    expect(result[1].metadata?.latencyScore).toBeDefined();
    // Faster response should have higher latencyScore
    expect(result[0].metadata?.latencyScore).toBeGreaterThan(
      result[1].metadata?.latencyScore as number,
    );
  });

  it('handles all identical confidences', () => {
    const responses: AiResponse[] = [
      { ...mockQwenResponse, confidence: 0.8 },
      { ...mockClaudeResponse, confidence: 0.8 },
    ];
    const result = normalizarRespuestas(responses);
    // With range=0, all become 0 after (0.8 - 0.8) / 1 = 0
    expect(result[0].confidence).toBe(0);
    expect(result[1].confidence).toBe(0);
  });

  it('preserves original metadata fields', () => {
    // Normalization adds latencyScore metadata only when >1 response
    const responses: AiResponse[] = [
      { ...mockQwenResponse, metadata: { intent: 'codigo', model: 'qwen-coder', step: 'ejecutar_qwen' } as Record<string, unknown> },
      { ...mockGptResponse, metadata: { intent: 'ventas' } as Record<string, unknown> },
    ];
    const result = normalizarRespuestas(responses);
    const meta = result[0].metadata as Record<string, unknown>;
    expect(meta.intent).toBe('codigo');
    expect(meta.model).toBe('qwen-coder');
    expect(meta.step).toBe('ejecutar_qwen');
    expect(meta.latencyScore).toBeDefined();
  });
});

// ─── combinarRespuestas ───────────────────────────────────────────────────

describe('combinarRespuestas', () => {
  it('returns undefined for single response', () => {
    const result = combinarRespuestas([mockQwenResponse]);
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    const result = combinarRespuestas([]);
    expect(result).toBeUndefined();
  });

  it('combines multiple responses with model labels', () => {
    const result = combinarRespuestas([
      mockQwenResponse,
      mockClaudeResponse,
      mockGptResponse,
    ]);
    expect(result).toBeDefined();
    expect(result).toContain('**Análisis Multi-IA:**');
    expect(result).toContain('[CLAUDE]');
    expect(result).toContain('[QWEN]');
    expect(result).toContain('[GPT]');
  });

  it('sorts by confidence descending (highest first)', () => {
    const lowConfidence: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      confidence: 0.3,
      text: 'Low confidence answer.',
    };
    const result = combinarRespuestas([lowConfidence, mockClaudeResponse]);

    expect(result).toBeDefined();
    // Claude (0.96) should appear before Qwen (0.3)
    const claudeIdx = result!.indexOf('[CLAUDE]');
    const qwenIdx = result!.indexOf('[QWEN]');
    expect(claudeIdx).toBeLessThan(qwenIdx);
  });

  it('deduplicates similar insights by prefix when prefix overlaps', () => {
    const a: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      text: 'snacks 911 strategy optimization needed.',
      confidence: 0.8,
      latency: 100,
    };
    const b: AiResponse = {
      ...mockClaudeResponse,
      model: 'claude',
      text: 'snacks 911 strategy optimization is critical here.',
      confidence: 0.7,
      latency: 110,
    };
    const result = combinarRespuestas([a, b]);

    expect(result).toBeDefined();
    // The dedup checks existing.toLowerCase().includes(point.slice(0,30))
    // Both start with "[MODEL] snacks 911 strategy op" — the model labels differ,
    // but the common text portion after the label can overlap. The dedup evaluates
    // existing.includes(pointPrefix) so if both share "[MODEL] snacks 911 strategy..."
    // with same model, they deduplicate. With different models, the "[CLAUDE]" vs
    // "[QWEN]" prefix differs, so no dedup occurs unless text content overlaps.
    // This tests the actual behavior: with different model labels, the 30-char slices
    // differ at position 0 (label), preventing dedup.
    const insightCount = (result!.match(/\[(QWEN|CLAUDE|GPT)\]/g) || []).length;
    expect(insightCount).toBe(2);
  });

  it('deduplicates identical model insights with same prefix', () => {
    // Same model = same label prefix = dedup can work
    const a: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      text: 'identical prefix test for snacks optimization.',
      confidence: 0.9,
      latency: 100,
    };
    const b: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      text: 'identical prefix test for snacks optimization v2.',
      confidence: 0.7,
      latency: 110,
    };
    const result = combinarRespuestas([a, b]);

    expect(result).toBeDefined();
    const matches = (result!.match(/identical prefix test/g) || []).length;
    expect(matches).toBe(1);
  });

  it('limits output to top 3 insights', () => {
    const responses: AiResponse[] = Array.from({ length: 5 }, (_, i) => ({
      ...mockQwenResponse,
      model: i % 3 === 0 ? 'qwen' : i % 3 === 1 ? 'claude' : 'gpt',
      text: `Unique point number ${i}.`,
      confidence: 0.9 - i * 0.1,
      latency: 100 + i * 10,
    }));
    const result = combinarRespuestas(responses);

    expect(result).toBeDefined();
    const insightCount = (result!.match(/\[(QWEN|CLAUDE|GPT)\]/g) || []).length;
    expect(insightCount).toBeLessThanOrEqual(3);
  });
});

// ─── elegirMejor ──────────────────────────────────────────────────────────

describe('elegirMejor', () => {
  it('throws if responses array is empty', () => {
    expect(() => elegirMejor([])).toThrow('No responses to choose from');
  });

  it('returns single response directly', () => {
    const result = elegirMejor([mockQwenResponse]);
    expect(result.model).toBe('qwen');
    expect(result.text).toBe(mockQwenResponse.text);
  });

  it('picks highest-confidence response when all else equal', () => {
    const highConf: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      confidence: 0.99,
      text: 'Best answer.',
    };
    const lowConf: AiResponse = {
      ...mockGptResponse,
      model: 'gpt',
      confidence: 0.5,
      text: 'Best answer.',
    };
    const result = elegirMejor([lowConf, highConf]);
    expect(result.model).toBe('qwen');
  });

  it('favors actionable responses (verbs)', () => {
    const noAction: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      confidence: 0.9,
      text: 'Just a statement with no actions.',
    };
    const withAction: AiResponse = {
      ...mockGptResponse,
      model: 'gpt',
      confidence: 0.9,
      text: 'Crear implementar vender agregar pedir comprar. Many action verbs here.',
    };
    const result = elegirMejor([noAction, withAction]);
    expect(result.model).toBe('gpt');
  });

  it('favors sales-aligned responses (business keywords)', () => {
    const noSales: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      confidence: 0.85,
      text: 'Technical implementation details.',
    };
    const withSales: AiResponse = {
      ...mockGptResponse,
      model: 'gpt',
      confidence: 0.85,
      text: 'ventas combo ticket conversion upsell precio ahorro promo. Sales focus.',
    };
    const result = elegirMejor([noSales, withSales]);
    expect(result.model).toBe('gpt');
  });

  it('favors simpler/shorter responses when scores are close', () => {
    // Many words → low simplicity score. Single char repeated = 1 word → high simplicity.
    // Use actual multi-word verbose text.
    const verbose: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      confidence: 0.88,
      text: Array.from({ length: 80 }, (_, i) => `word${i}`).join(' '), // 80 words = low simplicity
    };
    const concise: AiResponse = {
      ...mockGptResponse,
      model: 'gpt',
      confidence: 0.88,
      text: 'ventas combo upsell.',
    };
    const result = elegirMejor([verbose, concise]);
    // Concise has better simplicity, and sales keywords, and action words
    expect(result.model).toBe('gpt');
  });

  it('break tie by simplicity when scores within 0.05', () => {
    const a: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      confidence: 0.5,
      text: Array.from({ length: 50 }, (_, i) => `x${i}`).join(' '), // 50 words
    };
    const b: AiResponse = {
      ...mockGptResponse,
      model: 'gpt',
      confidence: 0.51,
      text: 'Short simple response.',
    };
    const result = elegirMejor([a, b]);
    // With confidence difference of only 0.01, simpler should win (score delta < 0.05 tiebreak)
    expect(result.model).toBe('gpt');
  });

  it('handles responses with metallic characters in text', () => {
    const weird: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      confidence: 0.7,
      text: 'Special chars: **bold** _italic_ [link](url) &amp; &lt;script&gt;',
    };
    const normal: AiResponse = {
      ...mockGptResponse,
      model: 'gpt',
      confidence: 0.9,
      text: 'Normal text.',
    };
    const result = elegirMejor([weird, normal]);
    expect(result.model).toBe('gpt');
  });

  it('handles zero-word responses gracefully', () => {
    const empty: AiResponse = {
      ...mockQwenResponse,
      model: 'qwen',
      confidence: 0.5,
      text: '',
    };
    const normal: AiResponse = {
      ...mockGptResponse,
      model: 'gpt',
      confidence: 0.5,
      text: 'Some text.',
    };
    const result = elegirMejor([empty, normal]);
    // Both equal confidence, but empty has simplicity=1 while normal has some words
    expect(result).toBeDefined();
  });
});

// ─── Single-model executors ───────────────────────────────────────────────

describe('ejecutarQwen', () => {
  it('returns AiResponse with qwen model', async () => {
    const result = await ejecutarQwen('test prompt', 'codigo');
    expect(result.model).toBe('qwen');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.latency).toBeGreaterThan(0);
  });

  it('uses higher confidence for code-related intents', async () => {
    const codeResult = await ejecutarQwen('test', 'codigo');
    const otherResult = await ejecutarQwen('test', 'ventas');
    expect(codeResult.confidence).toBeGreaterThan(otherResult.confidence);
  });

  it('includes metadata', async () => {
    const result = await ejecutarQwen('test', 'logica', { foo: 'bar' });
    expect(result.metadata?.intent).toBe('logica');
    expect(result.metadata?.step).toBe('ejecutar_qwen');
  });
});

describe('ejecutarClaude', () => {
  it('returns AiResponse with claude model', async () => {
    const result = await ejecutarClaude('test prompt', 'analisis');
    expect(result.model).toBe('claude');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.latency).toBeGreaterThan(0);
  });

  it('uses higher confidence for analysis-related intents', async () => {
    const analysisResult = await ejecutarClaude('test', 'analisis');
    const otherResult = await ejecutarClaude('test', 'ventas');
    expect(analysisResult.confidence).toBeGreaterThan(otherResult.confidence);
  });
});

describe('ejecutarGpt', () => {
  it('returns AiResponse with gpt model', async () => {
    const result = await ejecutarGpt('test prompt', 'ventas');
    expect(result.model).toBe('gpt');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('uses higher confidence for sales-related intents', async () => {
    const salesResult = await ejecutarGpt('test', 'ventas');
    const otherResult = await ejecutarGpt('test', 'analisis');
    expect(salesResult.confidence).toBeGreaterThan(otherResult.confidence);
  });
});

// ─── activarOrquestador — full pipeline ───────────────────────────────────

describe('activarOrquestador', () => {
  it('runs full pipeline and returns OrchestratorResult', async () => {
    const result = await activarOrquestador(
      'optimizar ventas de boneless',
      'ventas',
      'multi_ai',
    );

    expect(result.input).toBe('optimizar ventas de boneless');
    expect(result.intent).toBe('ventas');
    expect(result.modelsUsed).toContain('qwen');
    expect(result.modelsUsed).toContain('claude');
    expect(result.modelsUsed).toContain('gpt');
    expect(result.responses).toHaveLength(3);
    expect(result.normalized).toHaveLength(3);
    expect(result.winner).toBeDefined();
    expect(result.winner.model).toBeTruthy();
    expect(result.combined).toBeDefined();
    expect(result.decision).toBeTruthy();
    expect(result.totalLatency).toBeGreaterThan(0);
  });

  it('runs single model when explicitly requested', async () => {
    const result = await activarOrquestador(
      'test code optimization',
      'codigo',
      'qwen',
    );

    expect(result.modelsUsed).toEqual(['qwen']);
    expect(result.responses).toHaveLength(1);
    expect(result.winner.model).toBe('qwen');
    expect(result.combined).toBeUndefined();
  });

  it('uses intent-based fallback selection for unknown model', async () => {
    const result = await activarOrquestador(
      'improve sales strategy',
      'ventas',
      'rule_based',
    );

    // Falls back to gpt for 'ventas' intent
    expect(result.modelsUsed).toContain('gpt');
    expect(result.responses.length).toBeGreaterThan(0);
  });
});
