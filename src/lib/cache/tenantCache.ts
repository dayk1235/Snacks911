/**
 * Smart Cache Utility
 * Per-tenant configuration caching with configurable TTL and manual invalidation.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class SmartCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtl: number;

  constructor(defaultTtlSeconds = 300) {
    this.defaultTtl = defaultTtlSeconds * 1000;
  }

  /**
   * Get item from cache or return null if expired/missing.
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set item in cache with optional TTL override.
   */
  set(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Manual invalidation for a specific key.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
  }
}

// Global instance for Tenant Configuration
export const tenantConfigCache = new SmartCache<any>(600); // 10 min default

/**
 * Convenience function to invalidate tenant cache.
 */
export function invalidateTenantCache(tenantId: string): void {
  tenantConfigCache.invalidate(`tenant-${tenantId}`);
  tenantConfigCache.invalidate(`slug-${tenantId}`);
}
