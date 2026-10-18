import { test } from "node:test";
import assert from "node:assert/strict";
import {
  qlooGet,
  parseQuotaHeaders,
  parseRetryAfter,
  isRetryableStatus,
  MAX_RETRY_AFTER_MS,
} from "../lib/qloo/http";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const OK_BODY = { results: [{ entity_id: "e1", name: "Miles Davis" }] };

test("success returns parsed data, auth header, and real quota headers", async () => {
  const seenKeys: (string | undefined)[] = [];
  const out = await qlooGet("https://qloo.test/search?query=x", {
    apiKey: "test-key",
    fetchImpl: async (input, init) => {
      assert.ok(String(input).includes("/search"));
      const headers = init?.headers as Record<string, string>;
      seenKeys.push(headers?.["X-Api-Key"]);
      return jsonResponse(200, OK_BODY, {
        "x-month-ratelimit-limit": "10000",
        "x-month-ratelimit-remaining": "9880",
        "x-month-ratelimit-reset": "2293578.31",
        "x-second-ratelimit-limit": "5",
        "x-second-ratelimit-remaining": "4",
        "x-qloo-request-id": "req-42",
      });
    },
  });

  assert.equal(out.ok, true);
  assert.equal(out.status, 200);
  assert.equal(out.attempts, 1);
  assert.deepEqual(out.data, OK_BODY);
  assert.deepEqual(seenKeys, ["test-key"]);
  assert.equal(out.quota?.monthLimit, 10000);
  assert.equal(out.quota?.monthRemaining, 9880);
  assert.equal(out.quota?.monthResetSeconds, 2293578.31);
  assert.equal(out.quota?.secondLimit, 5);
  assert.equal(out.quota?.requestId, "req-42");
});

test("5xx responses are retried with bounded backoff and can succeed", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => {
      calls += 1;
      return calls < 3 ? jsonResponse(500, { error: "boom" }) : jsonResponse(200, OK_BODY);
    },
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 0.5,
  });

  assert.equal(out.ok, true);
  assert.equal(calls, 3);
  assert.equal(out.attempts, 3);
  assert.equal(sleeps.length, 2);
  assert.ok(sleeps[0] >= 250 && sleeps[0] <= 450, `first backoff ${sleeps[0]}`);
  assert.ok(sleeps[1] >= 500 && sleeps[1] <= 700, `second backoff ${sleeps[1]}`);
  assert.ok(Math.max(...sleeps) <= 4400);
});

test("400 is never retried", async () => {
  let calls = 0;
  let slept = false;
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(400, { error: "bad request" });
    },
    sleep: async () => {
      slept = true;
    },
  });
  assert.equal(out.ok, false);
  assert.equal(out.status, 400);
  assert.equal(out.attempts, 1);
  assert.equal(calls, 1);
  assert.equal(slept, false);
});

test("401 auth failure is never retried", async () => {
  let calls = 0;
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(401, { error: "unauthorized" });
    },
    sleep: async () => {},
  });
  assert.equal(out.ok, false);
  assert.equal(out.status, 401);
  assert.equal(calls, 1);
  assert.equal(out.attempts, 1);
});

test("429 honors Retry-After seconds before retrying", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("slow down", { status: 429, headers: { "retry-after": "2" } });
      }
      return jsonResponse(200, OK_BODY);
    },
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 0,
  });
  assert.equal(out.ok, true);
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [2000]);
});

test("Retry-After beyond the retry budget gives up immediately", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => {
      calls += 1;
      return new Response("slow", {
        status: 429,
        headers: { "retry-after": String(Math.ceil(MAX_RETRY_AFTER_MS / 1000) + 50) },
      });
    },
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
  assert.equal(out.ok, false);
  assert.equal(calls, 1);
  assert.equal(sleeps.length, 0);
  assert.match(out.error ?? "", /exceeds retry budget/);
});

test("shouldStop prevents any upstream attempt (budget gate)", async () => {
  let calls = 0;
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(200, OK_BODY);
    },
    shouldStop: () => true,
  });
  assert.equal(calls, 0);
  assert.equal(out.attempts, 0);
  assert.equal(out.ok, false);
  assert.equal(out.error, "application request budget exhausted");
});

test("budget stop between attempts takes precedence over the HTTP error", async () => {
  let stop = false;
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => jsonResponse(500, { error: "boom" }),
    sleep: async () => {
      stop = true; // budget hits between attempt 1 and the retry
    },
    shouldStop: () => stop,
  });
  assert.equal(out.attempts, 1);
  assert.equal(out.ok, false);
  assert.equal(out.error, "application request budget exhausted");
});

test("network errors are retried up to maxAttempts, then reported", async () => {
  let calls = 0;
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => {
      calls += 1;
      throw new Error("ECONNRESET");
    },
    sleep: async () => {},
    random: () => 0,
  });
  assert.equal(out.ok, false);
  assert.equal(calls, 3);
  assert.equal(out.attempts, 3);
  assert.equal(out.status, 0);
  assert.equal(out.error, "network error");
});

test("malformed success bodies are treated as transient", async () => {
  let calls = 0;
  const out = await qlooGet("https://qloo.test/x", {
    apiKey: "k",
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("<html>gateway error</html>", { status: 200 });
      }
      return jsonResponse(200, OK_BODY);
    },
    sleep: async () => {},
    random: () => 0,
  });
  assert.equal(out.ok, true);
  assert.equal(calls, 2);
  assert.equal(out.attempts, 2);
});

test("parseQuotaHeaders returns null when no quota headers exist", () => {
  assert.equal(parseQuotaHeaders(new Headers()), null);
});

test("parseQuotaHeaders tolerates partial header sets", () => {
  const q = parseQuotaHeaders(new Headers({ "x-qloo-request-id": "abc" }));
  assert.deepEqual(q, {
    monthLimit: null,
    monthRemaining: null,
    monthResetSeconds: null,
    secondLimit: null,
    secondRemaining: null,
    requestId: "abc",
  });
});

test("parseRetryAfter handles seconds, dates, and garbage", () => {
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter(""), null);
  assert.equal(parseRetryAfter("   "), null);
  assert.equal(parseRetryAfter("2"), 2000);
  assert.equal(parseRetryAfter("1.5"), 1500);
  assert.equal(parseRetryAfter("not-a-date"), null);
  const now = Date.parse("2026-10-19T12:00:00Z");
  assert.equal(parseRetryAfter(new Date(now + 3000).toUTCString(), now), 3000);
  assert.equal(parseRetryAfter(new Date(now - 3000).toUTCString(), now), 0);
});

test("isRetryableStatus covers transient statuses only", () => {
  for (const status of [429, 408, 500, 502, 503, 504]) {
    assert.equal(isRetryableStatus(status), true, String(status));
  }
  for (const status of [400, 401, 403, 404, 409, 422, 301]) {
    assert.equal(isRetryableStatus(status), false, String(status));
  }
});
