// Where the owner makes each fix: their website, their Google listing, or other places AI looks. Worked out from what
// each saved fix already says (its category, its "Copy for Claude" prompt, its words), so no fix is rewritten and
// nothing new is stored. Pure and import-free: the Opportunities groups and the "Fix on ..." links share this one rule.

export type Where = "website" | "google_listing" | "other_places";

const WEBSITE = new Set(["content", "service_page", "technical", "structured_data", "agent_readiness"]);
const GOOGLE = /google (business )?(listing|profile)|google business|google maps|google reviews?|on google/i;
const OTHER_SITES =
  /\b(yelp|tripadvisor|trustpilot|facebook|nextdoor|bbb|better business bureau|yellow ?pages|angi|thumbtack|houzz|healthgrades|zocdoc|avvo|directory|directories|review sites?)\b/i;

export function whereOf(fix: { category: string | null; claudePrompt: string | null; text: string }): Where {
  if (fix.claudePrompt || WEBSITE.has(fix.category ?? "")) return "website";
  const google = GOOGLE.test(fix.text);
  const other = OTHER_SITES.test(fix.text);
  if (fix.category === "citations" || fix.category === "entity_consistency") return google && !other ? "google_listing" : "other_places";
  if (fix.category === "reviews_reputation" || fix.category === "local_presence") return other && !google ? "other_places" : "google_listing";
  if (google) return "google_listing";
  return other ? "other_places" : "website";
}

/** The anchor of a fix group on the Opportunities page: /opportunities#fix-website. */
export const fixAnchor = (where: Where) => `fix-${where}`;

/** One fix on the Opportunities page, opened and scrolled to: /opportunities?fix=<id>. */
export const fixHref = (id: string) => `/actions?fix=${encodeURIComponent(id)}`;

/** The id of a fix card on the Opportunities page. */
export const fixCardId = (id: string) => `fix-card-${id}`;
