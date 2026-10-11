/**
 * server/services/search/cache.js
 * 
 * In-memory 30–60 min LRU cache with quota usage tracking for live web search.
 * Bounded memory structure (<= 100 entries) to respect Render 512MB RAM limit.
 */

export class SearchCache {
  /**
   * @param {number} ttlMinutes - Cache TTL in minutes (clamped to 30-60 min unless 0 for tests)
   * @param {number} maxEntries - Maximum LRU entries to store
   */
  constructor(ttlMinutes = 45, maxEntries = 100) {
    if (ttlMinutes === 0) {
      this.ttlMs = 0;
    } else {
      const clampedMinutes = Math.max(30, Math.min(60, ttlMinutes));
      this.ttlMs = clampedMinutes * 60 * 1000;
    }

    this.maxEntries = maxEntries;
    this.store = new Map();
    this.quotaCount = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      totalCalls: 0,
      providers: {
        serpapi: 0,
        serper: 0,
        none: 0
      }
    };
  }

  /**
   * Generates a deterministic cache key with privacy coordinate rounding (2 decimals).
   */
  generateKey(query = '', options = {}) {
    const cleanQuery = String(query || '').trim().toLowerCase();
    const city = String(options?.city || '').trim().toLowerCase();
    
    let latPart = '';
    let lonPart = '';
    if (options?.lat !== undefined && options?.lat !== null && !isNaN(options.lat)) {
      latPart = Number(options.lat).toFixed(2);
    }
    if (options?.lon !== undefined && options?.lon !== null && !isNaN(options.lon)) {
      lonPart = Number(options.lon).toFixed(2);
    }

    return `${city}:${cleanQuery}:${latPart},${lonPart}`;
  }

  /**
   * Retrieves an item from the cache.
   * Returns data if valid, or null if expired or missing.
   */
  get(key) {
    if (!key || typeof key !== 'string') {
      return null;
    }

    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiry
    if (Date.now() >= entry.expiry) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    // LRU refresh: delete and re-insert at end
    this.store.delete(key);
    this.store.set(key, entry);

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Stores an item in the cache and increments quota counters.
   */
  set(key, data, provider = 'none') {
    if (!key || typeof key !== 'string') return;

    this.quotaCount++;
    this.stats.totalCalls++;

    const providerKey = (provider || 'none').toLowerCase();
    if (this.stats.providers[providerKey] !== undefined) {
      this.stats.providers[providerKey]++;
    } else {
      this.stats.providers[providerKey] = 1;
    }

    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      data,
      expiry: Date.now() + this.ttlMs,
      provider: providerKey
    });
  }

  /**
   * Returns comprehensive quota usage statistics.
   */
  getQuotaUsage() {
    return {
      quotaCount: this.quotaCount,
      totalCalls: this.stats.totalCalls,
      hits: this.stats.hits,
      misses: this.stats.misses,
      cachedEntries: this.store.size,
      providers: { ...this.stats.providers }
    };
  }

  /**
   * Clears all cached entries.
   */
  clear() {
    this.store.clear();
  }
}

// Export default shared singleton instance (45-minute TTL)
export const searchCache = new SearchCache(45);
