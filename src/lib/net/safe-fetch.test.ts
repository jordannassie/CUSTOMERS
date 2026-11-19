import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isPublicAddress } from "./ip-policy";
import { createSafeFetch, SafeFetchError, safeFetch } from "./safe-fetch";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "100.127.255.255", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1",
    "::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "fe80::1%eth0", "ff02::1", "2001:db8::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "::ffff:a9fe:a9fe", "64:ff9b::a9fe:a9fe",
    "2002:7f00:1::", "2001::1", "not-an-ip", "",
  ])("blocks %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "100.128.0.1", "2606:4700:4700::1111", "[2a00:1450::1]", "::ffff:8.8.8.8"])(
    "allows %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );
});

describe("safeFetch refuses private targets before connecting", () => {
  it.each([
    "http://127.0.0.1/",
    "http://localhost:3000/",
    "http://2130706433/",
    "http://0x7f.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:a9fe:a9fe]/",
    "file:///etc/passwd",
    "ftp://example.com/",
    "http://user:pass@example.com/",
  ])("%s", async (url) => {
    await expect(safeFetch(url)).rejects.toThrow();
  });
});

describe("safeFetch against a test server", () => {
  let server: Server;
  let port = 0;
  let lookups = 0;
  // The test server is on loopback, so the tests treat that one address as public and nothing else.
  const fetchVia = (resolve: (host: string) => string[]) =>
    createSafeFetch({
      resolve: async (host) => resolve(host).map((address) => ({ address, family: address.includes(":") ? 6 : 4 })),
      isAllowedAddress: (a) => a === "127.0.0.1" || isPublicAddress(a),
    });
  const site = fetchVia((host) => (host === "site.test" ? ["127.0.0.1"] : host === "inside.test" ? ["10.0.0.5"] : []));
  const url = (path: string, host = "site.test") => `http://${host}:${port}${path}`;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = req.url ?? "/";
      if (path === "/page") return res.end("<html>hello</html>");
      if (path === "/hop") return res.writeHead(302, { location: "/page" }).end();
      if (path === "/to-metadata") return res.writeHead(302, { location: "http://169.254.169.254/" }).end();
      if (path === "/to-inside") return res.writeHead(301, { location: url("/page", "inside.test") }).end();
      if (path === "/to-ipv6") return res.writeHead(302, { location: "http://[::1]/" }).end();
      if (path === "/to-file") return res.writeHead(302, { location: "file:///etc/passwd" }).end();
      if (path === "/loop") return res.writeHead(302, { location: "/loop" }).end();
      if (path === "/big") return res.end("x".repeat(50_000));
      if (path === "/gzip") return res.writeHead(200, { "content-encoding": "gzip" }).end(gzipSync("zipped page"));
      res.writeHead(404).end();
    });
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => server.close());

  it("reads a page and follows a safe redirect", async () => {
    expect(await site(url("/page"))).toMatchObject({ ok: true, status: 200, text: "<html>hello</html>" });
    expect(await site(url("/hop"))).toMatchObject({ ok: true, text: "<html>hello</html>", url: url("/page") });
  });

  it("refuses a redirect to a private IP, a private hostname, IPv6 loopback or a file URL", async () => {
    await expect(site(url("/to-metadata"))).rejects.toBeInstanceOf(SafeFetchError);
    await expect(site(url("/to-inside"))).rejects.toBeInstanceOf(SafeFetchError);
    await expect(site(url("/to-ipv6"))).rejects.toBeInstanceOf(SafeFetchError);
    await expect(site(url("/to-file"))).rejects.toBeInstanceOf(SafeFetchError);
  });

  it("refuses a hostname when any resolved address is private", async () => {
    await expect(site(url("/page", "inside.test"))).rejects.toBeInstanceOf(SafeFetchError);
    const mixed = fetchVia(() => ["127.0.0.1", "10.0.0.5"]);
    await expect(mixed(url("/page"))).rejects.toBeInstanceOf(SafeFetchError);
  });

  it("checks the address at connect time on every hop, so DNS rebinding is caught", async () => {
    lookups = 0;
    const rebinding = fetchVia(() => (++lookups === 1 ? ["127.0.0.1"] : ["169.254.169.254"]));
    await expect(rebinding(url("/hop"))).rejects.toBeInstanceOf(SafeFetchError);
    expect(lookups).toBe(2);
  });

  it("stops after the redirect cap", async () => {
    await expect(site(url("/loop"), { maxRedirects: 3 })).rejects.toThrow("Too many redirects");
  });

  it("caps the body size and decodes gzip", async () => {
    expect((await site(url("/big"), { maxBytes: 1000 })).text).toHaveLength(1000);
    expect((await site(url("/gzip"))).text).toBe("zipped page");
  });
});
