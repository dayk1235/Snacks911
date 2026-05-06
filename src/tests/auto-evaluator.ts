import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env before anything else
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// Types from core
import { ProductRefs } from '../core/types';

// Mock ProductRefs for the evaluator
const mockProducts: ProductRefs = {
  comboName: 'Combo 911',
  comboPrice: 119,
  papasName: 'Papas Loaded',
  papasPrice: 69,
  bebidaName: 'Refresco 600ml',
  bebidaPrice: 25,
  postreName: 'Brownie con Helado',
  postrePrice: 59,
  comboBonelessName: 'Combo Boneless',
  comboBonelessPrice: 99,
  ahorroBoneless: 20,
  currentTotal: 0,
  hasPapas: false,
  hasBebida: false,
  hasPostre: false
};

const mapping: Record<string, string[]> = {
  'SHOW_MENU': ['list_products', 'exploracion', 'SHOW_MENU'],
  'SHOW_CATEGORY': ['list_products', 'SHOW_CATEGORY'],
  'ADD_TO_CART': ['pedido', 'aceptacion', 'ADD_TO_CART'],
  'RECOMMEND': ['duda', 'hambre', 'exploracion', 'urgencia', 'RECOMMEND'],
  'VIEW_CART': ['exploracion', 'edicion', 'other', 'VIEW_CART'],
  'EDIT_CART': ['edicion', 'EDIT_CART'],
  'CONFIRM_ORDER': ['aceptacion', 'pedido', 'CONFIRM_ORDER'],
  'CHECKOUT': ['pedido', 'aceptacion', 'CHECKOUT']
};

