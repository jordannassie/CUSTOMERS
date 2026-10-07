// ISO country codes for the providers' user_location (MVP_SPEC 5.1, BUG-073). Pure functions, no I/O.

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "US",
  "u s": "US",
  "u s a": "US",
  "united states of america": "US",
  uk: "GB",
};

let countryNames: Map<string, string> | null = null;

/** "pakistan" -> "PK", built once from the runtime's own country names. */
function countryByName(key: string): string | undefined {
  if (!countryNames) {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    countryNames = new Map();
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const name = names.of(code);
        const key = name && name !== code ? normaliseCountry(name) : "";
        // The first code wins, so "United Kingdom" stays GB and is not taken by the reserved UK.
        if (key && !countryNames.has(key)) countryNames.set(key, code);
      }
    }
  }
  return countryNames.get(key);
}

function normaliseCountry(text: string): string {
  return text.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The providers want an ISO country code; businesses store whatever onboarding saved. An unknown country is ""
 * and is left out of the request, never guessed as the US (BUG-073).
 */
export function countryCode(country: string | null): string {
  const text = (country ?? "").trim();
  if (/^[a-z]{2}$/i.test(text)) return text.toUpperCase();
  const key = normaliseCountry(text);
  if (!key) return "";
  return COUNTRY_ALIASES[key] ?? countryByName(key) ?? "";
}
