import { test } from "node:test";
import assert from "node:assert/strict";
import { localFallbackPayload } from "../lib/fallback";

test("local fallback is honest, neutral, and clearly labeled", () => {
  const payload = localFallbackPayload(
    ["miles davis"],
    ["QLOO_API_KEY is not configured on the server."],
    ["Extra limitation."]
  );

  assert.equal(payload.fallback, true);
  assert.equal(payload.reasoning.source, "local-fallback");
  assert.ok(["qloo", "qloo-partial", "local-fallback"].includes(payload.reasoning.source));

  // No fabricated Qloo evidence, artists, tracks, or entities.
  assert.equal(payload.reasoning.evidence.length, 0);
  assert.deepEqual(payload.artists, []);
  assert.deepEqual(payload.tracks, []);
  assert.deepEqual(payload.entities, []);
  assert.deepEqual(payload.evidence, {
    genreTags: [],
    styleTags: [],
    themeTags: [],
    adjectives: [],
    characteristics: [],
  });
  assert.equal(payload.menu.startsWith("Local fallback"), true);

  // Terms and errors are preserved verbatim for transparency.
  assert.deepEqual(payload.submittedTerms, ["miles davis"]);
  assert.deepEqual(payload.unresolvedTerms, ["miles davis"]);
  assert.ok(payload.errors.includes("QLOO_API_KEY is not configured on the server."));
  assert.ok(payload.limitations.some((l) => l.includes("labeled local fallback")));
  assert.ok(payload.limitations.includes("Extra limitation."));

  // Spatial mapping stays neutral but complete (usable UI payload).
  assert.match(payload.primaryColorHex, /^#[0-9A-Fa-f]{6}$/);
  assert.match(payload.accentColorHex, /^#[0-9A-Fa-f]{6}$/);
  assert.ok(payload.lightingTemperatureK > 0);
  assert.ok(payload.concept.title.length > 0);

  // Additive quota field is absent on the fallback path.
  assert.equal("quota" in payload, false);
});
