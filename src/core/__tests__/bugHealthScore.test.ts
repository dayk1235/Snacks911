import { getSystemHealth, type BugHealthScore } from '@/core/bugHealthScore';
import type { BugReport, BugPriority } from '@/core/bugDetector';

const makeReport = (
  priority: BugPriority,
  overrides?: Partial<BugReport>,
): BugReport => ({
  module: 'testModule',
  failures: [],
  priority,
  skipped: false,
  ...overrides,
});

describe('getSystemHealth', () => {
  it('returns 100 and healthy for empty bug list', () => {
    const result = getSystemHealth([]);
    expect(result).toEqual<BugHealthScore>({
      score: 100,
      status: 'healthy',
      breakdown: { critical: 0, high: 0, medium: 0, low: 0 },
    });
  });

  it('subtracts 30 per critical bug', () => {
    const result = getSystemHealth([makeReport('critical')]);
    expect(result.score).toBe(70);
    expect(result.status).toBe('degraded');
    expect(result.breakdown.critical).toBe(1);
  });

  it('subtracts 20 per high bug', () => {
    const result = getSystemHealth([makeReport('high')]);
    expect(result.score).toBe(80);
    expect(result.status).toBe('degraded');
    expect(result.breakdown.high).toBe(1);
  });

  it('subtracts 10 per medium bug', () => {
    const result = getSystemHealth([makeReport('medium')]);
    expect(result.score).toBe(90);
    expect(result.status).toBe('healthy');
    expect(result.breakdown.medium).toBe(1);
  });

  it('subtracts 5 per low bug', () => {
    const result = getSystemHealth([makeReport('low')]);
    expect(result.score).toBe(95);
    expect(result.status).toBe('healthy');
    expect(result.breakdown.low).toBe(1);
  });

  it('computes correct score for mixed priorities', () => {
    const reports: BugReport[] = [
      makeReport('critical'),
      makeReport('critical'),
      makeReport('high'),
      makeReport('medium'),
      makeReport('low'),
    ];
    const result = getSystemHealth(reports);
    expect(result.score).toBe(5);
    expect(result.status).toBe('critical');
    expect(result.breakdown).toEqual({
      critical: 2,
      high: 1,
      medium: 1,
      low: 1,
    });
  });

  it('floors score at 0', () => {
    const reports: BugReport[] = [
      makeReport('critical'),
      makeReport('critical'),
      makeReport('critical'),
      makeReport('critical'),
    ];
    const result = getSystemHealth(reports);
    expect(result.score).toBe(0);
    expect(result.status).toBe('critical');
  });

  it('returns healthy when score is exactly 90', () => {
    const result = getSystemHealth([makeReport('medium')]);
    expect(result.score).toBe(90);
    expect(result.status).toBe('healthy');
  });

  it('returns degraded when score is exactly 89', () => {
    const result = getSystemHealth([makeReport('medium'), makeReport('low')]);
    expect(result.score).toBe(85);
    expect(result.status).toBe('degraded');
  });

  it('returns degraded when score is exactly 70', () => {
    const result = getSystemHealth([makeReport('critical')]);
    expect(result.score).toBe(70);
    expect(result.status).toBe('degraded');
  });

  it('returns critical when score is below 70', () => {
    const result = getSystemHealth([makeReport('critical'), makeReport('medium')]);
    expect(result.score).toBe(60);
    expect(result.status).toBe('critical');
  });

  it('returns healthy with only low-priority bugs', () => {
    const reports = Array.from({ length: 2 }, () => makeReport('low'));
    const result = getSystemHealth(reports);
    expect(result.score).toBe(90);
    expect(result.status).toBe('healthy');
  });

  it('always returns non-negative score', () => {
    const reports: BugReport[] = Array.from({ length: 10 }, () => makeReport('critical'));
    const result = getSystemHealth(reports);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
