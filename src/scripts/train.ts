import { train } from '../core/autoTrainer';
import { runEvaluation } from '../tests/auto-evaluator';

/**
 * Main entry point for the automated training pipeline.
 * 
 * 1. Runs full evaluation to populate failures.json.
 * 2. Runs the auto-trainer to generate, validate, and save new rules.
 * 3. Shows accuracy dashboard.
 */
export async function runAutoLearning() {
  console.log('🚀 Starting Automated Training Pipeline...\n');

  // 1. Capture baseline accuracy
  console.log('━━━ Step 1: Initial Evaluation ━━━');
  const before = await runEvaluation(false);

  // 2. Run the training cycle
  console.log('\n━━━ Step 2: Training ━━━');
  await train();

  // 3. Measure final accuracy
  console.log('\n━━━ Step 3: Final Evaluation ━━━');
  const after = await runEvaluation(true);

  // 4. Dashboard
  const delta = after - before;
  const sign = delta >= 0 ? '+' : '';
  const icon = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';

  console.log('\n┌──────────────────────────────────┐');
  console.log('│   🧠 LEARNING RESULTS DASHBOARD  │');
  console.log('├──────────────────────────────────┤');
  console.log(`│  Before:  ${before.toFixed(2)}%`.padEnd(35) + '│');
  console.log(`│  After:   ${after.toFixed(2)}%`.padEnd(35) + '│');
  console.log(`│  Delta:   ${sign}${delta.toFixed(2)}% ${icon}`.padEnd(35) + '│');
  console.log('└──────────────────────────────────┘');

  if (delta > 0) {
    console.log(`\n✅ ${sign}${delta.toFixed(2)}% improvement`);
  } else if (delta < 0) {
    console.log(`\n⚠️  ${delta.toFixed(2)}% regression (rules reverted)`);
  } else {
    console.log('\n➡️  No change in accuracy');
  }
}

// Only run automatically if executed directly
if (require.main === module || process.argv[1]?.endsWith('train.ts')) {
  runAutoLearning().catch(console.error);
}
