/**
 * responseCache.ts — In-memory cache for frequent bot responses.
 *
 * Reduces unnecessary AI calls for predictable, high-frequency queries
 * like "ver combos", "quiero boneless", "ver menú", etc.
 *
 * Cache refreshes automatically after TTL_MS milliseconds.
 */

interface CacheEntry {
  response: any;
  cachedAt: number;
}

// ─── Configuration ────────────────────────────────────────────────────────────
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEGRADED_MODE_THRESHOLD = 3; // failures before switching to degraded mode
const DEGRADED_MODE_RESET_MS = 2 * 60 * 1000; // auto-reset after 2 minutes

// ─── State ────────────────────────────────────────────────────────────────────
const cache = new Map<string, CacheEntry>();
let consecutiveFailures = 0;
let degradedSince: number | null = null;

// ─── Normalizer ───────────────────────────────────────────────────────────────
/**
 * Normalizes a user message, intent, and context into a canonical cache key.
 * Returns null if the message is not cacheable.
 */
export function getCacheKey(message: string, intent?: string, context?: any): string | null {
  const m = message.toLowerCase().trim();
  let baseKey: string | null = null;

  if (/ver combos?|dame combos?|show combos?/.test(m)) baseKey = 'VER_COMBOS';
  else if (/boneless/.test(m) && !/agrega|quiero|dame|pon/.test(m)) baseKey = 'VER_BONELESS';
  else if (/alitas/.test(m) && !/agrega|quiero|dame|pon/.test(m)) baseKey = 'VER_ALITAS';
  else if (/ver men[uú]|ver carta|ver todo el men[uú]/.test(m)) baseKey = 'VER_MENU';
  else if (/papas/.test(m) && !/agrega|quiero|dame|pon/.test(m)) baseKey = 'VER_PAPAS';
  else if (/bebidas?|refrescos?/.test(m) && !/agrega|quiero|dame|pon/.test(m)) baseKey = 'VER_BEBIDAS';
  else if (/salsas?|dips?|aderezos?/.test(m) && !/agrega|quiero|dame|pon/.test(m)) baseKey = 'VER_SALSAS';

  if (!baseKey) return null;

  // Enhance key with intent and context
  const contextTag = context?.cart?.items?.length > 0 
    ? `cart_has_${context.cart.items[0].name.toLowerCase().replace(/\s+/g, '_')}`
    : 'context_empty';
  
  const intentTag = intent || 'unknown_intent';

  return `${intentTag}:${baseKey}:${contextTag}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get a cached response if it exists and is still valid. */
export function getCachedResponse(key: string): any | null {
  if (process.env.NODE_ENV === 'test') return null;
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.cachedAt > TTL_MS;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.response;
}

/** Store a response in the cache. */
export function setCachedResponse(key: string, response: any): void {
  if (process.env.NODE_ENV === 'test') return;
  cache.set(key, {
    response,
    cachedAt: Date.now(),
  });
}

/** Force-invalidate a specific key. */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/** Clear the entire cache (e.g. on product update). */
export function clearCache(): void {
  cache.clear();
}

/** Return cache stats for monitoring. */
export function getCacheStats(): { size: number; keys: string[]; consecutiveFailures: number; degradedSince: number | null } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    consecutiveFailures,
    degradedSince,
  };
}

// ─── Degraded Mode API ────────────────────────────────────────────────────────

/** Call this when an AI request fails. */
export function recordAIFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= DEGRADED_MODE_THRESHOLD && degradedSince === null) {
    degradedSince = Date.now();
    console.warn(`[responseCache] Entering DEGRADED MODE after ${consecutiveFailures} consecutive failures.`);
  }
}

/** Call this when an AI request succeeds. Resets the failure counter. */
export function recordAISuccess(): void {
  if (consecutiveFailures > 0) {
    console.log(`[responseCache] AI recovered. Exiting degraded mode.`);
  }
  consecutiveFailures = 0;
  degradedSince = null;
}

/**
 * Returns true if the system should operate in degraded (fallback-only) mode.
 * Auto-resets if the degraded window has expired.
 */
export function isInDegradedMode(): boolean {
  if (degradedSince === null) return false;

  const elapsed = Date.now() - degradedSince;
  if (elapsed > DEGRADED_MODE_RESET_MS) {
    // Auto-reset: give AI another chance
    consecutiveFailures = 0;
    degradedSince = null;
    console.log('[responseCache] Degraded mode auto-reset. Resuming normal AI calls.');
    return false;
  }

  return true;
}
