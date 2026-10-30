import dns from "node:dns";

let undiciAgent: any = null;
let undiciSetGlobalDispatcher: any = null;

try {
  // Dynamically require undici to prevent webpack bundling runtime issues during build
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const undici = require("undici");
  undiciAgent = undici?.Agent || null;
  undiciSetGlobalDispatcher = undici?.setGlobalDispatcher || null;
} catch {
  // undici may not be available or needed in all runtimes
}

// Configure resilient DNS resolution for hackathon.api.qloo.com
// Host OS resolver intermittently fails getaddrinfo (ENOTFOUND) on cellular/NAT adapters.
// Public DNS (Google 8.8.8.8 & Cloudflare 1.1.1.1) resolves reliably in <50ms.
const resolver = new dns.Resolver();
try {
  resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Ignore if setServers fails in restricted environments
}

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

export function resilientQlooLookup(
  hostname: string,
  options: any,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
): void {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  let completed = false;
  const done = (err: NodeJS.ErrnoException | null, address: any, family?: number) => {
    if (completed) return;
    completed = true;
    callback(err, address, family);
  };

  // Fallback resolver using public DNS
  const tryCustomResolverFallback = () => {
    resolver.resolve4(hostname, (rErr, addresses) => {
      if (!rErr && addresses && addresses.length > 0) {
        if (options && options.all) {
          return done(null, addresses.map((a) => ({ address: a, family: 4 })));
        }
        return done(null, addresses[0], 4);
      }
      done(rErr, null);
    });
  };

  // 1. Try normal OS dns.lookup first
  try {
    dns.lookup(hostname, options, (err, address, family) => {
      if (!err && address) {
        return done(null, address, family);
      }
      // Fallback on error (ENOTFOUND, etc.)
      tryCustomResolverFallback();
    });
  } catch {
    tryCustomResolverFallback();
  }

  // 2. Timeout fallback: If normal lookup hangs/times out, fall back after 1200ms
  const timer = setTimeout(() => {
    if (!completed) {
      tryCustomResolverFallback();
    }
  }, 1200);
  if (timer.unref) timer.unref();
}

let configured = false;

export function ensureQlooNetworkConfigured(): void {
  if (configured) return;
  configured = true;

  try {
    if (undiciAgent && undiciSetGlobalDispatcher) {
      undiciSetGlobalDispatcher(
        new undiciAgent({
          connect: {
            lookup: resilientQlooLookup,
            timeout: 35_000, // 35s connect timeout for slow cellular hops
          },
          headersTimeout: 35_000,
          bodyTimeout: 35_000,
          keepAliveTimeout: 15_000,
          keepAliveMaxTimeout: 60_000,
        })
      );
    }
  } catch (err) {
    console.warn("[Qloo Network] Failed to configure custom undici dispatcher:", err);
  }
}

// Auto-run on import in Node.js server environments
if (typeof window === "undefined") {
  ensureQlooNetworkConfigured();
}