export async function runEvaluation(silent = false) {
  // Dynamic imports to ensure env is loaded
  const { detectIntent } = await import('../core/intentDetector');
  const { handleMessageModular, INITIAL_STATE } = await import('../core/responseEngine');
  const { saveFailure } = await import('../lib/logger/learningLogger');

  const filePath = path.join(__dirname, '../data/training/conversations.json');
  const conversations = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const report: any = {
    timestamp: new Date().toISOString(),
    totalCases: conversations.length,
    summary: {
      accuracy: 0,
      intentAccuracy: 0,
      allergyAccuracy: 0,
      constraintsAccuracy: 0
    },
    classifications: {
      INTENT_MISMATCH: [] as any[],
      ALLERGY_LEAK: [] as any[],
      INCLUDE_MISS: [] as any[],
      EXCLUDE_LEAK: [] as any[]
    },
    failures: [] as any[]
  };

  let passedIntent = 0;
  let passedAllergies = 0;
  let passedConstraints = 0;

  for (const testCase of conversations) {
    // 1. Run detectIntent
    const intentResult = detectIntent(testCase.input);
    const actualIntent = intentResult.intent;

    console.log(`[Input]: "${testCase.input}"`);
    console.log(`[Scores]:`, intentResult.scores);
    console.log(`[Entities]:`, JSON.stringify(intentResult.entities, null, 2));    
    // 2. Run handleMessageModular
    const response = await handleMessageModular(testCase.input, { ...INITIAL_STATE, phone: '521234567890' }, mockProducts);
    const finalState = response.nextState;
    const responseText = response.text.toLowerCase();

    // 3. Validate Intent
    const expectedIntents = mapping[testCase.expected_intent] || [testCase.expected_intent];
    const isIntentCorrect = expectedIntents.includes(actualIntent);
    if (isIntentCorrect) passedIntent++;
    else {
      report.classifications.INTENT_MISMATCH.push({
        id: testCase.id,
        input: testCase.input,
        expected: testCase.expected_intent,
        actual: actualIntent,
        fix_suggestion: `Add keywords from "${testCase.input}" to rules for ${testCase.expected_intent} in intentDetector.ts`
      });
      await saveFailure(testCase.input, actualIntent, 'INTENT_MISMATCH', response.text);
    }

    // 4. Validate Allergies
    const expectedAllergies = (testCase.constraints.allergies || []).map((a: string) => a.toLowerCase().trim());
    const actualAllergies = (finalState.allergies || []).map((a: string) => a.toLowerCase().trim());
    
    const allergyLeak = expectedAllergies.find((a: string) => !actualAllergies.includes(a));
    const isAllergiesCorrect = !allergyLeak;
    
    if (isAllergiesCorrect) passedAllergies++;
    else {
      report.classifications.ALLERGY_LEAK.push({
        id: testCase.id,
        input: testCase.input,
        missing_allergy: allergyLeak,
        fix_suggestion: `Update extractAllergies regex to capture "${allergyLeak}" from input "${testCase.input}"`
      });
      await saveFailure(testCase.input, actualIntent, 'ALLERGY_LEAK', response.text);
    }

    // 5. Validate Include/Exclude
    const expectedInclude = testCase.expected_entities.include || testCase.constraints.include || [];
    const expectedExclude = testCase.expected_entities.exclude || testCase.constraints.exclude || [];
    
    let includeMiss = null;
    let excludeLeak = null;

    for (const inc of expectedInclude) {
      if (!responseText.includes(inc.toLowerCase())) {
        includeMiss = inc;
        break;
      }
    }

    for (const exc of expectedExclude) {
      if (responseText.includes(exc.toLowerCase())) {
        excludeLeak = exc;
        break;
      }
    }

    if (!includeMiss && !excludeLeak) passedConstraints++;

    if (includeMiss) {
      report.classifications.INCLUDE_MISS.push({
        id: testCase.id,
        input: testCase.input,
        missing_ingredient: includeMiss,
        fix_suggestion: `Ensure recommendation engine ranks products containing "${includeMiss}" higher when present in intent`
      });
      await saveFailure(testCase.input, actualIntent, 'INCLUDE_MISS', response.text);
    }

    if (excludeLeak) {
      report.classifications.EXCLUDE_LEAK.push({
        id: testCase.id,
        input: testCase.input,
        leaked_ingredient: excludeLeak,
        fix_suggestion: `Verify that "${excludeLeak}" is added to exclusions/allergies and filterProducts is called before generating response`
      });
      await saveFailure(testCase.input, actualIntent, 'EXCLUDE_LEAK', response.text);
    }

    // Record total failure
    if (!isIntentCorrect || !isAllergiesCorrect || includeMiss || excludeLeak) {
      report.failures.push({
        id: testCase.id,
        input: testCase.input,
        isIntentCorrect,
        isAllergiesCorrect,
        includeMiss,
        excludeLeak,
        actualIntent,
        actualAllergies
      });
    }
  }

  report.summary.intentAccuracy = (passedIntent / report.totalCases) * 100;
  report.summary.allergyAccuracy = (passedAllergies / report.totalCases) * 100;
  report.summary.constraintsAccuracy = (passedConstraints / report.totalCases) * 100;
  report.summary.accuracy = (report.summary.intentAccuracy + report.summary.allergyAccuracy + report.summary.constraintsAccuracy) / 3;

  if (!silent) {
    const reportPath = path.join(__dirname, '../../evaluation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('=== EVALUATION SUMMARY ===');
    console.log(`Total Cases: ${report.totalCases}`);
    console.log(`Intent Accuracy: ${report.summary.intentAccuracy.toFixed(2)}%`);
    console.log(`Allergy Accuracy: ${report.summary.allergyAccuracy.toFixed(2)}%`);
    console.log(`Constraints Accuracy: ${report.summary.constraintsAccuracy.toFixed(2)}%`);
    console.log(`Final Score: ${report.summary.accuracy.toFixed(2)}%`);
    console.log(`\nDetailed report generated: evaluation-report.json`);
  }

  return report.summary.accuracy;
}

// Only run automatically if executed directly
if (require.main === module || process.argv[1]?.endsWith('evaluate.ts')) {
  runEvaluation().catch(console.error);
}
