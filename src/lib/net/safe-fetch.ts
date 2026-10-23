import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { isPublicAddress } from "./ip-policy";

/** Thrown when a URL, a redirect hop or a resolved address is not allowed. */
export class SafeFetchError extends Error {
  name = "SafeFetchError";
}

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
};

export type SafeResponse = { status: number; ok: boolean; url: string; contentType: string; text: string };

export type SafeFetchDeps = {
  resolve: (hostname: string) => Promise<LookupAddress[]>;
  isAllowedAddress: (address: string) => boolean;
};

const DEFAULT_DEPS: SafeFetchDeps = {
  resolve: (hostname) =>
    new Promise((ok, fail) => dnsLookup(hostname, { all: true }, (err, list) => (err ? fail(err) : ok(list)))),
  isAllowedAddress: isPublicAddress,
};

const USER_AGENT = "Mozilla/5.0 (compatible; CustomersDirectScanner/1.0; +https://customers.direct)";

function checkUrl(raw: string | URL, deps: SafeFetchDeps): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeFetchError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SafeFetchError("Only http and https are allowed");
  if (url.username || url.password) throw new SafeFetchError("URLs with credentials are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !deps.isAllowedAddress(host)) throw new SafeFetchError("Address not allowed");
  return url;
}

// Runs when the socket connects, so the address checked is the address used (no DNS rebinding window).
function guardedLookup(deps: SafeFetchDeps): LookupFunction {
  return (hostname, options, callback) => {
    deps.resolve(hostname).then(
      (addresses) => {
        if (addresses.length === 0 || addresses.some((a) => !deps.isAllowedAddress(a.address))) {
          callback(new SafeFetchError("Address not allowed"), "", 0);
        } else if (options.all) {
          (callback as unknown as (e: null, list: LookupAddress[]) => void)(null, addresses);
        } else {
          callback(null, addresses[0].address, addresses[0].family);
        }
      },
      (err: NodeJS.ErrnoException) => callback(err, "", 0),
    );
  };
}

function request(url: URL, deps: SafeFetchDeps, headers: Record<string, string>, signal: AbortSignal) {
  const client = url.protocol === "https:" ? https : http;
  return new Promise<IncomingMessage>((resolve, reject) => {
    const req = client.request(url, {
      method: "GET",
      agent: false,
      lookup: guardedLookup(deps),
      signal,
      headers: { "user-agent": USER_AGENT, "accept-encoding": "gzip, deflate, br", ...headers },
    });
    req.on("response", resolve);
    req.on("error", reject);
    req.end();
  });
}

function decoded(res: IncomingMessage): NodeJS.ReadableStream {
  const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
  if (encoding === "gzip" || encoding === "x-gzip") return res.pipe(createGunzip());
  if (encoding === "deflate") return res.pipe(createInflate());
  if (encoding === "br") return res.pipe(createBrotliDecompress());
  return res;
}

// Stops reading at maxBytes of decoded body, so a huge or compressed-bomb page cannot fill memory.
async function readCapped(res: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of decoded(res)) {
      const buf = chunk as Buffer;
      chunks.push(buf.subarray(0, maxBytes - size));
      size += Math.min(buf.length, maxBytes - size);
      if (size >= maxBytes) break;
    }
  } finally {
    res.destroy();
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Builds a GET-only fetch for user-supplied URLs. Tests pass their own resolver and address rule. */
export function createSafeFetch(deps: SafeFetchDeps = DEFAULT_DEPS) {
  return async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeResponse> {
    const { timeoutMs = 10_000, maxBytes = 2 * 1024 * 1024, maxRedirects = 5, headers = {} } = options;
    const signal = AbortSignal.timeout(timeoutMs);
    let url = checkUrl(rawUrl, deps);

    for (let hop = 0; ; hop++) {
      const res = await request(url, deps, headers, signal);
      const status = res.statusCode ?? 0;
      const location = res.headers.location;
      if (status >= 300 && status < 400 && location) {
        res.destroy();
        if (hop >= maxRedirects) throw new SafeFetchError("Too many redirects");
        url = checkUrl(new URL(location, url), deps);
        continue;
      }
      const text = await readCapped(res, maxBytes);
      const contentType = String(res.headers["content-type"] ?? "");
      return { status, ok: status >= 200 && status < 300, url: url.toString(), contentType, text };
    }
  };
}

export const safeFetch = createSafeFetch();
