import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { UsageTracker, DEFAULT_APP_BUDGET, MAX_APP_BUDGET } from "../lib/qloo/usage";
import type { QuotaInfo } from "../lib/types";

function withEnv(name: string, value: string | undefined, fn: () => void): void {
  const prev = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env[name];
    else process.env[name] = prev;
  }
}

test("attempts are counted by kind, status, and retry flag until the budget is exhausted", () => {
  const t = new UsageTracker({ budget: 3, filePath: null, log: () => {} });
  assert.equal(t.remainingBudget, 3);
  assert.equal(t.exhausted, false);

  t.recordAttempt("search", 200);
  t.recordAttempt("insights", 200);
  assert.equal(t.used, 2);
  assert.equal(t.exhausted, false);

  t.recordAttempt("search", 500, true);
  assert.equal(t.used, 3);
  assert.equal(t.remainingBudget, 0);
  assert.equal(t.exhausted, true);

  const snap = t.snapshot();
  assert.equal(snap.search, 2);
  assert.equal(snap.insights, 1);
  assert.equal(snap.retries, 1);
  assert.equal(snap.statuses["200"], 2);
  assert.equal(snap.statuses["500"], 1);
  assert.equal(snap.budget, 3);
  assert.equal(snap.persisted, false);
});

test("default budget is 9000 when no env is set", () => {
  withEnv("QLOO_APP_MONTHLY_BUDGET", undefined, () => {
    const t = new UsageTracker({ filePath: null, log: () => {} });
    assert.equal(t.snapshot().budget, DEFAULT_APP_BUDGET);
    assert.equal(DEFAULT_APP_BUDGET, 9000);
  });
});

test("env budget is honored but clamped to <=9900", () => {
  withEnv("QLOO_APP_MONTHLY_BUDGET", "50000", () => {
    const t = new UsageTracker({ filePath: null, log: () => {} });
    assert.equal(t.snapshot().budget, MAX_APP_BUDGET);
  });
  withEnv("QLOO_APP_MONTHLY_BUDGET", "1234", () => {
    const t = new UsageTracker({ filePath: null, log: () => {} });
    assert.equal(t.snapshot().budget, 1234);
  });
  withEnv("QLOO_APP_MONTHLY_BUDGET", "not-a-number", () => {
    const t = new UsageTracker({ filePath: null, log: () => {} });
    assert.equal(t.snapshot().budget, DEFAULT_APP_BUDGET);
  });
});

test("counters reset on UTC calendar month rollover", () => {
  let now = Date.parse("2026-01-15T00:00:00Z");
  const t = new UsageTracker({ budget: 10, filePath: null, now: () => now, log: () => {} });
  t.recordAttempt("search", 200);
  assert.equal(t.used, 1);
  assert.equal(t.snapshot().month, "2026-01");

  now = Date.parse("2026-02-01T00:00:00Z");
  t.recordAttempt("insights", 200); // triggers rollover before counting
  assert.equal(t.used, 1); // January search reset; February insights = 1
  assert.equal(t.snapshot().month, "2026-02");
  assert.equal(t.snapshot().search, 0);
  assert.equal(t.snapshot().insights, 1);
});

test("usage persists across instances and recovers from a corrupt file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qloo-usage-"));
  const file = path.join(dir, "usage.json");
  try {
    const a = new UsageTracker({ budget: 100, filePath: file, log: () => {} });
    a.recordAttempt("search", 200);
    a.recordAttempt("insights", 200);
    a.recordAttempt("insights", 429, true);
    assert.equal(a.snapshot().persisted, true);

    const b = new UsageTracker({ budget: 100, filePath: file, log: () => {} });
    assert.equal(b.used, 3);
    assert.equal(b.snapshot().search, 1);
    assert.equal(b.snapshot().insights, 2);
    assert.equal(b.snapshot().retries, 1);

    fs.writeFileSync(file, "{ this is not json", "utf8");
    const c = new UsageTracker({ budget: 100, filePath: file, log: () => {} });
    assert.equal(c.used, 0); // corrupt file → fresh start, no throw
    c.recordAttempt("search", 200);
    const d = new UsageTracker({ budget: 100, filePath: file, log: () => {} });
    assert.equal(d.used, 1); // file usable again after corruption
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("observed upstream quota is retained for UI exposure; null does not clear it", () => {
  const t = new UsageTracker({ budget: 10, filePath: null, log: () => {} });
  assert.equal(t.snapshot().lastUpstreamQuota, null);

  const quota: QuotaInfo = {
    monthLimit: 10000,
    monthRemaining: 9880,
    monthResetSeconds: 2293578.31,
    secondLimit: 5,
    secondRemaining: 4,
    requestId: "req-1",
  };
  t.observeQuota(quota);
  assert.deepEqual(t.snapshot().lastUpstreamQuota, quota);

  t.observeQuota(null);
  assert.deepEqual(t.snapshot().lastUpstreamQuota, quota);
});

test("summary log is content-free", () => {
  const lines: string[] = [];
  const t = new UsageTracker({ budget: 10, filePath: null, log: (line) => lines.push(line) });
  t.recordAttempt("search", 200);
  t.logSummary("profile upstream=1 resolved=2");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[qloo\] /);
  assert.ok(lines[0].includes("used=1/10"));
  assert.ok(lines[0].includes("statuses="));
});
