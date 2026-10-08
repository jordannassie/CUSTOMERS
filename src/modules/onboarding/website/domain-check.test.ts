import { describe, expect, it } from "vitest";
import { checkDomain, websiteNotFoundText } from "./domain-check";

const dnsError = (code: string) => Object.assign(new Error(code), { code });

describe("checkDomain (BUG-102)", () => {
  it("finds a domain when it or its www. name resolves", async () => {
    expect(await checkDomain("beyondwow.com", async () => ({ address: "1.2.3.4" }))).toBe("found");
    expect(await checkDomain("beyondwow.com", async (host) => (host.startsWith("www.") ? {} : Promise.reject(dnsError("ENOTFOUND"))))).toBe("found");
  });

  it("calls a typo not found only when no name exists", async () => {
    expect(await checkDomain("beyondwow.comf", async () => Promise.reject(dnsError("ENOTFOUND")))).toBe("not_found");
  });

  it("never blocks on a DNS error that is not proof of a typo", async () => {
    expect(await checkDomain("beyondwow.com", async () => Promise.reject(dnsError("ETIMEOUT")))).toBe("unknown");
    expect(await checkDomain("beyondwow.com", async () => Promise.reject(dnsError("ESERVFAIL")))).toBe("unknown");
  });

  it("names the address in the message", () => {
    expect(websiteNotFoundText("beyondwow.comf")).toBe(
      "We couldn't find a website at beyondwow.comf. Check the address for a typo, or choose I don't have a website.",
    );
  });
});
