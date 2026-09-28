import "server-only";
import { env } from "@/lib/env";
import { SHARE_TOKEN } from "./service";

// PDF export (B-60, D-71): print our own share page in hosted Chrome, or in our own Chromium behind the same
// function. Either way the charts are drawn first, because both wait for the page's data-report-ready element.

export const PDF_TIMEOUT_MS = 20_000;
const READY = "[data-report-ready]";

export class PdfError extends Error {}

const MARGIN = { top: "0.7in", bottom: "0.7in", left: "0.5in", right: "0.5in" };
const TEXT = "font-family: Helvetica, Arial, sans-serif; font-size: 8px; color: #6b7280; width: 100%; padding: 0 0.5in;";

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Chrome fills the pageNumber and totalPages spans itself.
function printOptions(title: string) {
  return {
    format: "Letter" as const,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="${TEXT} display: flex; justify-content: space-between;"><span>${escapeHtml(title)}</span><span>AI visibility report</span></div>`,
    footerTemplate: `<div style="${TEXT} text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
    margin: MARGIN,
  };
}

/** Where our own site lives. Never the request's Host header, which the caller controls. */
export function siteOrigin(): string {
  const origin = env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_SITE_URL;
  if (!origin) throw new PdfError("Set NEXT_PUBLIC_APP_URL so the PDF export can open the share page.");
  return new URL(origin).origin;
}

/** True only for a share page on our own site: the one thing renderPdf will ever open. */
export function isOwnReportUrl(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    const [, r, token, ...rest] = parsed.pathname.split("/");
    return parsed.origin === new URL(origin).origin && r === "r" && SHARE_TOKEN.test(token ?? "") && rest.length === 0;
  } catch {
    return false;
  }
}

/** The share page at `url` as PDF bytes. Throws PdfError when it cannot be made in time. */
export async function renderPdf(url: string, title: string): Promise<Uint8Array> {
  if (!isOwnReportUrl(url, siteOrigin())) throw new PdfError("Only our own share pages can be printed");
  const signal = AbortSignal.timeout(PDF_TIMEOUT_MS);
  try {
    return env.PDF_RENDERER === "chromium" ? await withChromium(url, title, signal) : await withBrowserless(url, title, signal);
  } catch (error) {
    if (error instanceof PdfError) throw error;
    const reason = error instanceof Error ? error.message.split("\n")[0].replace(/\/r\/[\w-]+/g, "/r/<token>") : "unknown";
    throw new PdfError(`PDF render failed: ${reason}`, { cause: error });
  }
}

async function withBrowserless(url: string, title: string, signal: AbortSignal): Promise<Uint8Array> {
  if (!env.BROWSERLESS_API_KEY) throw new PdfError("BROWSERLESS_API_KEY is not set");
  const endpoint = new URL("/pdf", env.BROWSERLESS_URL);
  endpoint.searchParams.set("token", env.BROWSERLESS_API_KEY);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      options: printOptions(title),
      gotoOptions: { waitUntil: "networkidle2", timeout: PDF_TIMEOUT_MS },
      waitForSelector: { selector: READY, timeout: PDF_TIMEOUT_MS },
    }),
    signal,
  });
  // The endpoint URL holds the key, so errors only ever carry the status.
  if (!response.ok) throw new PdfError(`Browserless answered ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function chromiumBinary(): Promise<{ executablePath: string; args?: string[] }> {
  if (env.CHROMIUM_PATH) return { executablePath: env.CHROMIUM_PATH };
  const { default: serverless } = await import("@sparticuz/chromium");
  return { executablePath: await serverless.executablePath(), args: serverless.args };
}

async function withChromium(url: string, title: string, signal: AbortSignal): Promise<Uint8Array> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ ...(await chromiumBinary()), timeout: PDF_TIMEOUT_MS });
  const closed = () => browser.close().catch(() => {});
  signal.addEventListener("abort", closed, { once: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(PDF_TIMEOUT_MS);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector(READY, { state: "attached" });
    return new Uint8Array(await page.pdf(printOptions(title)));
  } finally {
    signal.removeEventListener("abort", closed);
    await closed();
  }
}
