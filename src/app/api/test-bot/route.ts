import { NextResponse } from 'next/server';
import { executeTests } from '@/tests/runBotTests';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-bot
 *
 * Triggers the full chatbot evaluation suite and returns a structured report.
 * Intended for internal use only — do not expose on production public traffic.
 *
 * Response shape:
 * {
 *   total, passed, failed, averageScore,
 *   results: [{ name, pass, score, response, details }]
 * }
 */
export async function GET() {
  const startTime = Date.now();
  console.log('[test-bot] ▶ Starting evaluation suite...');

  try {
    const { results, summary } = await executeTests();

    const elapsed = Date.now() - startTime;
    console.log(`[test-bot] ✅ Evaluation complete in ${elapsed}ms`);
    console.log(`[test-bot]    Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Avg: ${summary.averageScore.toFixed(1)}`);

    // Log results using structured format
    results.forEach(r => {
      console.log(`[Test] ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | Score: ${r.score}`);
      
      if (!r.pass) {
        const reason = !r.details.intentMatch ? 'intent_mismatch' : 
                       !r.details.includesCheck ? 'missing_keywords' :
                       'prohibited_keywords';
        console.warn(`[AITestFailure] name=${r.name} score=${r.score} reason=${reason}`);
        console.warn(`[test-bot]    Response: "${r.response.slice(0, 120)}"`);
      }
    });

    console.log(`[AITestSummary] total=${summary.total} passed=${summary.passed} avg=${summary.averageScore.toFixed(2)}`);

    return NextResponse.json({
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      averageScore: Number(summary.averageScore.toFixed(2)),
      elapsedMs: elapsed,
      results: results.map(r => ({
        name: r.name,
        pass: r.pass,
        score: r.score,
        response: r.response,
        details: r.details,
      })),
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[test-bot] 💥 Evaluation suite crashed:', message);

    return NextResponse.json(
      { error: 'Evaluation suite failed', detail: message },
      { status: 500 }
    );
  }
}
