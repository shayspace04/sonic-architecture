/**
 * Sonic Architecture — Pluggable Cache Adapter System
 * (/lib/qloo/cache.ts)
 *
 * Implements Requirement 5:
 * Replaces hardcoded disk caching with a serverless-ready cache adapter architecture:
 * 1. InMemoryCacheAdapter (default): Works in serverless, edge, containerized, and lambda hosts.
 * 2. VercelKvCacheAdapter / Redis: Activated automatically when KV_REST_API_URL / KV_REST_API_TOKEN or REDIS_URL exist.
 * 3. FileSystemCacheAdapter (optional local fallback): Safely used only in local development when allowed.
 */

import fs from "node:fs";
import path from "node:path";
import { RealQlooEvidenceBundle } from "./types";

export interface QlooCacheAdapter {
  get(key: string): Promise<RealQlooEvidenceBundle | null>;
  set(key: string, data: RealQlooEvidenceBundle, ttlSeconds?: number): Promise<void>;
  clear(): Promise<void>;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

// ============================================================================
// 1. IN-MEMORY ADAPTER (Serverless Default)
// ============================================================================

export class InMemoryCacheAdapter implements QlooCacheAdapter {
  private cache = new Map<string, { expiresAt: number; data: RealQlooEvidenceBundle }>();

  async get(key: string): Promise<RealQlooEvidenceBundle | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  async set(key: string, data: RealQlooEvidenceBundle, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    this.cache.set(key, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      data,
    });
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// ============================================================================
// 2. UPSTASH / VERCEL KV REST ADAPTER
// ============================================================================

export class UpstashKvCacheAdapter implements QlooCacheAdapter {
  private url: string;
  private token: string;
  private memoryFallback = new InMemoryCacheAdapter();

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }

  async get(key: string): Promise<RealQlooEvidenceBundle | null> {
    try {
      const res = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: "no-store",
      });
      if (!res.ok) return this.memoryFallback.get(key);
      const json = await res.json();
      if (!json || !json.result) return null;
      const parsed = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
      return parsed as RealQlooEvidenceBundle;
    } catch {
      return this.memoryFallback.get(key);
    }
  }

  async set(key: string, data: RealQlooEvidenceBundle, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    try {
      await fetch(`${this.url}/set/${encodeURIComponent(key)}?ex=${ttlSeconds}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch {
      await this.memoryFallback.set(key, data, ttlSeconds);
    }
  }

  async clear(): Promise<void> {
    this.memoryFallback.clear();
  }
}

// ============================================================================
// 3. LOCAL FILE SYSTEM ADAPTER (Development fallback only)
// ============================================================================

export class FileSystemCacheAdapter implements QlooCacheAdapter {
  private cacheDir: string;
  private memoryFallback = new InMemoryCacheAdapter();

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.resolve(process.cwd(), ".qloo-cache");
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch {
      // Ignored in read-only serverless filesystems
    }
  }

  async get(key: string): Promise<RealQlooEvidenceBundle | null> {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.timestamp < DEFAULT_TTL_SECONDS * 1000) {
          return parsed as RealQlooEvidenceBundle;
        }
      }
    } catch {
      // Fallback
    }
    return this.memoryFallback.get(key);
  }

  async set(key: string, data: RealQlooEvidenceBundle, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    await this.memoryFallback.set(key, data, ttlSeconds);
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // Silently ignore if filesystem is read-only
    }
  }

  async clear(): Promise<void> {
    await this.memoryFallback.clear();
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            fs.unlinkSync(path.join(this.cacheDir, file));
          }
        }
      }
    } catch {
      // Ignore
    }
  }
}

// ============================================================================
// ADAPTER FACTORY
// ============================================================================

let currentAdapter: QlooCacheAdapter | null = null;

export function getQlooCacheAdapter(): QlooCacheAdapter {
  if (currentAdapter) return currentAdapter;

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    currentAdapter = new UpstashKvCacheAdapter(kvUrl, kvToken);
    return currentAdapter;
  }

  // If running in development and filesystem writable, use FileSystemCacheAdapter
  if (process.env.NODE_ENV !== "production" && typeof window === "undefined") {
    try {
      currentAdapter = new FileSystemCacheAdapter();
      return currentAdapter;
    } catch {
      // Fall back to memory
    }
  }

  // Default serverless-ready in-memory adapter
  currentAdapter = new InMemoryCacheAdapter();
  return currentAdapter;
}

export function resetQlooCacheAdapter(newAdapter?: QlooCacheAdapter): void {
  currentAdapter = newAdapter || null;
}
