import { test } from "node:test";
import assert from "node:assert/strict";
import { TtlCache } from "../lib/qloo/cache";
import { UsageTracker } from "../lib/qloo/usage";
import { collectProfile, MAX_INSIGHT_CALLS, type ProfileDeps } from "../lib/qloo/profile";

const QUOTA_HEADERS: Record<string, string> = {
  "x-month-ratelimit-limit": "10000",
  "x-month-ratelimit-remaining": "9880",
  "x-month-ratelimit-reset": "2293578.31",
  "x-second-ratelimit-limit": "5",
  "x-qloo-request-id": "req-1",
};

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

type Hit = { id: string; name: string; type: string };

function searchBody(hits: Hit[], tags: Array<{ name: string; type: string }> = []): unknown {
  return {
    results: hits.map((h) => ({
      entity_id: h.id,
      name: h.name,
      types: [h.type],
      tags,
    })),
  };
}

function insightsBody(artistNames: string[]): unknown {
  return {
    results: {
      entities: artistNames.map((name) => ({
        subtype: "urn:entity:artist",
        name,
        tags: [{ name: "jazz", type: "genre" }],
        properties: {
          adjectives_for_music: ["smooth"],
          characteristics: ["downtown"],
        },
      })),
    },
  };
}

interface Router {
  impl: typeof fetch;
  calls: string[];
}

function makeRouter(options: { quota?: boolean; delayMs?: number } = {}): Router {
  const calls: string[] = [];
  const headers = options.quota ? QUOTA_HEADERS : {};
  const impl: typeof fetch = async (input) => {
    const url = String(input);
    if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    calls.push(url);
    if (url.includes("query=first")) {
      return json(200, searchBody([{ id: "e1", name: "Miles Davis", type: "urn:entity:artist" }], [{ name: "jazz", type: "genre" }]), headers);
    }
    if (url.includes("query=second")) {
      return json(200, searchBody([{ id: "e2", name: "Herbie Hancock", type: "urn:entity:artist" }]), headers);
    }
    if (url.includes("query=third")) {
      return json(200, searchBody([{ id: "e3", name: "Soul Kitchen", type: "urn:entity:movie" }]), headers);
    }
    if (url.includes("query=fourth")) {
      return json(200, searchBody([{ id: "e4", name: "Invisible Cities", type: "urn:entity:book" }]), headers);
    }
    if (url.includes("query=fifth")) {
      return json(200, searchBody([{ id: "e5", name: "Lisbon", type: "urn:entity:place" }]), headers);
    }
    if (url.includes("query=missing")) {
      return json(200, { results: [] }, headers);
    }
    if (url.includes("query=broken")) {
      return json(404, { error: "not found" }, headers);
    }
    if (url.includes("/v2/insights")) {
      return json(200, insightsBody(["Miles Davis", "Herbie Hancock"]), headers);
    }
    return json(404, { error: "unknown route" }, headers);
  };
  return { impl, calls };
}

function makeDeps(router: Router, overrides: { budget?: number; cache?: TtlCache<Record<string, unknown>> } = {}): ProfileDeps {
  return {
    qlooApiUrl: "https://qloo.test",
    qlooApiKey: "test-key",
    cache: overrides.cache ?? new TtlCache<Record<string, unknown>>(),
    usage: new UsageTracker({ budget: overrides.budget ?? 100, filePath: null, log: () => {} }),
    ttl: { searchMs: 60_000, insightsMs: 60_000 },
    http: {
      fetchImpl: router.impl,
      sleep: async () => {},
      random: () => 0,
      timeoutMs: 50,
      maxAttempts: 1,
    },
    log: () => {},
  };
}

const searchCalls = (calls: string[]) => calls.filter((u) => u.includes("/search?"));
const insightCalls = (calls: string[]) => calls.filter((u) => u.includes("/v2/insights"));

test("resolves terms with bounded searches and one grouped, deduplicated insights call", async () => {
  const router = makeRouter();
  const deps = makeDeps(router);
  const out = await collectProfile(["first", "second"], deps);

  assert.equal(out.resolved.length, 2);
  assert.deepEqual(out.unresolvedTerms, []);
  assert.equal(out.errors.length, 0);
  assert.equal(out.budgetExhausted, false);

  assert.equal(searchCalls(router.calls).length, 2);
  assert.equal(insightCalls(router.calls).length, 1);
  assert.ok(searchCalls(router.calls).every((u) => u.includes("take=5")), "search take must match rendered bound");

  const insightsUrl = insightCalls(router.calls)[0];
  const decoded = decodeURIComponent(insightsUrl);
  assert.ok(decoded.includes("filter.type=urn:entity:artist"));
  assert.ok(decoded.includes("signal.interests.entities=e1,e2"), "ids sorted+deduped");
  assert.ok(decoded.includes("take=8"), "insights take matches rendered bound");

  assert.equal(out.insightsOk, 1);
  assert.equal(out.insightsFailed, 0);
  assert.equal(out.insightsAttempted, 1);
  assert.equal(out.typeCount, 1);
  assert.ok(out.mergedEvidence.genreTags.includes("jazz"));
  assert.ok(out.mergedEvidence.characteristics.includes("downtown"));
  assert.ok(out.artists.some((a) => a.name === "Miles Davis"));
  assert.equal(out.upstreamCalls, 3); // 2 searches + 1 insights, no retries
  assert.equal(out.quota, null); // no quota headers on these responses
});

