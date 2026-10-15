// The brand at the front of a Google name that is a page title (2026-10-15). Pure; the details step uses it too.

// " - ", " | ", " – ", " : " between a brand and the tagline Google keeps in some names. A hyphen inside a word
// ("Roto-Rooter") has no spaces around it and is not a split.
const TITLE_SEPARATOR = /\s+[-|–—:·]\s+|\s*\|\s*/;
// A front part that only describes ("Best Dentist", "Top Plumber") is not a brand.
const DESCRIBING = /^(?:the\s+)?(?:best|top|local|affordable|cheap|great|good|#1|number one)\b/i;

/**
 * "Wilshire Smile Studio - Los Angeles Dentist, Cosmetic..." gives "Wilshire Smile Studio", and "Bedigital.pk -
 * Digitizing Businesses - F..." gives "Bedigital" (the domain written as the name). Null when there is no tagline or
 * the front part is not a name.
 */
export function titleBrand(name: string, website?: string | null): string | null {
  const parts = name.split(TITLE_SEPARATOR).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  let first = parts[0];
  const domain = hostOf(website);
  const asDomain = /^([a-z0-9][a-z0-9-]*)\.[a-z]{2,}(\.[a-z]{2,})?$/i.exec(first);
  if (asDomain && (!domain || domain.startsWith(`${asDomain[1].toLowerCase()}.`))) first = asDomain[1];
  if (first.replace(/[^a-z0-9]/gi, "").length <= 3 || DESCRIBING.test(first)) return null;
  return first;
}

function hostOf(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
