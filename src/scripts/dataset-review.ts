#!/usr/bin/env tsx
/**
 * scripts/dataset-review.ts
 *
 * Weekly script — run every Monday:
 *   npm run dataset:review
 *
 * What it does:
 *   1. Reads src/data/learning/conversations.jsonl (raw bot logs)
 *   2. Shows a summary of the week
 *   3. Promotes unique entries to src/data/learning/eval-dataset.jsonl
 *
 * Optional manual label override:
 *   If a logged intent looks wrong, edit conversations.jsonl before running.
 */

import { promoteToDataset, getTodayLogs } from "../core/conversationLogger";
import fs from "fs";
import path from "path";

const LOG_FILE = path.resolve(process.cwd(), "src/data/learning/conversations.jsonl");

function weekSummary() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log("No conversation log found yet.");
    return;
  }

  const lines = fs
    .readFileSync(LOG_FILE, "utf8")
    .split("\n")
    .filter(Boolean);

  const turns = lines.map((l) => JSON.parse(l));

  // Last 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const week = turns.filter((t) => t.ts >= cutoff);

  const intentCounts: Record<string, number> = {};
  const errors: typeof turns = [];

  for (const t of week) {
    intentCounts[t.detectedIntent] = (intentCounts[t.detectedIntent] ?? 0) + 1;
    if (t.error) errors.push(t);
  }

  console.log(`\n📊 WEEKLY DATASET SUMMARY`);
  console.log(`─────────────────────────`);
  console.log(`Total turns (last 7 days): ${week.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`\nIntent distribution:`);
  Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([intent, count]) => {
      const pct = ((count / week.length) * 100).toFixed(1);
      console.log(`  ${intent.padEnd(20)} ${count} (${pct}%)`);
    });

  if (errors.length > 0) {
    console.log(`\n⚠️  Error samples:`);
    errors.slice(0, 3).forEach((e) => {
      console.log(`  [${e.ts}] "${e.input}" → ${e.error}`);
    });
  }

  console.log("");
}

// ── Run ──────────────────────────────────────────────────────────────────────
weekSummary();
const { promoted, skipped } = promoteToDataset();
console.log(`\n✅ Done. ${promoted} new entries in eval-dataset.jsonl (${skipped} already existed).`);
