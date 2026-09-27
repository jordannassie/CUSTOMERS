// Pure rules for the Settings page (B-55). No framework, database or env imports, so the forms use them too.
import type { Frequency, ModelId } from "./schema";

// MVP_SPEC 4.5.
export const MODELS: { id: ModelId; label: string; explanation: string }[] = [
  { id: "openai", label: "ChatGPT", explanation: "The most used AI. Most of your customers ask here." },
  { id: "anthropic", label: "Claude", explanation: "Growing fast, popular with professionals." },
  { id: "perplexity", label: "Perplexity", explanation: "An AI search engine. Always checks the web and shows its sources." },
];

export function untickWarning(label: string): string {
  return `You won't see whether ${label} recommends you. Customers using it are invisible to your report.`;
}

export const FREQUENCY_LABELS: Record<Frequency, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

/** "https://www.Example.com/about?x=1" becomes "www.example.com". Empty means no website. */
export function normalizeWebsite(input: string): { ok: true; domain: string | null } | { ok: false } {
  const raw = input.trim().toLowerCase();
  if (!raw) return { ok: true, domain: null };
  const host = raw.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  const valid = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host);
  return valid ? { ok: true, domain: host } : { ok: false };
}

/** Commas or new lines separate services; blanks and repeats are dropped. */
export function parseServices(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => {
      const key = s.toLowerCase();
      if (!s || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

// SVG is left out on purpose: the bucket is public and an SVG can carry script.
const LOGO_TYPES = [
  { contentType: "image/png", matches: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { contentType: "image/jpeg", matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    contentType: "image/webp",
    matches: (b: Uint8Array) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  },
];

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.subarray(from, to));
}

export const LOGO_RULES = "PNG, JPG or WebP, up to 2 MB.";

/** Checks the file's own bytes, not just the type the browser sent. */
export function checkLogo(size: number, head: Uint8Array): { ok: true; contentType: string } | { ok: false; error: string } {
  if (size === 0) return { ok: false, error: `Choose an image. ${LOGO_RULES}` };
  if (size > LOGO_MAX_BYTES) return { ok: false, error: `That file is too big. ${LOGO_RULES}` };
  const type = LOGO_TYPES.find((t) => t.matches(head));
  if (!type) return { ok: false, error: `That file type isn't supported. ${LOGO_RULES}` };
  return { ok: true, contentType: type.contentType };
}
