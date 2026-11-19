// The user's own words for an "Other" industry ("Florist", "IT consultant"). Questions are written from this label
// alone, so a vague one ("Consultant", "Store", "Services") gave questions that fit no real customer (2026-10-16).
// Pure: the details form, its zod schema, question writing and admin all read it from here.
import { isIndustry } from "./industries";

/** Shown under the field when the label is too vague to write questions from. */
export const OTHER_LABEL_HINT = "What kind of business is it? For example: marketing agency, IT consultant.";

// Words that say a business exists but not what it does. A label made only of these (and filler) is vague:
// "Consultant", "Local business", "Professional services", "Retail store". "General" and "contractor" are not here:
// "General store" and "General contractor" are real kinds of business.
const GENERIC = new Set(
  `business businesses company companies co corp corporation inc llc ltd enterprise enterprises firm firms group
  service services servicing store stores shop shops agency agencies consultant consultants consulting consultancy
  professional professionals provider providers solution solutions office offices organisation organization
  local small online retail retailer retailers sales seller trading trader commercial industry industries
  brand brands work works job jobs freelance freelancer self employed startup misc miscellaneous various multiple
  other others stuff things product products na none unknown`.split(/\s+/),
);
const FILLER = new Set(["a", "an", "the", "and", "or", "of", "my", "our", "for", "in", "&", "type", "kind"]);

/** Lower case, "&" as "and", punctuation and extra spaces gone: "  Book-Store & Cafe. " is "book store and cafe". */
export function normaliseOtherLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when an "Other" label says too little to write questions from: empty, "other", or only generic words
 * ("Consultant", "Store", "Small business", "Professional services"). "IT consultant", "Marketing agency" and
 * "Bookstore" name what the business does, so they are fine.
 */
export function isVagueOtherLabel(label: string | null | undefined): boolean {
  const words = normaliseOtherLabel(label ?? "").split(" ").filter(Boolean);
  if (words.length === 0) return true;
  if (!words.some((w) => /\p{L}/u.test(w))) return true;
  const meaningful = words.filter((w) => !FILLER.has(w));
  if (meaningful.length === 0) return true;
  return meaningful.every((w) => GENERIC.has(w) || w.length < 2);
}

/** The industry field as saved: one of our industries, or the "Other" label. True when it needs a clearer label. */
export function needsClearerIndustry(industry: string): boolean {
  return !(isIndustry(industry) && industry !== "other") && isVagueOtherLabel(industry);
}
