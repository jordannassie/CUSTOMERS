// Branches of a chain (MVP_SPEC 5.5). A tracked "Bennu Coffee on Congress" is one location of Bennu Coffee. AI answers
// usually write only "Bennu Coffee", and those answers count for it (BUG-097), so its score is mostly the chain's.
// These helpers say when that is so, so the screens can name the chain instead of the branch. Pure, no I/O.
import {
  GENERIC_WORDS,
  LEGAL_SUFFIXES,
  SERVICE_WORDS,
  TITLE_BREAK,
  coreName,
  domainBrand,
  findName,
  findPhrase,
  isGenericName,
  normaliseText,
} from "./mention-text";

export type Branch = {
  /** The chain, as written in the name: "Bennu Coffee". */
  brand: string;
  /** Where this branch is: "Congress", "East Austin". */
  place: string;
};

// "Bennu Coffee on Congress", "Kerbey Lane Cafe at The Domain", "Thai Kitchen in Hyde Park".
const CONNECTOR = /^(.+?)\s+(?:on|at|in)\s+(.+)$/i;
const SMALL_WORDS = new Set(["the", "of", "on", "at", "in"]);
const MAX_PLACE_WORDS = 4;
// How far around the chain's name to look for the branch's place ("Bennu Coffee is at 515 S Congress Ave").
const BEFORE = 60;
const AFTER = 200;

/**
 * The chain and the place when the name is one branch of it: "Bennu Coffee on Congress", "Desnudo Coffee: East
 * Austin", "Bennu Coffee - Downtown", "Bennu Coffee (South Lamar)", "Epoch Coffee North Loop". Null when the rest of
 * the name is part of the name ("Powell's City of Books"), says what the business does ("Roto-Rooter Plumbing & Water
 * Cleanup"), or is only the city the questions are about ("Reliant Plumbing - Austin").
 */
export function branchOf(name: string, city?: string | null, website?: string | null): Branch | null {
  const trimmed = name.trim();
  const spelled = website ? domainBranch(trimmed, city, website) : null;
  if (spelled) return spelled;
  const at = trimmed.search(TITLE_BREAK);
  const split = at > 0 ? place(trimmed.slice(0, at), trimmed.slice(at), city, 1) : null;
  if (split) return split;
  const connector = trimmed.match(CONNECTOR);
  const joined = connector ? place(connector[1], connector[2], city, 2) : null;
  if (joined) return joined;
  // The place after the first word that says what the business does.
  const words = trimmed.split(/\s+/);
  const cut = words.findIndex((w, i) => i > 0 && SERVICE_WORDS.has(normaliseText(w)));
  if (cut <= 0 || cut === words.length - 1) return null;
  return place(words.slice(0, cut + 1).join(" "), words.slice(cut + 1).join(" "), city, 2);
}

// Words a Google title adds for one location; what is left after them is the place.
const LOCATION_WORDS = new Set(["branch", "outlet", "store", "flagship", "showroom", "location", "kiosk"]);

/**
 * "Cheezious Golra Mor Branch" on cheezious.com: the website spells the brand, and what follows it, without words
 * like Branch or Outlet, is the place (step 7). "Nike Flagship Store Islamabad" leaves only the city, so it is not one.
 */
function domainBranch(name: string, city: string | null | undefined, website: string): Branch | null {
  const brand = domainBrand(name, website);
  if (!brand || !name.toLowerCase().startsWith(brand.toLowerCase())) return null;
  const rest = name
    .slice(brand.length)
    .split(/\s+/)
    .filter((w) => w && !LOCATION_WORDS.has(normaliseText(w)))
    .join(" ");
  return rest ? place(brand, rest, city, 1) : null;
}

function place(brandText: string, rest: string, city: string | null | undefined, minBrandWords: number): Branch | null {
  const brand = brandText.trim().replace(/[\s,:;-]+$/, "");
  const core = coreName(brand);
  if (!core || isGenericName(core) || core.split(" ").length < minBrandWords) return null;

  const where = rest
    .replace(/^[\s\-\u2013\u2014|,:;(/]+/, "")
    .replace(/[\s).,;]+$/, "")
    .replace(/^(?:on|at|in|of)\s+/i, "");
  const words = normaliseText(where).split(" ").filter(Boolean);
  if (words.length === 0 || words.length > MAX_PLACE_WORDS) return null;
  // "Air Conditioning, & Electrical" and "Best Pizza" describe the business; "Co" is a legal suffix.
  if (words.some((w) => SERVICE_WORDS.has(w) || (GENERIC_WORDS.has(w) && !SMALL_WORDS.has(w)))) return null;
  if (words.every((w) => LEGAL_SUFFIXES.includes(w))) return null;
  // A place is written as a name: "South Lamar", "6th Street", not "open late".
  if (!where.split(/\s+/).every((w) => SMALL_WORDS.has(w.toLowerCase()) || /^[\p{Lu}\d]/u.test(w))) return null;
  // Only the city (and maybe a state code) is not a branch: answers to questions about that city name it anyway.
  const cityWords = city ? new Set(normaliseText(city).split(" ")) : new Set<string>();
  if (words.every((w) => cityWords.has(w) || SMALL_WORDS.has(w) || w.length <= 2)) return null;
  return { brand, place: where };
}

/** True when the answer names the branch itself: its full name, or its place near the chain's name. */
export function namesBranch(answer: string, name: string, branch: Branch): boolean {
  if (findName(answer, coreName(name)).length > 0) return true;
  const where = normaliseText(branch.place);
  return findName(answer, coreName(branch.brand)).some(
    (at) => findPhrase(answer.slice(Math.max(0, at - BEFORE), at + AFTER), where).length > 0,
  );
}

/**
 * The chain's name when fewer than half of the answers that counted for this branch named the branch itself, so
 * the score belongs to the chain. Null for a name that is not a branch, or when most answers named the branch.
 */
export function chainName(name: string, city: string | null | undefined, answers: string[]): string | null {
  const branch = branchOf(name, city);
  if (!branch || answers.length === 0) return null;
  const named = answers.filter((answer) => namesBranch(answer, name, branch)).length;
  return named * 2 < answers.length ? branch.brand : null;
}

export type OwnChain = { brand: string; named: number; answers: number };

/**
 * For a business that is itself one branch: how many of the counted answers named its chain at all ("Bennu Coffee
 * (all locations): named in 9 of 36 answers"), shown apart from its score, which counts only the branch (step 7).
 */
export function ownChain(brand: string, answers: string[]): OwnChain {
  const core = coreName(brand);
  return { brand, named: answers.filter((a) => findName(a, core).length > 0).length, answers: answers.length };
}
