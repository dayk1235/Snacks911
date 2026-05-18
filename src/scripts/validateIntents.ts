import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getUnifiedIntent } from '../core/intentDetector';

const testCases = [
  // 1. Menu browsing
  "quiero ver el menu",
  "que tienes?",
  "hay combos?",
  
  // 2. Ordering
  "quiero unas papas",
  "dame boneless",
  "2 alitas bbq",
  
  // 3. Ambiguous
  "mmm no se",
  "que recomiendas?",
  
  // 4. Edge cases
  "kiero bonelesss bbq", // slang/typo
  "quiero ver el menu y tambien unas papas", // mixed
  "no quiero alitas", // negation
  "sin salsa por favor", // negation
  "ver combos y pedir alitas", // multi-intent
  "" // empty
];

async function runTests() {
  console.log("=== STARTING INTENT VALIDATION ===\n");
  
  for (const input of testCases) {
    try {
      const result = await getUnifiedIntent(input);
      console.log(`INPUT: "${input}"`);
      console.log(`PRIMARY INTENT: ${result.primaryIntent || result.intent}`);
      console.log(`ALL INTENTS: ${JSON.stringify(result.intents)}`);
      console.log(`CONFIDENCE: ${result.confidence.toFixed(2)}`);
      console.log(`SOURCE: ${result.source}`);
      if (result.entities) {
        console.log(`ENTITIES: ${JSON.stringify(result.entities, null, 2)}`);
      }
      console.log("-----------------------------------\n");
    } catch (error) {
      console.error(`FAILED: "${input}"`, error);
    }
  }
  
  console.log("=== VALIDATION COMPLETE ===");
}

runTests();
