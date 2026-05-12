/**
 * src/core/__tests__/bugDetector.test.ts
 *
 * Tests for the bug detection pipeline: extraction, grouping, priority, dedup.
 * GitHub API calls are mocked via jest.setup.ts (fetch mock).
 */
import {
  extractFailuresFromJestJson,
  processFailure,
  processFailures,
  determinePriority,
  groupFailuresByModule,
  type TestFailure,
} from '@/core/bugDetector';

const makeFailure = (overrides?: Partial<TestFailure>): TestFailure => ({
  testName: 'should do the thing',
  suiteName: 'MyComponent > render',
  filePath: '/src/core/__tests__/myComponent.test.ts',
  errorMessage: 'Expected true, received false',
  ...overrides,
});

describe('bugDetector', () => {

  // ── determinePriority ────────────────────────────────────────────────────

  describe('determinePriority', () => {

    it('classifies orderFlow failures as critical', () => {
      const f = makeFailure({
        filePath: '/src/core/__tests__/orderFlow.test.ts',
        testName: 'IDLE transitions to BROWSING on SHOW_MENU',
        suiteName: 'orderFlow',
      });
      expect(determinePriority(f)).toBe('critical');
    });

    it('classifies cartEngine failures as critical', () => {
      const f = makeFailure({
        filePath: '/src/core/tests/cartEngine.test.ts',
        testName: 'addToCart increases total',
        suiteName: 'cartEngine',
      });
      expect(determinePriority(f)).toBe('critical');
    });

    it('classifies pricing failures as critical', () => {
      const f = makeFailure({
        filePath: '/src/core/__tests__/pricingConsistency.test.ts',
        testName: 'recalculate computes totalItems as sum of quantities',
        suiteName: 'pricingConsistency',
      });
      expect(determinePriority(f)).toBe('critical');
    });

    it('classifies test names with "order" keyword as high or critical', () => {
      const f = makeFailure({
        filePath: '/src/tests/some.test.ts',
        testName: 'should confirm order correctly',
        suiteName: 'OrderFlow',
      });
      expect(['critical', 'high']).toContain(determinePriority(f));
    });

    it('classifies runtime errors (TypeError) as high or above', () => {
      const f = makeFailure({
        filePath: '/src/lib/__tests__/some.test.ts',
        testName: 'handles edge case',
        suiteName: 'LibTest',
        errorMessage: 'TypeError: supabase.from is not a function',
      });
      expect(['critical', 'high']).toContain(determinePriority(f));
    });

    it('classifies simple assertion failures as low or medium', () => {
      const f = makeFailure({
        filePath: '/src/tests/formatting.test.ts',
        testName: 'formats greeting with proper punctuation',
        suiteName: 'Formatting',
        errorMessage: 'Expected "Hola!" received "hola"',
      });
      expect(['medium', 'low']).toContain(determinePriority(f));
    });

    it('classifies edge case tests as medium', () => {
      const f = makeFailure({
        filePath: '/src/tests/e2e/botEdgeCases.test.ts',
        testName: 'handles edge case gracefully',
        suiteName: 'EdgeCases',
        errorMessage: 'Expected true, received false',
      });
      expect(['medium', 'low']).toContain(determinePriority(f));
    });

    it('classifies crash/Timeout errors as critical regardless of path', () => {
      const f = makeFailure({
        filePath: '/src/tests/random.test.ts',
        testName: 'some random test',
        suiteName: 'Random',
        errorMessage: 'Timeout - Async callback was not invoked within the 5000ms timeout',
      });
      expect(determinePriority(f)).toBe('critical');
    });

  });

  // ── groupFailuresByModule ────────────────────────────────────────────────

  describe('groupFailuresByModule', () => {

    it('groups multiple failures from same module into one group', () => {
      const failures = [
        makeFailure({ filePath: '/src/core/__tests__/orderFlow.test.ts', testName: 'test 1', suiteName: 'orderFlow' }),
        makeFailure({ filePath: '/src/core/__tests__/orderFlow.test.ts', testName: 'test 2', suiteName: 'orderFlow' }),
        makeFailure({ filePath: '/src/core/__tests__/orderFlow.test.ts', testName: 'test 3', suiteName: 'orderFlow' }),
      ];

      const groups = groupFailuresByModule(failures);
      expect(groups).toHaveLength(1);
      expect(groups[0].module).toBe('orderFlow');
      expect(groups[0].failures).toHaveLength(3);
    });

    it('separates different modules into different groups', () => {
      const failures = [
        makeFailure({ filePath: '/src/core/__tests__/orderFlow.test.ts', testName: 'a', suiteName: 'orderFlow' }),
        makeFailure({ filePath: '/src/core/tests/cartEngine.test.ts', testName: 'b', suiteName: 'cartEngine' }),
        makeFailure({ filePath: '/src/core/__tests__/pricingConsistency.test.ts', testName: 'c', suiteName: 'pricing' }),
      ];

      const groups = groupFailuresByModule(failures);
      expect(groups).toHaveLength(3);
      expect(groups.map(g => g.module).sort()).toEqual(['cartEngine', 'orderFlow', 'pricingConsistency']);
    });

    it('uses highest priority among group members', () => {
      const failures = [
        makeFailure({
          filePath: '/src/core/__tests__/orderFlow.test.ts',
          testName: 'test a',
          suiteName: 'orderFlow',
          errorMessage: 'Expected 1, received 2',  // low
        }),
        makeFailure({
          filePath: '/src/core/__tests__/orderFlow.test.ts',
          testName: 'critical test',
          suiteName: 'orderFlow',
          errorMessage: 'TypeError: crash',  // high/critical
        }),
      ];

      const groups = groupFailuresByModule(failures);
      expect(groups[0].highestPriority).toBe('critical');
    });

    it('sorts groups by priority (critical first)', () => {
      const failures = [
        makeFailure({ filePath: '/src/tests/formatting.test.ts', testName: 'fmt test', suiteName: 'fmt', errorMessage: 'Expected x' }),
        makeFailure({ filePath: '/src/core/__tests__/orderFlow.test.ts', testName: 'flow test', suiteName: 'orderFlow', errorMessage: 'TypeError: crash' }),
      ];

      const groups = groupFailuresByModule(failures);
      expect(groups[0].highestPriority).toBe('critical');
    });

  });

  // ── extractFailuresFromJestJson ──────────────────────────────────────────

  describe('extractFailuresFromJestJson', () => {

    it('returns empty array when all tests pass', () => {
      const results = {
        testResults: [
          {
            status: 'passed',
            testFilePath: '/src/some.test.ts',
            assertionResults: [{ status: 'passed', fullName: 'test 1' }],
          },
        ],
      };
      expect(extractFailuresFromJestJson(results)).toHaveLength(0);
    });

    it('extracts single failure', () => {
      const results = {
        testResults: [
          {
            status: 'failed',
            testFilePath: '/src/core/my.test.ts',
            assertionResults: [
              { status: 'passed', fullName: 'passes', ancestorTitles: ['Suite'] },
              {
                status: 'failed',
                fullName: 'Suite > fails',
                ancestorTitles: ['Suite'],
                failureMessages: ['Expected true, received false\n  at Object.<anonymous> (test.ts:5:10)'],
              },
            ],
          },
        ],
      };

      const failures = extractFailuresFromJestJson(results);
      expect(failures).toHaveLength(1);
      expect(failures[0].testName).toBe('Suite > fails');
      expect(failures[0].suiteName).toBe('Suite');
      expect(failures[0].filePath).toBe('/src/core/my.test.ts');
      expect(failures[0].errorMessage).toBe('Expected true, received false');
    });

    it('extracts multiple failures from multiple suites', () => {
      const results = {
        testResults: [
          {
            status: 'failed',
            testFilePath: '/src/a.test.ts',
            assertionResults: [
              { status: 'failed', fullName: 'A > test1', ancestorTitles: ['A'], failureMessages: ['err1'] },
              { status: 'failed', fullName: 'A > test2', ancestorTitles: ['A'], failureMessages: ['err2'] },
            ],
          },
          {
            status: 'failed',
            testFilePath: '/src/b.test.ts',
            assertionResults: [
              { status: 'failed', fullName: 'B > test3', ancestorTitles: ['B'], failureMessages: ['err3'] },
            ],
          },
        ],
      };

      const failures = extractFailuresFromJestJson(results);
      expect(failures).toHaveLength(3);
      expect(failures.map(f => f.testName)).toEqual(['A > test1', 'A > test2', 'B > test3']);
    });

    it('skips passed suites entirely', () => {
      const results = {
        testResults: [
          { status: 'passed', assertionResults: [], testFilePath: '/src/pass.test.ts' },
          {
            status: 'failed',
            testFilePath: '/src/fail.test.ts',
            assertionResults: [
              { status: 'failed', fullName: 'fail', ancestorTitles: [], failureMessages: ['err'] },
            ],
          },
        ],
      };
      expect(extractFailuresFromJestJson(results)).toHaveLength(1);
    });

    it('handles missing failureMessages gracefully', () => {
      const results = {
        testResults: [
          {
            status: 'failed',
            testFilePath: '/src/edge.test.ts',
            assertionResults: [
              {
                status: 'failed',
                fullName: 'edge case',
                ancestorTitles: ['Edge'],
                failureMessages: undefined,
              },
            ],
          },
        ],
      };

      expect(() => extractFailuresFromJestJson(results)).not.toThrow();
      const failures = extractFailuresFromJestJson(results);
      expect(failures[0].errorMessage).toBe('No error message');
    });

  });

  // ── processFailure (backward compat — single failure) ────────────────────

  describe('processFailure', () => {

    it('skips when GITHUB_TOKEN is missing', async () => {
      const report = await processFailure(makeFailure(), []);
      expect(report.skipped).toBe(true);
      expect(report.reason).toMatch(/Missing GitHub/);
      expect(report.priority).toBeDefined();
      expect(report.failures).toHaveLength(1);
      expect(report.module).toBeDefined();
    });

    it('skips when duplicate module issue exists', async () => {
      const existingIssue: any = {
        title: '🔴 [critical] myComponent: should do the thing',
        html_url: 'https://github.com/o/r/issues/1',
        number: 1,
        state: 'open',
        labels: [{ name: 'bug' }],
      };

      const report = await processFailure(makeFailure(), [existingIssue]);
      expect(report.skipped).toBe(true);
      expect(report.reason).toMatch(/Duplicate/);
      expect(report.module).toBe('myComponent');
    });

    it('returns report with failure info even when skipped', async () => {
      const failure = makeFailure({ testName: 'unique test here' });
      const report = await processFailure(failure, []);
      expect(report.failures).toHaveLength(1);
      expect(report.failures[0]).toBe(failure);
      expect(report.skipped).toBe(true);
    });

  });

  // ── processFailures (batch with grouping) ────────────────────────────────

  describe('processFailures', () => {

    it('returns empty array for empty input', async () => {
      const reports = await processFailures([]);
      expect(reports).toHaveLength(0);
    });

    it('groups multiple failures from same module into one report', async () => {
      const f1 = makeFailure({
        filePath: '/src/core/__tests__/orderFlow.test.ts',
        testName: 'test one',
        suiteName: 'orderFlow',
      });
      const f2 = makeFailure({
        filePath: '/src/core/__tests__/orderFlow.test.ts',
        testName: 'test two',
        suiteName: 'orderFlow',
      });

      const reports = await processFailures([f1, f2]);
      // Should be 1 report (grouped) not 2
      expect(reports).toHaveLength(1);
      expect(reports[0].failures).toHaveLength(2);
      expect(reports[0].module).toBe('orderFlow');
      expect(reports[0].skipped).toBe(true); // no GITHUB_TOKEN
    });

    it('creates separate reports for different modules', async () => {
      const f1 = makeFailure({
        filePath: '/src/core/__tests__/orderFlow.test.ts',
        testName: 'flow test',
        suiteName: 'orderFlow',
      });
      const f2 = makeFailure({
        filePath: '/src/core/tests/cartEngine.test.ts',
        testName: 'cart test',
        suiteName: 'cartEngine',
      });
      const f3 = makeFailure({
        filePath: '/src/tests/formatting.test.ts',
        testName: 'fmt test',
        suiteName: 'fmt',
      });

      const reports = await processFailures([f1, f2, f3]);
      expect(reports).toHaveLength(3);
      expect(reports.every(r => r.skipped)).toBe(true);
    });

    it('uses highest priority from group', async () => {
      const fLow = makeFailure({
        filePath: '/src/core/__tests__/orderFlow.test.ts',
        testName: 'minor issue',
        suiteName: 'orderFlow',
        errorMessage: 'Expected 1, received 2',
      });
      const fCritical = makeFailure({
        filePath: '/src/core/__tests__/orderFlow.test.ts',
        testName: 'crash',
        suiteName: 'orderFlow',
        errorMessage: 'TypeError: cannot read property of undefined',
      });

      const reports = await processFailures([fLow, fCritical]);
      expect(reports).toHaveLength(1);
      expect(reports[0].priority).toBe('critical');
    });

  });

});
