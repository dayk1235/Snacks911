import { assertSystemHealthy, type OperationRisk } from '@/core/healthGuard';
import type { BugReport } from '@/core/bugDetector';

const makeReport = (
  priority: BugReport['priority'],
  overrides?: Partial<BugReport>,
): BugReport => ({
  module: 'testModule',
  failures: [],
  priority,
  skipped: false,
  ...overrides,
});

describe('assertSystemHealthy', () => {
  const safeOps: OperationRisk[] = ['deploy', 'refactor', 'pricing_change', 'ai_model_change', 'safe'];

  describe('healthy system (no bugs)', () => {
    it('allows all operations regardless of requiredLevel', () => {
      for (const op of safeOps) {
        expect(() => assertSystemHealthy([], 'healthy', op)).not.toThrow();
        expect(() => assertSystemHealthy([], 'degraded', op)).not.toThrow();
      }
    });
  });

  describe('degraded system (score 70–89)', () => {
    const degradedBugs: BugReport[] = [makeReport('critical')];

    it('allows safe operation at degraded level', () => {
      expect(() =>
        assertSystemHealthy(degradedBugs, 'degraded', 'safe'),
      ).not.toThrow();
    });

    it('blocks safe operation at healthy required level', () => {
      expect(() =>
        assertSystemHealthy(degradedBugs, 'healthy', 'safe'),
      ).toThrow(/requires healthy status/);
    });

    it('blocks deploy when degraded', () => {
      expect(() =>
        assertSystemHealthy(degradedBugs, 'degraded', 'deploy'),
      ).toThrow(/only safe operations allowed/);
    });

    it('blocks refactor when degraded', () => {
      expect(() =>
        assertSystemHealthy(degradedBugs, 'degraded', 'refactor'),
      ).toThrow(/only safe operations allowed/);
    });

    it('blocks pricing_change when degraded', () => {
      expect(() =>
        assertSystemHealthy(degradedBugs, 'degraded', 'pricing_change'),
      ).toThrow(/only safe operations allowed/);
    });

    it('blocks ai_model_change when degraded', () => {
      expect(() =>
        assertSystemHealthy(degradedBugs, 'degraded', 'ai_model_change'),
      ).toThrow(/only safe operations allowed/);
    });
  });

  describe('critical system (score < 70)', () => {
    const criticalBugs: BugReport[] = [
      makeReport('critical'),
      makeReport('critical'),
      makeReport('high'),
    ];

    it('blocks deploy, refactor, pricing_change, ai_model_change', () => {
      for (const op of ['deploy', 'refactor', 'pricing_change', 'ai_model_change'] as OperationRisk[]) {
        expect(() =>
          assertSystemHealthy(criticalBugs, 'degraded', op),
        ).toThrow(/system health is critical/);
      }
    });

    it('allows safe operations even in critical state', () => {
      expect(() =>
        assertSystemHealthy(criticalBugs, 'degraded', 'safe'),
      ).not.toThrow();
      expect(() =>
        assertSystemHealthy(criticalBugs, 'healthy', 'safe'),
      ).not.toThrow();
    });
  });

  describe('boundary: exactly 90 (healthy)', () => {
    const healthyBugs: BugReport[] = [makeReport('medium')];

    it('allows deploy', () => {
      expect(() =>
        assertSystemHealthy(healthyBugs, 'healthy', 'deploy'),
      ).not.toThrow();
    });
  });

  describe('boundary: exactly 70 (degraded)', () => {
    const degradedBugs: BugReport[] = [makeReport('critical')];

    it('treats score 70 as degraded', () => {
      expect(() =>
        assertSystemHealthy(degradedBugs, 'healthy', 'safe'),
      ).toThrow(/requires healthy status/);
    });
  });

  describe('boundary: exactly 69 (critical)', () => {
    const criticalBugs: BugReport[] = [
      makeReport('critical'),
      makeReport('critical'),
      makeReport('medium'),
    ];

    it('treats score 30 as critical — blocks risky ops, allows safe', () => {
      expect(() =>
        assertSystemHealthy(criticalBugs, 'degraded', 'deploy'),
      ).toThrow(/system health is critical/);
      expect(() =>
        assertSystemHealthy(criticalBugs, 'degraded', 'safe'),
      ).not.toThrow();
    });
  });
});
