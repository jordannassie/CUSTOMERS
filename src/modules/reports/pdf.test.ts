import { afterEach, describe, expect, it, vi } from "vitest";

// B-60 with a mocked Browserless: no request ever leaves the machine.
vi.hoisted(() => {
  vi.stubEnv("PDF_RENDERER", "browserless");
  vi.stubEnv("BROWSERLESS_API_KEY", "test-key");
  vi.stubEnv("BROWSERLESS_URL", "https://browserless.test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.customers.test");
});

const { PdfError, isOwnReportUrl, renderPdf } = await import("./pdf");
const { pdfFileName } = await import("./service");

const TOKEN = "a".repeat(43);
const URL_OK = `https://app.customers.test/r/${TOKEN}`;
const PDF = new TextEncoder().encode("%PDF-1.7 test");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("renderPdf with Browserless", () => {
  it("prints the share page, waits for the ready element, and returns the bytes", async () => {
    const fetchMock = vi.fn(async () => new Response(PDF, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const bytes = await renderPdf(URL_OK, "Sunrise <Coffee> & Bar");

    expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.7 test");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(endpoint.origin).toBe("https://browserless.test");
    expect(endpoint.pathname).toBe("/pdf");
    expect(endpoint.searchParams.get("token")).toBe("test-key");
    const body = JSON.parse(String(init.body));
    expect(body.url).toBe(URL_OK);
    expect(body.waitForSelector.selector).toBe("[data-report-ready]");
    expect(body.options).toMatchObject({ format: "Letter", printBackground: true, displayHeaderFooter: true });
    expect(body.options.margin.top).toBeTruthy();
    expect(body.options.footerTemplate).toContain('class="pageNumber"');
    expect(body.options.footerTemplate).toContain('class="totalPages"');
    expect(body.options.headerTemplate).toContain("Sunrise &lt;Coffee&gt; &amp; Bar");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws a PdfError without the key when Browserless fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    const error = await renderPdf(URL_OK, "Sunrise").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PdfError);
    expect(String((error as Error).message)).not.toContain("test-key");
  });

  it("gives up with a PdfError when Browserless does not answer in time", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: URL, init: RequestInit) =>
          new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason))),
      ),
    );
    const pending = renderPdf(URL_OK, "Sunrise").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(21_000);
    expect(await pending).toBeInstanceOf(PdfError);
  });

  it("never opens anything but our own share page", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const url of [
      `https://evil.test/r/${TOKEN}`,
      "https://app.customers.test/dashboard",
      `https://app.customers.test/r/${TOKEN}/logo`,
      "https://app.customers.test/r/short",
    ]) {
      await expect(renderPdf(url, "x")).rejects.toBeInstanceOf(PdfError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isOwnReportUrl(URL_OK, "https://app.customers.test/")).toBe(true);
  });
});

describe("pdfFileName", () => {
  const now = new Date("2026-09-29T15:00:00Z");
  it("names the file after the business and the date", () => {
    expect(pdfFileName("Sunrise Coffee Bar", now)).toBe("sunrise-coffee-bar-ai-visibility-2026-09-29.pdf");
    expect(pdfFileName("Café & Co.", now)).toBe("cafe-co-ai-visibility-2026-09-29.pdf");
    expect(pdfFileName("!!!", now)).toBe("report-ai-visibility-2026-09-29.pdf");
  });
});
