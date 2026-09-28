// The fixed "get found by AI" checklist (MVP_SPEC 7.3). The user ticks items by hand; automatic
// checks come later. A ticked item is saved as a done opportunity keyed by CHECKLIST_PREFIX + key,
// so no new table is needed (D-43).

export const CHECKLIST_PREFIX = "checklist:";

export const CHECKLIST_KEYS = ["google_profile", "listings", "reviews", "same_details", "website", "directories"] as const;
export type ChecklistKey = (typeof CHECKLIST_KEYS)[number];

export const CHECKLIST_TITLES: Record<ChecklistKey, string> = {
  google_profile: "Create or claim your Google Business Profile",
  listings: "Add Yelp, Bing Places and Apple Business Connect listings",
  reviews: "Get your first 10 reviews",
  same_details: "Keep your name, address and phone the same everywhere",
  website: "Build a simple one-page website",
  directories: "List in local and industry directories",
};

export type ChecklistBusiness = {
  name: string;
  city: string | null;
  region: string | null;
  industry: string | null;
  services: string[];
  phone: string | null;
  domain: string | null;
  hasWebsite: boolean | null;
  placesId: string | null;
};

export type ChecklistItem = {
  key: ChecklistKey;
  title: string;
  detail: string;
  /** Text the user copies: a review request message or a "Copy for Claude" prompt. */
  copy: { kind: "message" | "claude"; text: string } | null;
  done: boolean;
};

const GAP = "[fill in]";

function place(b: ChecklistBusiness): string | null {
  const city = b.city?.trim();
  if (!city) return null;
  return b.region?.trim() ? `${city}, ${b.region.trim()}` : city;
}

function kindOf(b: ChecklistBusiness): string | null {
  const industry = b.industry?.trim().replace(/[_-]+/g, " ");
  return industry ? industry.toLowerCase() : null;
}

export function reviewMessage(b: ChecklistBusiness): string {
  const where = place(b);
  return [
    `Hi [customer name], thank you for choosing ${b.name}.`,
    `If you were happy with us, would you leave a short review on Google? It helps other people${where ? ` in ${where}` : ""} find us.`,
    "Here is the link: [your Google review link]",
    "Thank you,",
    "[your name]",
  ].join("\n");
}

export function websitePrompt(b: ChecklistBusiness): string {
  const where = place(b);
  const kind = kindOf(b);
  const about = [kind ? `a ${kind}` : null, where ? `in ${where}` : null].filter(Boolean).join(" ");
  const services = b.services.map((s) => s.trim()).filter(Boolean);
  return [
    `Write a simple one-page website for ${b.name}${about ? `, ${about}` : ""}.`,
    "",
    "Include:",
    "1. A heading and a short paragraph that says what we do and where.",
    `2. Our services: ${services.length > 0 ? services.join(", ") : GAP}.`,
    `3. Our address, phone number${b.phone?.trim() ? ` (${b.phone.trim()})` : ""} and opening hours.`,
    "4. The areas we serve.",
    "5. A short FAQ that answers the questions customers ask most before they call.",
    "",
    `Write it as one HTML file with plain, friendly wording. Leave a clear gap marked ${GAP} for every fact I have not given you, and do not invent any details.`,
  ].join("\n");
}

/** Show the checklist to a business with no website, or one missing a basic that AI relies on. */
export function missingBasics(b: ChecklistBusiness): string[] {
  const missing: string[] = [];
  if (b.hasWebsite === false || !b.domain?.trim()) missing.push("a website");
  if (!b.placesId) missing.push("a Google Business Profile");
  if (!b.phone?.trim()) missing.push("a phone number");
  if (!b.city?.trim()) missing.push("a city");
  return missing;
}

export function checklist(b: ChecklistBusiness, done: ReadonlySet<string>): ChecklistItem[] {
  const items: Omit<ChecklistItem, "done">[] = [
    {
      key: "google_profile",
      title: CHECKLIST_TITLES.google_profile,
      detail: "AI assistants use Google for hours, reviews and location. Search for your business on Google Maps, then claim it or add it at business.google.com.",
      copy: null,
    },
    {
      key: "listings",
      title: CHECKLIST_TITLES.listings,
      detail: "Each assistant reads different sites. Being on all three means more of them can find you.",
      copy: null,
    },
    {
      key: "reviews",
      title: CHECKLIST_TITLES.reviews,
      detail: "Send this message to happy customers with the link to your Google review page.",
      copy: { kind: "message", text: reviewMessage(b) },
    },
    {
      key: "same_details",
      title: CHECKLIST_TITLES.same_details,
      detail: "Use the exact same spelling on Google, your listings and your website, so AI knows they are all you.",
      copy: null,
    },
    {
      key: "website",
      title: CHECKLIST_TITLES.website,
      detail: "One page with your services, address, phone and hours gives AI something of yours to quote.",
      copy: { kind: "claude", text: websitePrompt(b) },
    },
    {
      key: "directories",
      title: CHECKLIST_TITLES.directories,
      detail: "Add your business to your chamber of commerce and the directories people in your trade use.",
      copy: null,
    },
  ];
  return items.map((item) => ({ ...item, done: done.has(item.key) }));
}

export function checklistKeyOf(affectedUrl: string | null): ChecklistKey | null {
  if (!affectedUrl?.startsWith(CHECKLIST_PREFIX)) return null;
  const key = affectedUrl.slice(CHECKLIST_PREFIX.length);
  return (CHECKLIST_KEYS as readonly string[]).includes(key) ? (key as ChecklistKey) : null;
}
