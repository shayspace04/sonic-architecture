/**
 * Bounded TTL cache with single-flight deduplication for Qloo responses.
 *
 * Scope: in-process only (one Node server = one cache). It is deliberately
 * NOT shared across instances and NOT durable — see ARCHITECTURE.md
 * ("Qloo quota protection") for the limitations.
 *
 * Only successfully loaded values are ever cached: a loader that rejects
 * leaves no entry, so auth failures and transient upstream errors are never
 * stored as results.
 */

export type LoadSource = "cache" | "coalesced" | "upstream";

export interface LoadResult<T> {
  value: T;
  source: LoadSource;
}

export interface CacheStats {
  hits: number;
  misses: number;
  coalesced: number;
  loads: number;
  errors: number;
  evictions: number;
  size: number;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export interface TtlCacheOptions {
  maxEntries?: number;
  /** Injectable clock for deterministic tests. */
  now?: () => number;
}

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();
  private readonly maxEntries: number;
  private readonly now: () => number;
  private counters = {
    hits: 0,
    misses: 0,
    coalesced: 0,
    loads: 0,
    errors: 0,
    evictions: 0,
  };

  constructor(options: TtlCacheOptions = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? 500);
    this.now = options.now ?? Date.now;
  }

  /** Returns the fresh value or undefined; expired entries are dropped. */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.counters.misses += 1;
      return undefined;
    }
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      this.counters.misses += 1;
      return undefined;
    }
    // Refresh LRU recency on access.
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.counters.hits += 1;
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) return;
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
      this.counters.evictions += 1;
    }
  }

  /**
   * Cache hit → returns it. Concurrent duplicate miss → shares the single
   * in-flight load (one upstream request, not N). Otherwise loads once,
   * caches on success, and leaves nothing behind on failure.
   */
  async getOrLoad(key: string, ttlMs: number, loader: () => Promise<T>): Promise<LoadResult<T>> {
    const hit = this.get(key);
    if (hit !== undefined) return { value: hit, source: "cache" };

    const existing = this.inflight.get(key);
    if (existing) {
      const value = await existing;
      this.counters.coalesced += 1;
      return { value, source: "coalesced" };
    }

    const load = (async () => {
      this.counters.loads += 1;
      try {
        const value = await loader();
        this.set(key, value, ttlMs);
        return value;
      } catch (err) {
        this.counters.errors += 1;
        throw err;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, load);
    try {
      const value = await load;
      return { value, source: "upstream" };
    } catch (err) {
      // Re-throw to every waiter; nothing was cached, so the next call retries fresh.
      throw err;
    }
  }

  invalidate(key: string): boolean {
    return this.entries.delete(key);
  }

  /** Explicit stale-result handling: drop every key with a prefix (e.g. `insights|urn:entity:place|`). */
  invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.entries.clear();
  }

  stats(): CacheStats {
    return { ...this.counters, size: this.entries.size };
  }
}