test("a second identical run issues zero upstream requests (quota-safe cache)", async () => {
  const router = makeRouter({ quota: true });
  const deps = makeDeps(router);

  const first = await collectProfile(["first"], deps);
  assert.equal(first.upstreamCalls, 2);
  assert.equal(first.quota?.monthLimit, 10000); // real headers exposed
  assert.equal(first.quota?.requestId, "req-1");
  const callsAfterFirst = router.calls.length;

  const second = await collectProfile(["first"], deps);
  assert.equal(router.calls.length, callsAfterFirst, "cached run must not hit upstream");
  assert.equal(second.upstreamCalls, 0);
  assert.equal(second.quota, null, "cache-only runs must not expose stale quota metadata");
  assert.equal(second.resolved.length, first.resolved.length);
  assert.equal(second.insightsOk, first.insightsOk);
  assert.equal(second.budgetExhausted, false);
});

test("insights requests are order-independent: swapped terms reuse every cache entry", async () => {
  const router = makeRouter();
  const cache = new TtlCache<Record<string, unknown>>();
  const deps = makeDeps(router, { cache });

  const run1 = await collectProfile(["first", "second"], deps);
  const callsAfterRun1 = router.calls.length;
  assert.ok(callsAfterRun1 >= 3);

  const run2 = await collectProfile(["second", "first"], deps);
  assert.equal(router.calls.length, callsAfterRun1, "swapped term order must be fully served from cache");
  assert.equal(run2.upstreamCalls, 0);
  assert.deepEqual(
    run2.resolved.map((e) => e.id).sort(),
    run1.resolved.map((e) => e.id).sort()
  );
});

test("concurrent identical profiles coalesce into a single upstream request per endpoint", async () => {
  const router = makeRouter({ delayMs: 10 });
  const deps = makeDeps(router);

  const [a, b] = await Promise.all([collectProfile(["first"], deps), collectProfile(["first"], deps)]);

  assert.equal(searchCalls(router.calls).length, 1, "single-flight search");
  assert.equal(insightCalls(router.calls).length, 1, "single-flight insights");
  assert.equal(a.resolved.length, 1);
  assert.equal(b.resolved.length, 1);
  assert.equal(a.upstreamCalls + b.upstreamCalls, 2, "only the load owner counts upstream attempts");
});

test("budget exhaustion mid-profile: allowed calls run, the rest are skipped with explicit errors", async () => {
  const router = makeRouter();
  const deps = makeDeps(router, { budget: 1 });

  const out = await collectProfile(["first", "second"], deps);

  assert.equal(searchCalls(router.calls).length, 1, "second search never leaves the process");
  assert.equal(out.resolved.length, 1);
  assert.ok(out.unresolvedTerms.includes("second"));
  assert.equal(out.budgetExhausted, true);
  assert.ok(out.errors.some((e) => e.includes('"second" skipped') && e.includes("budget exhausted")));
  assert.equal(out.insightsOk, 0);
  assert.equal(out.insightsFailed, 1, "insights phase reports budget skip");
  assert.equal(out.insightsAttempted, 0);
  assert.ok(out.errors.some((e) => e.includes("Insights for urn:entity:artist skipped")));
  assert.equal(out.typeCount, 1);
});

test("budget already exhausted before the profile starts: zero upstream attempts", async () => {
  const router = makeRouter();
  const deps = makeDeps(router, { budget: 1 });
  deps.usage.recordAttempt("search", 200); // spend the only unit
  assert.equal(deps.usage.exhausted, true);

  const out = await collectProfile(["first", "second"], deps);
  assert.equal(router.calls.length, 0);
  assert.equal(out.upstreamCalls, 0);
  assert.equal(out.resolved.length, 0);
  assert.equal(out.budgetExhausted, true);
  assert.equal(out.unresolvedTerms.length, 2);
  assert.equal(out.errors.length, 2);
});

test("search HTTP failure leaves the term unresolved with an honest error", async () => {
  const router = makeRouter();
  const deps = makeDeps(router);

  const out = await collectProfile(["broken", "first"], deps);
  assert.ok(out.unresolvedTerms.includes("broken"));
  assert.ok(out.errors.some((e) => e.includes('Search for "broken" failed (HTTP 404).')));
  assert.ok(out.resolved.some((e) => e.searchTerm === "first"), "other terms still resolve");
});

test("empty search results mark the term unresolved without fabricating entities", async () => {
  const router = makeRouter();
  const deps = makeDeps(router);

  const out = await collectProfile(["missing"], deps);
  assert.equal(out.resolved.length, 0);
  assert.deepEqual(out.unresolvedTerms, ["missing"]);
  assert.equal(out.artists.length, 0);
  assert.equal(out.errors.length, 0);
  assert.equal(insightCalls(router.calls).length, 0, "no anchors → no insights call");
});

test("request caps hold: <=5 term searches and <=MAX_INSIGHT_CALLS insights", async () => {
  const router = makeRouter();
  const deps = makeDeps(router, { budget: 1000 });

  const out = await collectProfile(["first", "second", "third", "fourth", "fifth"], deps);

  assert.equal(searchCalls(router.calls).length, 5, "one search per term, capped by parse bound");
  assert.equal(out.typeCount, 4, "four distinct supported types");
  assert.equal(insightCalls(router.calls).length, MAX_INSIGHT_CALLS, "insights capped at 3");
  assert.equal(out.insightsAttempted, MAX_INSIGHT_CALLS);
  assert.equal(out.insightsOk, MAX_INSIGHT_CALLS);
});
