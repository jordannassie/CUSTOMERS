// Text people typed into the contact form, chat or Suggest a feature, made fit for the admin pages. React already
// shows it as plain text, so markup can't run; but a security test or a spam bot leaves things like
// <img src=x onerror=alert(1)> that mean nothing to an admin. These helpers spot that, show the text without it, and
// only link a website that is a real web address. Pure.

// HTML tags a person never types in a message, script URLs, inline event handlers and escaped script tags.
const CODE =
  /<\s*\/?\s*(script|img|svg|iframe|object|embed|style|link|meta|body|input|form|a|div|span|video|audio|math|details|base)\b|javascript\s*:|data\s*:\s*text\/html|\bon[a-z]+\s*=|&lt;\s*script/i;

/** True when any of the texts holds web code: almost always spam or a security test, not a real message. */
export function looksLikeCode(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => !!t && CODE.test(t));
}

/** The text with tags, script URLs and the stray quotes and brackets around them taken out. */
export function withoutCode(text: string): string {
  return text
    .replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<[^>]*>?/g, " ")
    .replace(/javascript\s*:\S*/gi, " ")
    .replace(/["']\s*>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** A link for a website someone gave, or null when it isn't a plain http(s) address (script URLs never link). */
export function websiteHref(website: string | null | undefined): string | null {
  const value = website?.trim();
  if (!value || looksLikeCode(value)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // A real site has a dot in its name ("example.com"), and no spaces or quotes made it through.
    return url.hostname.includes(".") && !/[\s"'<>]/.test(value) ? url.href : null;
  } catch {
    return null;
  }
}
