import { resolveNextState } from '../orderFlow';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("--- Running orderFlow Tests ---");

  // Test 1: Valid transition inicio -> explorando
  const s1 = resolveNextState('inicio', 'explorar');
  assert(s1 === 'explorando', "inicio -> explorando via explorar");

  // Test 2: Valid transition explorando -> ordenando
  const s2 = resolveNextState('explorando', 'confirmar');
  assert(s2 === 'ordenando', "explorando -> ordenando via confirmar");

  // Test 3: Invalid transition blocks (stays in same state or default)
  // Note: orderFlow logic depends on implementation, usually unknown intent doesn't move stage
  const s3 = resolveNextState('inicio', 'UNKNOWN' as any);
  assert(s3 === 'inicio', "UNKNOWN intent keeps state at inicio");

  console.log("--- orderFlow Tests Passed ---");
}

runTests().catch(err => {
  console.error(err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});
