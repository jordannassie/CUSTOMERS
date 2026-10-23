// Is there a website at this address? A typo such as "beyondwow.comf" has no DNS record, so setup can say so on the
// website field instead of "we couldn't find your details" (BUG-102). Never stores anything.
import { lookup } from "node:dns/promises";

export type DomainCheck = "found" | "not_found" | "unknown";
export type Resolve = (host: string) => Promise<unknown>;

const TIMEOUT_MS = 3_000;
// "No such name": the address does not exist. Any other DNS error (timeout, resolver down) is not proof of a typo.
const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA"]);

async function resolveOne(host: string, resolve: Resolve): Promise<DomainCheck> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DomainCheck>((done) => {
    timer = setTimeout(() => done("unknown"), TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      resolve(host).then(
        (): DomainCheck => "found",
        (error: { code?: string }): DomainCheck => (NOT_FOUND.has(error?.code ?? "") ? "not_found" : "unknown"),
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** "not_found" only when neither the domain nor its www. name exists. */
export async function checkDomain(domain: string, resolve: Resolve = (host) => lookup(host)): Promise<DomainCheck> {
  const [bare, www] = await Promise.all([resolveOne(domain, resolve), resolveOne(`www.${domain}`, resolve)]);
  if (bare === "found" || www === "found") return "found";
  return bare === "not_found" && www === "not_found" ? "not_found" : "unknown";
}

export function websiteNotFoundText(domain: string): string {
  return `We couldn't find a website at ${domain}. Check the address for a typo, or choose I don't have a website.`;
}
