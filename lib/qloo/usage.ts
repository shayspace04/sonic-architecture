/**
 * Server-side Qloo usage accounting and application-level request ceiling.
 *
 * - Counts every actual upstream attempt (including retries) by kind
 *   (`search` / `insights`) and HTTP status (0 = network/timeout).
 * - Enforces `QLOO_APP_MONTHLY_BUDGET` (default 9000 = 10% margin below the
 *   upstream `x-month-ratelimit-limit: 10000`), clamped to 9900 maximum.
 * - Persists to a local JSON file (`.qloo-usage.json`, git-ignored) so the
 *   counter survives process restarts on this machine. If the write fails the
 *   tracker degrades to memory-only and says so via `persisted: false`.
 *
 * LIMITATION (documented, not configurable away without shared storage):
 * this is a *per-process / per-machine* ceiling. Nothing here can guarantee a
 * global monthly cap across multiple instances or hosts — that would require
 * shared atomic storage, which this project does not have. The budget file is
 * only shared if instances share a filesystem.
 *
 * Logs are structured and content-free: kind, status, attempts — never API
 * keys, authorization headers, URLs, or user text.
 */

import fs from "node:fs";
import path from "node:path";
import type { QuotaInfo } from "../types";

export type AttemptKind = "search" | "insights";

export interface UsageSnapshot {
  month: string;
  budget: number;
  used: number;
  remaining: number;
  exhausted: boolean;
  search: number;
  insights: number;
  retries: number;
  statuses: Record<string, number>;
  lastUpstreamQuota: QuotaInfo | null;
  persisted: boolean;
}

export interface UsageTrackerOptions {
  budget?: number;
  /** File for durable counting; null disables persistence (tests). */
  filePath?: string | null;
  now?: () => number;
  log?: (line: string) => void;
}

interface PersistedState {
  month: string;
  search: number;
  insights: number;
  retries: number;
  statuses: Record<string, number>;
}

export const DEFAULT_APP_BUDGET = 9000;
/** Hard clamp: always at least 100 requests below the reported upstream limit of 10000. */
export const MAX_APP_BUDGET = 9900;

function readBudget(): number {
  const raw = process.env.QLOO_APP_MONTHLY_BUDGET;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  const value = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_APP_BUDGET;
  return Math.min(value, MAX_APP_BUDGET);
}

function monthKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 7); // UTC YYYY-MM
}

export class UsageTracker {
  private readonly budget: number;
  private readonly filePath: string | null;
  private readonly now: () => number;
  private readonly log: (line: string) => void;
  private month: string;
  private search = 0;
  private insights = 0;
  private retries = 0;
  private statuses: Record<string, number> = {};
  private lastUpstreamQuota: QuotaInfo | null = null;
  private persisted = true;
  private warnedPersist = false;

  constructor(options: UsageTrackerOptions = {}) {
    this.budget = Math.min(Math.max(1, options.budget ?? readBudget()), MAX_APP_BUDGET);
    this.filePath =
      options.filePath === undefined
        ? path.join(
            /* turbopackIgnore: true */ process.cwd(),
            process.env.QLOO_USAGE_FILE || ".qloo-usage.json"
          )
        : options.filePath;
    this.now = options.now ?? Date.now;
    this.log = options.log ?? ((line) => console.info(line));
    this.month = monthKey(this.now());
    if (!this.filePath) {
      this.persisted = false; // memory-only (tests / persistence disabled)
    } else {
      this.load();
    }
  }

  private load(): void {
    if (!this.filePath) return;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as Partial<PersistedState>;
      if (!raw || typeof raw.month !== "string") return;
      if (raw.month !== this.month) return; // new calendar month → counters reset
      this.search = typeof raw.search === "number" ? Math.max(0, raw.search) : 0;
      this.insights = typeof raw.insights === "number" ? Math.max(0, raw.insights) : 0;
      this.retries = typeof raw.retries === "number" ? Math.max(0, raw.retries) : 0;
      this.statuses =
        raw.statuses && typeof raw.statuses === "object"
          ? Object.fromEntries(
              Object.entries(raw.statuses).filter(([, v]) => typeof v === "number")
            )
          : {};
    } catch {
      // Corrupt/unreadable file: fall through with fresh in-memory counts.
      this.persisted = false;
    }
  }

  private save(): void {
    if (!this.filePath) return;
    const state: PersistedState = {
      month: this.month,
      search: this.search,
      insights: this.insights,
      retries: this.retries,
      statuses: this.statuses,
    };
    try {
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
      fs.renameSync(tmp, this.filePath);
      this.persisted = true;
    } catch {
      this.persisted = false;
      if (!this.warnedPersist) {
        this.warnedPersist = true;
        this.log('[qloo] usage file not writable; counters are memory-only for this process');
      }
    }
  }

  /** Rolls the counters if the calendar month changed, then applies `fn`. */
  private rollover(): void {
    const current = monthKey(this.now());
    if (current !== this.month) {
      this.month = current;
      this.search = 0;
      this.insights = 0;
      this.retries = 0;
      this.statuses = {};
    }
  }

  get used(): number {
    return this.search + this.insights;
  }

  get remainingBudget(): number {
    return Math.max(0, this.budget - this.used);
  }

  get exhausted(): boolean {
    return this.remainingBudget <= 0;
  }

  /** Records one actual upstream attempt (retries included). */
  recordAttempt(kind: AttemptKind, status: number, isRetry = false): void {
    this.rollover();
    if (kind === "search") this.search += 1;
    else this.insights += 1;
    if (isRetry) this.retries += 1;
    const key = String(status);
    this.statuses[key] = (this.statuses[key] ?? 0) + 1;
    this.save();
  }

  /** Stores the last quota headers the upstream actually sent (for UI exposure). */
  observeQuota(quota: QuotaInfo | null): void {
    if (quota) this.lastUpstreamQuota = quota;
  }

  snapshot(): UsageSnapshot {
    return {
      month: this.month,
      budget: this.budget,
      used: this.used,
      remaining: this.remainingBudget,
      exhausted: this.exhausted,
      search: this.search,
      insights: this.insights,
      retries: this.retries,
      statuses: { ...this.statuses },
      lastUpstreamQuota: this.lastUpstreamQuota,
      persisted: this.persisted,
    };
  }

  /** Content-free operational line — safe to log. */
  logSummary(context: string): void {
    const s = this.snapshot();
    this.log(
      `[qloo] ${context} used=${s.used}/${s.budget} search=${s.search} insights=${s.insights} retries=${s.retries} statuses=${JSON.stringify(s.statuses)} persisted=${s.persisted}`
    );
  }
}
