import { getBestStrategySync, getNextStrategy } from '../antojo';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("--- Running strategy Tests ---");

  // Test 1: Fallback rotation works
  const s0 = getNextStrategy(0);
  const s1 = getNextStrategy(1);
  assert(s0 === 'antojo', "Strategy 0 is antojo");
  assert(s1 === 'fomo', "Strategy 1 is fomo");
  assert(s0 !== s1, "Strategy rotates correctly");

  // Test 2: getBestStrategySync returns a valid strategy immediately (fallback)
  const best = getBestStrategySync();
  assert(['antojo', 'fomo', 'social', 'anchor'].includes(best), "Best strategy returns valid type");

  // Test 3: Caching (internal behavior check)
  const best2 = getBestStrategySync();
  assert(best === best2, "Synchronous calls return same strategy (cached or fallback)");

  console.log("--- strategy Tests Passed ---");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
