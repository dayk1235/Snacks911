import './env-setup';
import { botTestCases } from './botTestCases';
import { runBot } from '../core/runBot';
import { evaluateResponse } from './evaluateResponse';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  pass: boolean;
  score: number;
  response: string;
  details: {
    intentMatch: boolean;
    includesCheck: boolean;
    excludesCheck: boolean;
  };
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
}

export interface TestReport {
  results: TestResult[];
  summary: TestSummary;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

/**
 * executeTests — Automated test runner for chatbot evaluation.
 *
 * Simulates multi-turn conversations for each test case and scores
 * the final bot response using the standardised evaluateResponse scorer.
 *
 * Returns a full report with per-test results and a global summary.
 */
export async function executeTests(): Promise<TestReport> {
  const results: TestResult[] = [];

  for (const test of botTestCases) {
    let finalResponse = '';
    let lastResult: any = null;

    // Unique session per test case to prevent context leakage
    const testSessionId = `test-${test.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

    // ── Simulate multi-turn conversation ──────────────────────────────────
    for (const message of test.conversation) {
      lastResult = await runBot(message, testSessionId);
      finalResponse = lastResult.text;
    }

    // ── Score the final response ──────────────────────────────────────────
    const evaluation = evaluateResponse(
      lastResult.text,
      lastResult.intent,
      test.expected,
      lastResult.full?.products || []
    );

    results.push({
      name: test.name,
      pass: evaluation.pass,
      score: evaluation.score,
      response: finalResponse,
      details: evaluation.details,
    });

    // Logging per test
    console.log(`[Test] ${test.name} | ${evaluation.pass ? 'PASS' : 'FAIL'} | Score: ${evaluation.score}`);

    if (!evaluation.pass) {
      const reason = !evaluation.details.intentMatch ? 'intent_mismatch' : 
                     !evaluation.details.includesCheck ? 'missing_keywords' :
                     'prohibited_keywords';
      console.log(`[AITestFailure] name=${test.name} score=${evaluation.score} reason=${reason}`);
    }
  }

  // ── Global Summary ────────────────────────────────────────────────────────
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  const averageScore = total > 0
    ? results.reduce((acc, r) => acc + r.score, 0) / total
    : 0;

  const summary: TestSummary = { total, passed, failed, averageScore };

  // Logging summary
  console.log(`[AITestSummary] total=${total} passed=${passed} avg=${averageScore.toFixed(2)}`);

  return { results, summary };
}

// ─── CLI Entry ────────────────────────────────────────────────────────────────

// Run directly with: npx tsx src/tests/runBotTests.ts
if (require.main === module) {
  (async () => {
    console.log('🚀 Starting Bot Evaluation Runner...\n');

    const { results, summary } = await executeTests();

    // Per-test output
    results.forEach(res => {
      const icon = res.pass ? '✅' : '❌';
      console.log(`${icon}  [${res.name}]  Score: ${res.score}/100`);
      if (!res.pass) {
        const { intentMatch, includesCheck, excludesCheck } = res.details;
        if (!intentMatch)   console.log(`      → Intent mismatch`);
        if (!includesCheck) console.log(`      → Missing required keywords`);
        if (!excludesCheck) console.log(`      → Prohibited keywords found`);
        console.log(`      Response: "${res.response.slice(0, 120)}..."`);
      }
    });

    // Global summary
    console.log('\n─────────────────────────────────────');
    console.log(`Total:         ${summary.total}`);
    console.log(`Passed:        ${summary.passed}`);
    console.log(`Failed:        ${summary.failed}`);
    console.log(`Avg Score:     ${summary.averageScore.toFixed(2)}/100`);
    console.log('─────────────────────────────────────');
  })();
}
