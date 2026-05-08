"use server";

/**
 * conversationLogger.ts
 *
 * Appends every real WhatsApp turn to a JSONL log file.
 * Run `npm run dataset:review` weekly to promote entries to the eval dataset.
 */

import fs from 'fs';
import path from 'path';

export type ConversationTurn = {
  ts: string;               // ISO timestamp
  phone: string;            // anonymized (last 4 digits only)
  input: string;            // raw user message
  detectedIntent: string;   // what the engine detected
  botResponse: string;      // what the bot actually said
  cartTotal: number;        // cart total at the time
  cartCount: number;        // number of items in cart
  error?: string;           // any error that occurred
};

// ── Path config ──────────────────────────────────────────────────────────────
const getPaths = () => {
  if (typeof window !== 'undefined') return null;
  const LOG_DIR = path.resolve(process.cwd(), "src/data/learning");
  return {
    LOG_DIR,
    LOG_FILE: path.join(LOG_DIR, "conversations.jsonl"),
    WEEKLY_DATASET: path.join(LOG_DIR, "eval-dataset.jsonl"),
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function anonymizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `****${digits.slice(-4)}`;
}

function ensureDir() {
  if (typeof window !== 'undefined') return;
  const paths = getPaths();
  if (!paths) return;
  if (!fs.existsSync(paths.LOG_DIR)) {
    fs.mkdirSync(paths.LOG_DIR, { recursive: true });
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Call after every bot turn to persist the interaction.
 */
export function logTurn(
  phone: string,
  input: string,
  detectedIntent: string,
  botResponse: string,
  cartTotal: number,
  cartCount: number,
  error?: string,
) {
  try {
    ensureDir();
    const turn: ConversationTurn = {
      ts: new Date().toISOString(),
      phone: anonymizePhone(phone),
      input,
      detectedIntent,
      botResponse,
      cartTotal,
      cartCount,
      ...(error ? { error } : {}),
    };
    
    if (typeof window === 'undefined') {
      const paths = getPaths();
      if (paths) {
        fs.appendFileSync(paths.LOG_FILE, JSON.stringify(turn) + "\n", "utf8");
      }
    }
  } catch (e) {
    // Logger must never crash the bot
    console.warn("[conversationLogger] Failed to write log:", e);
  }
}

/**
 * Returns all turns logged today (for quick inspection).
 */
export function getTodayLogs(): ConversationTurn[] {
  if (typeof window !== 'undefined') return [];
  try {
    const paths = getPaths();
    if (!paths || !fs.existsSync(paths.LOG_FILE)) return [];
    const today = new Date().toISOString().slice(0, 10);
    return fs
      .readFileSync(paths.LOG_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l: any) => JSON.parse(l) as ConversationTurn)
      .filter((t: any) => t.ts.startsWith(today));
  } catch {
    return [];
  }
}

/**
 * Promotes unique inputs from the raw log into the weekly eval dataset.
 * Skips entries already present. Call this every Monday.
 */
export function promoteToDataset(
  labelFn?: (turn: ConversationTurn) => string | undefined,
) {
  if (typeof window !== 'undefined') return { promoted: 0, skipped: 0 };
  try {
    const paths = getPaths();
    if (!paths) return { promoted: 0, skipped: 0 };
    
    ensureDir();

    // Load existing dataset inputs to avoid duplicates
    const existing = new Set<string>();
    if (fs.existsSync(paths.WEEKLY_DATASET)) {
      fs
        .readFileSync(paths.WEEKLY_DATASET, "utf8")
        .split("\n")
        .filter(Boolean)
        .forEach((l: any) => {
          try {
            existing.add(JSON.parse(l).input as string);
          } catch {}
        });
    }

    if (!fs.existsSync(paths.LOG_FILE)) return { promoted: 0, skipped: 0 };

    const turns: ConversationTurn[] = fs
      .readFileSync(paths.LOG_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l: any) => JSON.parse(l) as ConversationTurn);

    let promoted = 0;
    let skipped = 0;

    for (const turn of turns) {
      if (existing.has(turn.input)) { skipped++; continue; }

      const expectedIntent = labelFn
        ? labelFn(turn) ?? turn.detectedIntent
        : turn.detectedIntent;

      const entry = {
        input: turn.input,
        expectedIntent,
        source: "whatsapp-real",
        addedAt: new Date().toISOString(),
      };

      fs.appendFileSync(paths.WEEKLY_DATASET, JSON.stringify(entry) + "\n", "utf8");
      existing.add(turn.input);
      promoted++;
    }

    console.log(`[dataset] ✅ Promoted ${promoted} new turns (${skipped} duplicates skipped).`);
    return { promoted, skipped };
  } catch (e) {
    console.error("[dataset] Failed to promote logs:", e);
    return { promoted: 0, skipped: 0 };
  }
}
