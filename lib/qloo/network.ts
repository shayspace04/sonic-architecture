import dns from "node:dns";
import { Agent, setGlobalDispatcher } from "undici";

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

  // Attempt public DNS IPv4 resolve first
  resolver.resolve4(hostname, (err, addresses) => {
    if (!err && addresses && addresses.length > 0) {
      if (options && options.all) {
        return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
      }
      return callback(null, addresses[0], 4);
    }
    // Fall back to OS dns.lookup
    dns.lookup(hostname, options, callback);
  });
}

let configured = false;

export function ensureQlooNetworkConfigured(): void {
  if (configured) return;
  configured = true;

  try {
    setGlobalDispatcher(
      new Agent({
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
  } catch (err) {
    console.warn("[Qloo Network] Failed to configure custom undici dispatcher:", err);
  }
}

// Auto-run on import in Node.js server environments
if (typeof window === "undefined") {
  ensureQlooNetworkConfigured();
}

