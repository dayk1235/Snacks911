import fs from 'fs';
import path from 'path';
import { Intent } from './types';
import { runEvaluation } from '../tests/auto-evaluator';

interface FailureEntry {
  input: string;
  detectedIntent: string;
  failureType: string;
  output: string;
  timestamp: string;
}

interface LearnedRule {
  pattern: string;
  intent: Intent;
  priority: number;
  hits: number;
}

const MAX_RULES = 100;

/**
 * Normalizes text: lowercase, no accents, trim, no symbols.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/gi, '') // Remove symbols
    .trim();
}

const FAILURES_FILE = path.join(process.cwd(), 'src/data/learning/failures.json');
const RULES_FILE = path.join(process.cwd(), 'src/data/learning/learnedRules.json');

/**
 * Loads failures from the centralized log.
 */
export function loadFailures(): FailureEntry[] {
  try {
    if (!fs.existsSync(FAILURES_FILE)) return [];
    return JSON.parse(fs.readFileSync(FAILURES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

/**
 * Analyzes failures and generates new intent mapping rules by grouping common patterns.
 * Only generates a rule if the pattern has at least 3 occurrences.
 */
export function generateRules(failures: FailureEntry[]): LearnedRule[] {
  const patternCounts: Record<string, { count: number, intent: Intent }> = {};
  const actionKeywords = [
    { word: 'quiero', intent: 'pedido' as Intent },
    { word: 'dame', intent: 'pedido' as Intent },
    { word: 'ponme', intent: 'pedido' as Intent },
    { word: 'pido', intent: 'pedido' as Intent },
    { word: 'ver', intent: 'list_products' as Intent },
    { word: 'mostrar', intent: 'list_products' as Intent },
    { word: 'que hay', intent: 'list_products' as Intent },
    { word: 'que tienen', intent: 'list_products' as Intent },
  ];

  for (const failure of failures) {
    if (failure.failureType !== 'INTENT_MISMATCH') continue;

    const normalizedInput = normalizeText(failure.input);
    if (!normalizedInput) continue;

    // Count occurrences of keywords
    for (const action of actionKeywords) {
      if (normalizedInput.includes(action.word)) {
        let targetIntent = action.intent;

        // BLOCK: Never generate ADD_TO_CART rules when restrictions present
        const restrictionWords = [' sin ', ' no ', 'evita', 'nada de', 'quita', 'elimina', 'no puedo', 'alergic'];
        const hasRestriction = restrictionWords.some(w => normalizedInput.includes(w));
        if (hasRestriction && targetIntent === ('pedido' as Intent)) {
          targetIntent = 'duda' as Intent; // Force RECOMMEND
        }

        const key = `${action.word}:${targetIntent}`;
        if (!patternCounts[key]) {
          patternCounts[key] = { count: 0, intent: targetIntent };
        }
        patternCounts[key].count++;
        break; // Only one rule per failure
      }
    }
  }

  // Filter and convert to LearnedRule
  const rules: LearnedRule[] = [];
  const MIN_OCCURRENCES = 3;

  for (const [key, data] of Object.entries(patternCounts)) {
    if (data.count >= MIN_OCCURRENCES) {
      const pattern = key.split(':')[0];
      rules.push({
        pattern,
        intent: data.intent,
        priority: 8,
        hits: 0
      });
    }
  }

  return rules;
}

/**
 * Loads existing learned rules from disk.
 */
function loadExistingRules(): LearnedRule[] {
  try {
    if (!fs.existsSync(RULES_FILE)) return [];
    return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

/**
 * Merges new rules with existing ones, avoiding duplicates.
 */
function mergeRules(existing: LearnedRule[], candidates: LearnedRule[]): LearnedRule[] {
  const merged = [...existing];
  for (const candidate of candidates) {
    const isDuplicate = merged.some(
      r => r.pattern === candidate.pattern && r.intent === candidate.intent
    );
    if (!isDuplicate) {
      merged.push(candidate);
    }
  }
  return merged;
}

const REPORT_FILE = path.join(process.cwd(), 'src/data/learning/learning-report.json');

/**
 * Validates and saves rules only if they improve accuracy.
 * Generates learning-report.json with full audit trail.
 */
export async function train(): Promise<void> {
  console.log('[autoTrainer] Starting training cycle...');
  
  // 1. Get baseline (with current learned rules)
  const baseline = await runEvaluation(true);
  console.log(`[autoTrainer] Baseline Accuracy: ${baseline.toFixed(2)}%`);

  // 2. Load failures and generate NEW candidate rules
  const failures = loadFailures();
  const candidates = generateRules(failures);
  const existingRules = loadExistingRules();

  // Filter out candidates that already exist
  const newCandidates = candidates.filter(
    c => !existingRules.some(e => e.pattern === c.pattern && e.intent === c.intent)
  );

  const iteration = loadReportHistory().length + 1;

  const report: any = {
    iteration,
    timestamp: new Date().toISOString(),
    baselineAccuracy: parseFloat(baseline.toFixed(2)),
    newAccuracy: 0,
    delta: 0,
    decision: 'NO_CANDIDATES',
    existingRulesCount: existingRules.length,
    candidateRules: newCandidates,
    acceptedRules: [] as LearnedRule[],
    discardedRules: [] as LearnedRule[],
  };

  if (newCandidates.length === 0) {
    console.log(`[autoTrainer] Iteration #${iteration}: No new rules to learn.`);
    saveReport(report);
    return;
  }

  // 3. Merge existing + new, save temporarily
  const merged = mergeRules(existingRules, newCandidates);
  saveRules(merged);
  
  // 4. Run evaluation with merged rules
  const newAccuracy = await runEvaluation(true);
  console.log(`[autoTrainer] New Accuracy: ${newAccuracy.toFixed(2)}%`);

  report.newAccuracy = parseFloat(newAccuracy.toFixed(2));
  report.delta = parseFloat((newAccuracy - baseline).toFixed(2));

  // 5. Decision
  if (newAccuracy > baseline) {
    report.decision = 'ACCEPTED';
    report.acceptedRules = newCandidates;
    console.log(`[autoTrainer] Iteration #${iteration} SUCCESS: +${report.delta}%. Total rules: ${merged.length}`);
  } else {
    report.decision = 'REJECTED';
    report.discardedRules = newCandidates;
    saveRules(existingRules); // Revert to previous rules
    console.log(`[autoTrainer] Iteration #${iteration} REJECTED: No improvement. Reverted.`);
  }

  saveReport(report);
}

/**
 * Loads report history from disk.
 */
function loadReportHistory(): any[] {
  try {
    if (!fs.existsSync(REPORT_FILE)) return [];
    const content = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
    return Array.isArray(content) ? content : [content];
  } catch (e) {
    return [];
  }
}

/**
 * Appends iteration report to the learning report history.
 */
function saveReport(report: any): void {
  try {
    const dir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const history = loadReportHistory();
    history.push(report);
    fs.writeFileSync(REPORT_FILE, JSON.stringify(history, null, 2), 'utf8');
    console.log(`[autoTrainer] Report saved: learning-report.json (${history.length} iterations)`);
  } catch (error) {
    console.error('[autoTrainer] Failed to save report:', error);
  }
}

/**
 * Saves learned rules to disk.
 */
export function saveRules(rules: LearnedRule[]): void {
  try {
    const dir = path.dirname(RULES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Enforce cap: keep highest-usage rules
    let finalRules = rules;
    if (rules.length > MAX_RULES) {
      finalRules = [...rules]
        .sort((a, b) => (b.hits ?? 0) - (a.hits ?? 0))
        .slice(0, MAX_RULES);
      console.log(`[autoTrainer] Pruned ${rules.length - MAX_RULES} low-usage rules (cap: ${MAX_RULES})`);
    }

    fs.writeFileSync(RULES_FILE, JSON.stringify(finalRules, null, 2), 'utf8');
  } catch (error) {
    console.error('[autoTrainer] Failed to save rules:', error);
  }
}
