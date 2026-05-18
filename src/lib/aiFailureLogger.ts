/**
 * aiFailureLogger.ts — Structured logger for AI reliability monitoring.
 *
 * Captures every AI failure event with enough context to diagnose
 * patterns, retry behavior, and fallback activation rates.
 *
 * Logs are stored in-memory (ring buffer) and exposed via getFailureLogs().
 * In production, pipe these to your observability stack (e.g. Supabase, Datadog).
 */

export interface AIFailureLog {
  timestamp: string;         // ISO 8601
  userInput: string;         // The message that triggered the failure
  errorType: string;         // e.g. "503", "JSON_PARSE", "EMPTY_RESPONSE", "AUTH"
  errorMessage: string;      // Full error message
  retryCount: number;        // How many retries were attempted (0 = first try failed)
  fallbackTriggered: boolean; // Was rule-based fallback used?
  degradedMode: boolean;     // Was degraded mode active at the time?
}

// ─── Ring Buffer (last 100 entries) ───────────────────────────────────────────
const MAX_LOGS = 100;
const failureLogs: AIFailureLog[] = [];

// ─── Public API ───────────────────────────────────────────────────────────────

export interface IntentLog {
  timestamp: string;
  input: string;
  intent: string;
  confidence: number;
  source: 'rule' | 'llm';
  entities?: any;
  intents?: string[];
  primaryIntent?: string;
}

const intentLogs: IntentLog[] = [];

/** Record a structured intent detection decision. */
export function logIntentDecision(entry: Omit<IntentLog, 'timestamp'>): void {
  const log: IntentLog = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  if (intentLogs.length >= MAX_LOGS) {
    intentLogs.shift();
  }
  intentLogs.push(log);

  // Structured JSON logging for production observability
  console.log(JSON.stringify({ type: 'INTENT_DECISION', ...log }));
}

/** Record a structured AI failure event. */
export function logAIFailure(entry: Omit<AIFailureLog, 'timestamp'>): void {
  const log: AIFailureLog = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  // Ring buffer: drop oldest entry when full
  if (failureLogs.length >= MAX_LOGS) {
    failureLogs.shift();
  }
  failureLogs.push(log);

  // Console output for server logs / dev visibility
  console.error(
    `[AIFailure] ${log.timestamp} | input="${log.userInput.slice(0, 60)}" | ` +
    `error=${log.errorType} | retries=${log.retryCount} | ` +
    `fallback=${log.fallbackTriggered} | degraded=${log.degradedMode}`
  );
}

/** Retrieve all stored failure logs (most recent last). */
export function getFailureLogs(): AIFailureLog[] {
  return [...failureLogs];
}

/** Return a quick summary for dashboards. */
export function getFailureSummary(): {
  total: number;
  last24h: number;
  errorBreakdown: Record<string, number>;
  fallbackRate: number;
} {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const last24h = failureLogs.filter(l => now - new Date(l.timestamp).getTime() < oneDayMs);
  const errorBreakdown: Record<string, number> = {};
  let fallbackCount = 0;

  for (const log of failureLogs) {
    errorBreakdown[log.errorType] = (errorBreakdown[log.errorType] || 0) + 1;
    if (log.fallbackTriggered) fallbackCount++;
  }

  return {
    total: failureLogs.length,
    last24h: last24h.length,
    errorBreakdown,
    fallbackRate: failureLogs.length > 0
      ? Math.round((fallbackCount / failureLogs.length) * 100)
      : 0,
  };
}

/** Clear all logs (e.g. for testing). */
export function clearFailureLogs(): void {
  failureLogs.length = 0;
}
