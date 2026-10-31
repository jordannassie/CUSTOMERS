// The brand at the front of a Google name that is a page title (2026-10-15). Pure; the details step uses it too.

// " - ", " | ", " – ", " : " between a brand and the tagline Google keeps in some names. A hyphen inside a word
// ("Roto-Rooter") has no spaces around it and is not a split.
const TITLE_SEPARATOR = /\s+[-|–—:·]\s+|\s*\|\s*/;
// A front part that only describes ("Best Dentist", "Top Plumber") is not a brand.
const DESCRIBING = /^(?:the\s+)?(?:best|top|local|affordable|cheap|great|good|#1|number one)\b/i;

// Words that describe a trade or a promise, never a brand on their own (2026-10-16: "EMERGENCY DENTIST - Amigos
// Dental for Kids & Adults (24/7 urgent dentist)").
const TRADE = new Set(
  `dentist dentists dental dentistry orthodontist orthodontics implants clinic clinics office practice doctor doctors
  plumber plumbers plumbing hvac heating cooling air conditioning ac furnace repair repairs service services
  restaurant restaurants food pizza burgers cafe coffee shop bakery bar grill kitchen
  med medical spa spas aesthetics botox salon hair nails barber beauty skin care
  lawyer lawyers attorney attorneys law firm legal realtor realtors real estate agent agents homes
  auto car cars mechanic garage tire tires electric electrician electricians electrical contractor contractors company`.split(/\s+/),
);
const PROMISE = new Set(
  `emergency urgent same day 24 7 24/7 hour hours open now near me best top local family cosmetic general affordable cheap
  trusted certified licensed professional kids children adults pediatric walk in walk-in and & the a of for your`.split(/\s+/),
);
// Nouns business names end on ("Smile Studio", "Care Center"), so a later part with one reads as a name, not a place.
const NAME_NOUN = new Set(
  `studio studios smile smiles care center centre group associates partners co works house place lab labs bar
  boutique collective institute wellness health body`.split(/\s+/),
);
const words = (part: string) => part.toLowerCase().replace(/[^a-z0-9/&\s-]/g, " ").split(/\s+/).filter(Boolean);
const isTrade = (w: string) => TRADE.has(w);
const isGeneric = (w: string) => TRADE.has(w) || PROMISE.has(w) || /^\d+(\/\d+)?$/.test(w);

/** "EMERGENCY DENTIST", "24/7 Plumber Near Me", "Dentist in Brentwood": a trade and promises, with at most a place. */
function onlyDescribes(part: string): boolean {
  const [before] = part.split(/\s+(?:in|near|serving)\s+/i);
  const list = words(before);
  return list.length > 0 && list.every(isGeneric);
}

/**
 * The brand in a later part, without the audience or note after it: "Amigos Dental for Kids & Adults (24/7 urgent
 * dentist)" gives "Amigos Dental". Null unless it names a trade next to a word of its own, so a place such as
 * "Los Angeles" is never taken for a brand.
 */
function brandIn(part: string): string | null {
  const brand = part
    .replace(/\s*\(.*$/, "")
    .split(/\s+(?:for|in|near|serving)\s+/i)[0]
    .trim();
  const list = words(brand);
  return list.some((w) => isTrade(w) || NAME_NOUN.has(w)) && list.some((w) => !isGeneric(w)) ? brand : null;
}

/**
 * "Wilshire Smile Studio - Los Angeles Dentist, Cosmetic..." gives "Wilshire Smile Studio", and "Bedigital.pk -
 * Digitizing Businesses - F..." gives "Bedigital" (the domain written as the name). When the front only describes
 * the trade ("EMERGENCY DENTIST - Amigos Dental ..."), the brand comes from the next part. Null when there is no
 * tagline or no part is a name.
 */
export function titleBrand(name: string, website?: string | null): string | null {
  const parts = name.split(TITLE_SEPARATOR).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  let first = parts[0];
  const domain = hostOf(website);
  const asDomain = /^([a-z0-9][a-z0-9-]*)\.[a-z]{2,}(\.[a-z]{2,})?$/i.exec(first);
  if (asDomain && (!domain || domain.startsWith(`${asDomain[1].toLowerCase()}.`))) first = asDomain[1];
  if (onlyDescribes(first)) return parts.slice(1).map(brandIn).find((b) => b !== null) ?? null;
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
