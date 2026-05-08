/**
 * Simple in-memory rate limiter.
 * Note: In a distributed/serverless environment (like Vercel), 
 * this Map will only be per-instance. For global limits, Redis is required.
 */
const rateMap = new Map<string, number[]>();

/**
 * rateLimit() — Check if a key has exceeded the limit within a window.
 * 
 * @param key - Unique identifier (IP, phone number, etc.)
 * @param limit - Max number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns boolean - true if allowed, false if limited
 */
export function rateLimit(key: string, limit = 5, windowMs = 10000): boolean {
  const now = Date.now();

  // Get current timestamps for this key
  if (!rateMap.has(key)) {
    rateMap.set(key, []);
  }

  // Filter out timestamps outside the current window
  const timestamps = (rateMap.get(key) || []).filter(t => now - t < windowMs);

  // Check if limit exceeded
  if (timestamps.length >= limit) {
    console.warn("[RATE LIMIT]", key);
    return false;
  }

  // Add current timestamp and update map
  timestamps.push(now);
  rateMap.set(key, timestamps);

  return true;
}