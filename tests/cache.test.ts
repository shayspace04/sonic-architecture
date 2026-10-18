import { test } from "node:test";
import assert from "node:assert/strict";
import { TtlCache } from "../lib/qloo/cache";

test("cache miss loads once; subsequent access is a hit", async () => {
  let calls = 0;
  const cache = new TtlCache<string>();

  const first = await cache.getOrLoad("k", 1000, async () => {
    calls += 1;
    return "v1";
  });
  assert.equal(first.source, "upstream");
  assert.equal(first.value, "v1");

  const second = await cache.getOrLoad("k", 1000, async () => {
    calls += 1;
    return "v2";
  });
  assert.equal(second.source, "cache");
  assert.equal(second.value, "v1");
  assert.equal(calls, 1);
  assert.equal(cache.stats().hits, 1);
  assert.equal(cache.stats().misses, 1);
  assert.equal(cache.stats().loads, 1);
});

test("entries expire exactly at their TTL", async () => {
  let t = 0;
  const cache = new TtlCache<number>({ now: () => t });

  await cache.getOrLoad("k", 100, async () => 1);
  t = 99;
  assert.equal((await cache.getOrLoad("k", 100, async () => 2)).source, "cache");

  t = 100; // expiresAt <= now → expired
  const expired = await cache.getOrLoad("k", 100, async () => 3);
  assert.equal(expired.source, "upstream");
  assert.equal(expired.value, 3);
});

test("concurrent duplicate misses share a single flight", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const cache = new TtlCache<string>();
  const loader = async () => {
    calls += 1;
    await gate;
    return "shared";
  };

  const p1 = cache.getOrLoad("k", 1000, loader);
  const p2 = cache.getOrLoad("k", 1000, loader);
  release();

  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(calls, 1);
  assert.equal(r1.source, "upstream");
  assert.equal(r2.source, "coalesced");
  assert.equal(r1.value, "shared");
  assert.equal(r2.value, "shared");
});

test("failed loads are not cached and reject every waiter", async () => {
  let calls = 0;
  const cache = new TtlCache<string>();
  const failing = async () => {
    calls += 1;
    throw new Error("boom");
  };

  const p1 = cache.getOrLoad("k", 1000, failing);
  const p2 = cache.getOrLoad("k", 1000, failing);
  await assert.rejects(p1, /boom/);
  await assert.rejects(p2, /boom/);
  assert.equal(calls, 1);
  assert.equal(cache.get("k"), undefined);
  assert.equal(cache.stats().errors, 1);

  const recovered = await cache.getOrLoad("k", 1000, async () => {
    calls += 1;
    return "recovered";
  });
  assert.equal(recovered.value, "recovered");
  assert.equal(calls, 2);
});

test("LRU eviction bounds stored entries", async () => {
  const cache = new TtlCache<string>({ maxEntries: 2 });
  await cache.getOrLoad("a", 1000, async () => "A");
  await cache.getOrLoad("b", 1000, async () => "B");
  cache.get("a"); // refresh recency of a → b becomes the oldest

  await cache.getOrLoad("c", 1000, async () => "C");
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("a"), "A");
  assert.equal(cache.get("c"), "C");
  assert.equal(cache.stats().evictions, 1);
  assert.equal(cache.stats().size, 2);
});

test("invalidatePrefix removes only matching keys", async () => {
  const cache = new TtlCache<string>();
  await cache.set("insights|urn:entity:place|x", "1", 1000);
  await cache.set("insights|urn:entity:artist|y", "2", 1000);
  await cache.set("search|url", "3", 1000);
  const removed = cache.invalidatePrefix("insights|urn:entity:place|");
  assert.equal(removed, 1);
  assert.equal(cache.get("insights|urn:entity:artist|y"), "2");
  assert.equal(cache.get("search|url"), "3");
});
