/**
 * src/scripts/bugDetectCli.ts
 *
 * CLI entry point for automatic bug detection.
 *
 * Usage:
 *   npm run bug:detect
 *
 * Flow:
 *   1. Runs jest --json to generate test results
 *   2. Parses failures from JSON output
 *   3. Creates GitHub issues for each unique failure
 *   4. Skips duplicates (checks existing issues by title)
 */

import { extractFailuresFromJestJson, processFailures } from '@/core/bugDetector';
import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';

const OUTPUT_FILE = resolve(process.cwd(), '.test-results.json');

function runTests(): boolean {
  console.log('🔍 Running test suite for bug detection...\n');

  try {
    execSync(
      `npx jest --no-coverage --ci --forceExit --json --outputFile="${OUTPUT_FILE}"`,
      {
        stdio: 'inherit',
        cwd: process.cwd(),
      },
    );
    return true;
  } catch (err: any) {
    // Jest exits non-zero on test failure — this is expected
    return false;
  }
}

function parseResults(): any {
  if (!existsSync(OUTPUT_FILE)) {
    console.error('❌ No test results file found.');
    return null;
  }

  try {
    const raw = readFileSync(OUTPUT_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    console.error('❌ Failed to parse test results JSON.');
    return null;
  }
}

async function main() {
  const testsPassed = runTests();
  const results = parseResults();

  // Cleanup
  try { unlinkSync(OUTPUT_FILE); } catch {}

  if (!results) {
    console.log('❌ Could not read test results.');
    process.exit(1);
  }

  const numFailed = results.numFailedTests ?? 0;
  const numPassed = results.numPassedTests ?? 0;

  console.log(`\n📊 ${numPassed} passed, ${numFailed} failed`);

  if (numFailed === 0) {
    console.log('✅ No failures — nothing to report.');
    process.exit(0);
  }

  const failures = extractFailuresFromJestJson(results);
  console.log(`🐛 Found ${failures.length} failing test(s). Processing...\n`);

  const reports = await processFailures(failures);

  let created = 0;
  let skipped = 0;

  for (const report of reports) {
    const label = report.failures.length === 1
      ? report.failures[0].testName
      : `${report.module} (${report.failures.length} tests)`;

    if (report.skipped) {
      console.log(`⏭️  SKIP: ${label} — ${report.reason}`);
      skipped++;
    } else {
      console.log(`🐛 CREATED: ${label} → ${report.issueUrl}`);
      created++;
    }
  }

  console.log(`\n📋 Summary: ${created} issues created, ${skipped} skipped (duplicates/errors)`);

  process.exit(testsPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Bug detector crashed:', err);
  process.exit(1);
});
