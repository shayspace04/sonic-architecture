import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { Agent, setGlobalDispatcher } from "undici";

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

setGlobalDispatcher(
  new Agent({
    connect: { timeout: 20_000 },
    headersTimeout: 20_000,
    bodyTimeout: 20_000,
  })
);

const envText = fs.readFileSync(".env.local", "utf-8");
const match = envText.match(/QLOO_API_KEY=(.+)/);
if (!match || !match[1].trim()) {
  console.error("Missing QLOO_API_KEY in .env.local");
  process.exit(1);
}
const apiKey = match[1].trim();
const BASE_URL = "https://hackathon.api.qloo.com";

const SAMPLES_DIR = path.resolve(".qloo-samples");
if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

async function fetchWithRetry(urlPath, filename) {
  const fullUrl = `${BASE_URL}${urlPath}`;
  const start = Date.now();
  let attempt = 0;
  let lastErr = null;

  while (attempt < 2) {
    attempt++;
    try {
      const resp = await fetch(fullUrl, {
        headers: {
          "X-Api-Key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      });

      const latencyMs = Date.now() - start;
      const data = await resp.json();
      const count =
        Array.isArray(data?.results)
          ? data.results.length
          : Array.isArray(data?.results?.entities)
          ? data.results.entities.length
          : Array.isArray(data?.results?.tags)
          ? data.results.tags.length
          : Array.isArray(data?.results?.demographics)
          ? data.results.demographics.length
          : data?.results
          ? Object.keys(data.results).length
          : 0;

      console.log(
        `[Qloo Outbound] ${urlPath} status=${resp.status} latency=${latencyMs}ms count=${count} cache=miss errorClass=none (attempt ${attempt})`
      );

      fs.writeFileSync(
        path.join(SAMPLES_DIR, filename),
        JSON.stringify(data, null, 2),
        "utf-8"
      );

      return { ok: resp.ok, status: resp.status, latencyMs, count, data };
    } catch (err) {
      lastErr = err;
      const latencyMs = Date.now() - start;
      const errorClass =
        err?.name === "TimeoutError" || err?.name === "AbortError"
          ? "TimeoutError"
          : (err?.cause?.code || err?.name || "FetchError");
      console.warn(
        `[Qloo Outbound] ${urlPath} status=0 latency=${latencyMs}ms cache=miss errorClass=${errorClass} (attempt ${attempt} failed)`
      );
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return { ok: false, status: 0, error: String(lastErr) };
}

async function main() {
  console.log("=== Phase C0: Recording Real Qloo Response Shapes ===");

  // 1. Search Miles Davis
  const search = await fetchWithRetry(
    "/search?query=Miles+Davis&types=urn:entity:artist&take=3",
    "search-artist.json"
  );

  const milesId =
    search.data?.results?.[0]?.entity_id || "578CFC26-B696-449A-9655-3FB270DDA725";
  console.log(`Using Resolved Miles Davis ID: ${milesId}`);

  // 2. Insights: Places
  await fetchWithRetry(
    `/v2/insights?filter.type=urn:entity:place&signal.interests.entities=${milesId}&feature.explainability=true&take=6`,
    "insights-places.json"
  );

  // 3. Insights: Artists (Soundtrack)
  await fetchWithRetry(
    `/v2/insights?filter.type=urn:entity:artist&signal.interests.entities=${milesId}&feature.explainability=true&take=6`,
    "insights-artists.json"
  );

  // 4. Insights: Movies
  await fetchWithRetry(
    `/v2/insights?filter.type=urn:entity:movie&signal.interests.entities=${milesId}&feature.explainability=true&take=6`,
    "insights-movies.json"
  );

  // 5. Insights: Brands
  await fetchWithRetry(
    `/v2/insights?filter.type=urn:entity:brand&signal.interests.entities=${milesId}&feature.explainability=true&take=6`,
    "insights-brands.json"
  );

  // 6. Taste Analysis: Tags
  await fetchWithRetry(
    `/v2/insights?filter.type=urn:tag&signal.interests.entities=${milesId}&take=10`,
    "taste-tags.json"
  );

  // 7. Demographics
  await fetchWithRetry(
    `/v2/insights?filter.type=urn:demographics&signal.interests.entities=${milesId}`,
    "demographics.json"
  );

  // 8. Tags search
  await fetchWithRetry(
    "/v2/tags?filter.query=jazz&take=5",
    "tags-search.json"
  );

  console.log("=== Recorded all sample shapes into .qloo-samples/ ===");
}

main().catch(console.error);
