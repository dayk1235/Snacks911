/**
 * src/core/bugDetector.ts — Automatic bug-to-issue pipeline.
 *
 * Pure TypeScript. No side effects at import time.
 *
 * When tests fail, this module:
 *   1. Parses Jest JSON output for failures
 *   2. Groups failures by module to avoid issue spam
 *   3. Classifies each group by highest priority
 *   4. Checks GitHub for existing issues (deduplication)
 *   5. Creates ONE issue per module group with all failures
 *   6. Labels: bug, ai-generated, priority:*, <module>
 */

import {
  createGitHubIssue,
  listOpenIssuesByLabel,
  type GitHubIssue,
} from '@/lib/github';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BugPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TestFailure {
  testName: string;
  suiteName: string;
  filePath: string;
  errorMessage: string;
  stackTrace?: string;
}

export interface FailureGroup {
  module: string;
  failures: TestFailure[];
  highestPriority: BugPriority;
}

export interface BugReport {
  failures: TestFailure[];
  module: string;
  priority: BugPriority;
  issueUrl?: string;
  skipped: boolean;
  reason?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUG_LABEL = 'bug';
const AI_LABEL = 'ai-generated';

// ─── Priority Classification ─────────────────────────────────────────────────

export function determinePriority(failure: TestFailure): BugPriority {
  const filePath = failure.filePath.toLowerCase();
  const testName = `${failure.suiteName} ${failure.testName}`.toLowerCase();
  const errorMessage = failure.errorMessage.toLowerCase();
  let score = 0;

  // ── File path signals ──
  if (/src\/core\/(tests\/)?(orderFlow|cartEngine|botEngine|pricing)/i.test(filePath)) score += 30;
  else if (/src\/core\//i.test(filePath)) score += 20;
  else if (/src\/lib\//i.test(filePath)) score += 10;

  // ── Test name signals ──
  if (/(\border\b|order|pricing|payment|checkout|confirm)/i.test(testName)) score += 15;
  if (/(cart|upsell|flow|engine|pipeline)/i.test(testName)) score += 10;
  if (/(edge|fallback|recovery|nonsense|graceful)/i.test(testName)) score += 5;

  // ── Error type signals ──
  if (/typeerror|referenceerror|syntaxerror|rangeerror|is not a function|cannot read propert/i.test(errorMessage)) score += 20;
  if (/crash|uncaught|fatal|timeout|timed out/i.test(errorMessage)) score += 30;
  if (/expected|received|assert/i.test(errorMessage)) score += 2;

  // ── Threshold mapping ──
  if (score >= 30) return 'critical';
  if (score >= 20) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

const PRIORITY_EMOJI: Record<BugPriority, string> = {
  critical: '🔴',
  high:     '🟠',
  medium:   '🟡',
  low:      '🟢',
};

const PRIORITY_LABEL: Record<BugPriority, string> = {
  critical: 'priority:critical',
  high:     'priority:high',
  medium:   'priority:medium',
  low:      'priority:low',
};

// ─── Module extraction ────────────────────────────────────────────────────────

function extractSuspectedModule(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)src\/(?:core|lib|tests)\/[^/]+\/([^/]+)\.test\.(?:ts|tsx)$/);
  if (match) return match[1];
  const coreMatch = normalized.match(/(?:^|\/)src\/core\/([^/]+)\.test\.(?:ts|tsx)$/);
  if (coreMatch) return coreMatch[1];
  return 'unknown';
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

export function groupFailuresByModule(failures: TestFailure[]): FailureGroup[] {
  const map = new Map<string, TestFailure[]>();

  for (const f of failures) {
    const module = extractSuspectedModule(f.filePath);
    if (!map.has(module)) map.set(module, []);
    map.get(module)!.push(f);
  }

  const groups: FailureGroup[] = [];
  for (const [module, groupFailures] of map) {
    const priorities = groupFailures.map(f => determinePriority(f));
    const highestPriority = priorities.reduce((highest, p) => {
      const order: BugPriority[] = ['critical', 'high', 'medium', 'low'];
      return order.indexOf(p) < order.indexOf(highest) ? p : highest;
    }, 'low' as BugPriority);

    groups.push({ module, failures: groupFailures, highestPriority });
  }

  // Sort groups by priority (critical first)
  const order: BugPriority[] = ['critical', 'high', 'medium', 'low'];
  groups.sort((a, b) => order.indexOf(a.highestPriority) - order.indexOf(b.highestPriority));

  return groups;
}

// ─── Title / Body builders ────────────────────────────────────────────────────

function sanitizeTitle(name: string): string {
  return name
    .replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/g, '')
    .trim()
    .slice(0, 100);
}

function buildGroupedTitle(group: FailureGroup): string {
  const count = group.failures.length;
  const suffix = count === 1
    ? sanitizeTitle(group.failures[0].testName)
    : `${count} test failures`;
  return `${PRIORITY_EMOJI[group.highestPriority]} [${group.highestPriority}] ${group.module}: ${suffix}`;
}

function summarizeErrorPatterns(failures: TestFailure[]): string[] {
  const patterns = new Map<string, number>();

  for (const f of failures) {
    const msg = f.errorMessage.toLowerCase();
    let pattern = 'assertion mismatch';

    if (/typeerror|referenceerror|syntaxerror|rangeerror/i.test(msg)) pattern = 'runtime error (TypeError/ReferenceError)';
    else if (/is not a function/i.test(msg)) pattern = 'missing function/method';
    else if (/cannot read propert/i.test(msg)) pattern = 'null/undefined access';
    else if (/timeout|timed out/i.test(msg)) pattern = 'timeout';
    else if (/crash|uncaught|fatal/i.test(msg)) pattern = 'crash/uncaught error';
    else if (/expected|received/i.test(msg)) pattern = 'assertion mismatch';

    patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
  }

  return [...patterns.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([p, c]) => `- ${p} (${c} test${c > 1 ? 's' : ''})`);
}

function buildGroupedBody(group: FailureGroup): string {
  const lines: string[] = [
    `## ${group.module}: ${group.failures.length} failing test${group.failures.length > 1 ? 's' : ''}`,
    '',
    '### Failures',
    '',
    '| # | Test | Error |',
    '|---|------|-------|',
  ];

  for (let i = 0; i < group.failures.length; i++) {
    const f = group.failures[i];
    const shortName = sanitizeTitle(f.testName);
    const shortError = f.errorMessage.slice(0, 80).replace(/\|/g, '\\|');
    lines.push(`| ${i + 1} | ${shortName} | ${shortError} |`);
  }

  lines.push('', '### Error Patterns', '');
  for (const summary of summarizeErrorPatterns(group.failures)) {
    lines.push(summary);
  }

  // Include first stack trace if available
  const firstStack = group.failures.find(f => f.stackTrace)?.stackTrace;
  if (firstStack) {
    lines.push('', '### Stack Trace (sample)', '', '```', firstStack.slice(0, 2000), '```');
  }

  lines.push(
    '',
    '---',
    `_Auto-generated by bugDetector. ${group.failures.length} test${group.failures.length > 1 ? 's' : ''} failed in \`${group.module}\` at ${new Date().toISOString()}._`,
  );

  return lines.join('\n');
}

// ─── Dedup ──────────────────────────────────────────────────────────────────

function isLikelyDuplicate(group: FailureGroup, existingIssues: GitHubIssue[]): boolean {
  const moduleName = group.module.toLowerCase();
  return existingIssues.some(
    (issue) => issue.title.toLowerCase().includes(moduleName),
  );
}

// ─── Single failure processing (backward compat) ──────────────────────────────

export async function processFailure(
  failure: TestFailure,
  existingIssues?: GitHubIssue[],
): Promise<BugReport> {
  const group = groupFailuresByModule([failure])[0];
  return processGroup(group, existingIssues);
}

// ─── Group processing ─────────────────────────────────────────────────────────

async function processGroup(
  group: FailureGroup,
  existingIssues?: GitHubIssue[],
): Promise<BugReport> {
  const title = buildGroupedTitle(group);
  const body = buildGroupedBody(group);
  const labels = [BUG_LABEL, AI_LABEL, PRIORITY_LABEL[group.highestPriority], group.module];

  // Deduplication check
  try {
    const issues = existingIssues ?? (await listOpenIssuesByLabel([BUG_LABEL]));

    if (isLikelyDuplicate(group, issues)) {
      return {
        failures: group.failures,
        module: group.module,
        priority: group.highestPriority,
        skipped: true,
        reason: `Duplicate: existing issue for module "${group.module}"`,
      };
    }
  } catch {
    // If dedup check fails, proceed anyway (fail-open)
  }

  // Check for required env vars
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
    return {
      failures: group.failures,
      module: group.module,
      priority: group.highestPriority,
      skipped: true,
      reason: 'Missing GitHub env vars (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)',
    };
  }

  try {
    const issue = await createGitHubIssue(title, body, labels);
    return {
      failures: group.failures,
      module: group.module,
      priority: group.highestPriority,
      issueUrl: issue.html_url,
      skipped: false,
    };
  } catch (err: any) {
    return {
      failures: group.failures,
      module: group.module,
      priority: group.highestPriority,
      skipped: true,
      reason: `GitHub API error: ${err.message}`,
    };
  }
}

// ─── Batch processing (with grouping) ─────────────────────────────────────────

export async function processFailures(
  failures: TestFailure[],
): Promise<BugReport[]> {
  if (failures.length === 0) return [];

  const groups = groupFailuresByModule(failures);

  // Fetch existing issues once (shared dedup)
  let existingIssues: GitHubIssue[] = [];
  try {
    existingIssues = await listOpenIssuesByLabel([BUG_LABEL]);
  } catch {
    // Proceed without dedup if fetch fails
  }

  const reports: BugReport[] = [];
  for (const group of groups) {
    const report = await processGroup(group, existingIssues);
    reports.push(report);
  }

  return reports;
}

// ─── Jest JSON extraction ─────────────────────────────────────────────────────

export function extractFailuresFromJestJson(results: any): TestFailure[] {
  const failures: TestFailure[] = [];

  const testResults = results?.testResults ?? [];

  for (const suite of testResults) {
    if (suite.status === 'passed') continue;

    const filePath = suite.testFilePath ?? 'unknown';

    for (const test of suite.assertionResults ?? []) {
      if (test.status === 'passed') continue;

      failures.push({
        testName: test.fullName || test.title || 'unknown test',
        suiteName: (test.ancestorTitles ?? []).join(' > ') || suite.name || 'unknown suite',
        filePath,
        errorMessage: test.failureMessages?.[0]?.split('\n')[0] ?? 'No error message',
        stackTrace: test.failureMessages?.[0] ?? undefined,
      });
    }
  }

  return failures;
}
