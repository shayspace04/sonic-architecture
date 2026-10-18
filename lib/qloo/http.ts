/**
 * Bounded, retry-conscious HTTP layer for Qloo GET requests.
 *
 * Policy (see ARCHITECTURE.md "Qloo quota protection"):
 * - Every attempt has a bounded timeout; total attempts are capped.
 * - Retries only for transient failures: network/timeout errors, HTTP 429,
 *   HTTP 408 and 5xx — with exponential backoff + jitter.
 * - `Retry-After` (seconds or HTTP-date) takes precedence over backoff; if it
 *   exceeds `maxRetryAfterMs` we give up immediately instead of sleeping.
 * - Never retries 400/401/403/404 or other client errors (invalid requests
 *   and auth failures are not transient).
 * - Quota headers are read from the real responses — the names are the ones
 *   Qloo actually sends (`x-month-ratelimit-*`, `x-second-ratelimit-*`,
 *   `x-qloo-request-id`), verified live on 2026-10-19.
 */

import type { QuotaInfo } from "../types";

export const DEFAULT_TIMEOUT_MS = 12000;
export const DEFAULT_MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 250;
const BACKOFF_JITTER_MS = 200;
const BACKOFF_CAP_MS = 4000;
export const MAX_RETRY_AFTER_MS = 10000;

export interface QlooAttemptInfo {
  /** HTTP status of the attempt, or 0 for network/timeout failures. */
  status: number;
  isRetry: boolean;
  ms: number;
}

export interface QlooGetOptions {
  apiKey: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  /** Invoked once per actual upstream attempt — used for counting/logging. */
  onAttempt?: (info: QlooAttemptInfo) => void;
  /** Checked before every attempt (including retries) — wire to the app budget. */
  shouldStop?: () => boolean;
}

export interface QlooGetResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  ms: number;
  /** Parsed from the most recent upstream response that carried quota headers. */
  quota: QuotaInfo | null;
}

function num(value: string | null): number | null {
  if (value === null) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** Reads the quota headers Qloo actually sends; null when none are present. */
export function parseQuotaHeaders(headers: Headers): QuotaInfo | null {
  const monthLimit = num(headers.get("x-month-ratelimit-limit"));
  const monthRemaining = num(headers.get("x-month-ratelimit-remaining"));
  const monthResetSeconds = num(headers.get("x-month-ratelimit-reset"));
  const secondLimit = num(headers.get("x-second-ratelimit-limit"));
  const secondRemaining = num(headers.get("x-second-ratelimit-remaining"));
  const requestId = headers.get("x-qloo-request-id");
  const present =
    monthLimit !== null ||
    monthRemaining !== null ||
    monthResetSeconds !== null ||
    secondLimit !== null ||
    secondRemaining !== null ||
    requestId !== null;
  if (!present) return null;
  return { monthLimit, monthRemaining, monthResetSeconds, secondLimit, secondRemaining, requestId };
}

/** Seconds-form or HTTP-date `Retry-After` → milliseconds; null when absent/unparseable. */
export function parseRetryAfter(value: string | null, nowMs: number = Date.now()): number | null {
  if (value === null || value.trim() === "") return null;
  const trimmed = value.trim();
  const seconds = Number.parseFloat(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - nowMs);
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

function backoffDelay(attempt: number, random: () => number): number {
  const exp = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
  return Math.min(BACKOFF_CAP_MS, exp) + random() * BACKOFF_JITTER_MS;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Single Qloo GET with bounded retries. Never throws; all failures come back as `{ ok: false }`. */
export async function qlooGet(url: string, options: QlooGetOptions): Promise<QlooGetResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const fetchImpl: typeof fetch = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  const startedAt = Date.now();
  let attempts = 0;
  let lastStatus = 0;
  let lastError: string | null = null;
  let quota: QuotaInfo | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options.shouldStop?.()) {
      lastStatus = 0;
      lastError = "application request budget exhausted";
      break;
    }
    const isRetry = attempt > 1;
    const attemptStart = Date.now();
    try {
      const res = await fetchImpl(url, {
        method: "GET",
        headers: { "X-Api-Key": options.apiKey },
        signal: AbortSignal.timeout(timeoutMs),
      });
      attempts += 1;
      lastStatus = res.status;
      const parsed = parseQuotaHeaders(res.headers);
      if (parsed) quota = parsed;
      options.onAttempt?.({ status: res.status, isRetry, ms: Date.now() - attemptStart });

      if (res.ok) {
        const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        if (data !== null) {
          return { ok: true, status: res.status, data, error: null, attempts, ms: Date.now() - startedAt, quota };
        }
        lastError = "invalid JSON response";
        // Malformed success bodies are treated as transient upstream faults.
        if (attempt < maxAttempts) {
          await sleep(backoffDelay(attempt, random));
          continue;
        }
        break;
      }

      // Drain the body so the connection can be reused; content is not used.
      await res.arrayBuffer().catch(() => undefined);
      lastError = `HTTP ${res.status}`;

      if (!isRetryableStatus(res.status)) break; // 400/401/403/404/... never retried
      if (attempt >= maxAttempts) break;

      const retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
      if (retryAfterMs !== null && retryAfterMs > MAX_RETRY_AFTER_MS) {
        lastError = `HTTP ${res.status} (Retry-After ${Math.round(retryAfterMs / 1000)}s exceeds retry budget)`;
        break;
      }
      const delay = retryAfterMs ?? backoffDelay(attempt, random);
      await sleep(delay);
    } catch (err) {
      attempts += 1;
      lastStatus = 0;
      const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      lastError = isTimeout ? `timeout after ${timeoutMs}ms` : "network error";
      options.onAttempt?.({ status: 0, isRetry, ms: Date.now() - attemptStart });
      if (attempt < maxAttempts) {
        await sleep(backoffDelay(attempt, random));
        continue;
      }
      break;
    }
  }

  return { ok: false, status: lastStatus, data: null, error: lastError, attempts, ms: Date.now() - startedAt, quota };
}
