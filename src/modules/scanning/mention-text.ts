// Text helpers for mention detection (MVP_SPEC 5.5). Pure functions, no I/O.

const LEGAL_SUFFIXES = ["llc", "l l c", "pllc", "inc", "incorporated", "co", "corp", "corporation", "company", "ltd", "limited", "lp", "llp"];

// Words that are too common on their own to prove a name match (MVP_SPEC 5.5: "Best", "Prime").
const GENERIC_WORDS = new Set([
  "a", "the", "and", "of", "best", "top", "prime", "ace", "pro", "pros", "quality", "premier", "premium", "elite",
  "first", "choice", "select", "express", "quick", "fast", "rapid", "reliable", "affordable", "discount", "budget",
  "local", "city", "metro", "county", "family", "friendly", "professional", "superior", "perfect", "precision",
  "golden", "royal", "star", "all", "american", "united", "national", "general", "advanced", "modern", "total",
  "complete", "one", "a1", "1st", "plumbing", "plumber", "plumbers", "roofing", "roofers", "electric", "electrical",
  "electricians", "hvac", "heating", "cooling", "air", "dental", "dentistry", "dentist", "law", "legal", "auto",
  "repair", "repairs", "cleaning", "cleaners", "services", "service", "solutions", "group", "care", "clinic",
  "home", "homes", "construction", "contractors", "landscaping", "lawn", "pest", "control", "movers", "moving",
  "salon", "spa", "fitness", "gym", "insurance", "realty", "restaurant", "pizza", "bakery", "cafe", "coffee",
]);

/** Lowercase, strip accents and apostrophes, turn "&" into "and", and collapse punctuation to single spaces. */
export function normaliseText(text: string): string {
  return normaliseWithOffsets(text).norm;
}

/** "Ace Plumbing, LLC" -> "ace plumbing". Keeps the name if stripping would empty it. */
export function coreName(name: string): string {
  let core = normaliseText(name);
  for (let changed = true; changed; ) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (core.endsWith(` ${suffix}`)) {
        core = core.slice(0, -suffix.length - 1).trim();
        changed = true;
      }
    }
  }
  return core || normaliseText(name);
}

// Google titles add services or a branch after the brand. AI answers usually write only the brand (BUG-097).
const TITLE_BREAK = /\s[-–—|]\s|[,:(]|\s\/\s/;

/**
 * The brand inside a long Google title, as written: "Radiant Plumbing, Air Conditioning, & Electrical" and
 * "Reliant Plumbing - Austin" give "Radiant Plumbing" and "Reliant Plumbing"; "Mr. Rooter Plumbing of Austin"
 * gives "Mr. Rooter Plumbing" when the city is Austin. Null when the title has no shorter brand, or the shorter
 * part is too generic to stand alone ("Plumbing - Austin").
 */
export function brandName(name: string, city?: string | null): string | null {
  let short = (name.split(TITLE_BREAK)[0] ?? "").trim();
  const place = city?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (place) short = short.replace(new RegExp(`\\s+(?:(?:of|in)\\s+)?${place}$`, "i"), "").trim();
  const core = coreName(short);
  if (!core || core === coreName(name) || isGenericName(core)) return null;
  return short;
}

/**
 * The leading words of the name that spell the website's name: "Cheezious Golra Mor Branch" on cheezious.com is
 * "Cheezious", "Beyond Wow Plumbing & Drains" on beyondwow.com is "Beyond Wow". Null when they do not.
 */
export function domainBrand(name: string, website: string | null | undefined): string | null {
  const domain = domainOf(website);
  if (!domain) return null;
  const label = domain.split(".")[0].replace(/[^a-z0-9]/g, "");
  const words = name.trim().split(/\s+/);
  let spelled = "";
  for (let i = 0; i < words.length - 1; i++) {
    spelled += normaliseText(words[i]).replace(/ /g, "");
    if (spelled.length > label.length || !label.startsWith(spelled)) return null;
    if (spelled === label) {
      const short = words.slice(0, i + 1).join(" ");
      return isGenericName(coreName(short)) ? null : short;
    }
  }
  return null;
}

/** Shorter forms of the name that AI answers use on their own (BUG-097). */
export function brandForms(target: { name: string; city?: string | null; website?: string | null }): string[] {
  const forms = [brandName(target.name, target.city), domainBrand(target.name, target.website)];
  return [...new Set(forms.filter((f): f is string => f !== null))];
}

/**
 * Very short, or made only of common words: needs a second signal. One distinctive word ("Khaadi", "Starbucks")
 * is not generic; it only has to be written as a name (BUG-076).
 */
export function isGenericName(core: string): boolean {
  const words = core.split(" ").filter(Boolean);
  if (core.replace(/ /g, "").length <= 3) return true;
  return words.every((w) => GENERIC_WORDS.has(w));
}

/** "https://www.AcePlumbing.com/about" -> "aceplumbing.com". */
export function domainOf(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  const withScheme = /^[a-z]+:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/**
 * Normalised text plus a map from each normalised character back to its offset in the original,
 * so a match can be located in the raw answer (for list position and nearby signals).
 */
export function normaliseWithOffsets(text: string): { norm: string; offsets: number[] } {
  const chars: string[] = [];
  const offsets: number[] = [];
  const emit = (ch: string, at: number) => {
    const isWord = /[a-z0-9]/.test(ch);
    if (!isWord && (chars.length === 0 || chars[chars.length - 1] === " ")) return;
    chars.push(isWord ? ch : " ");
    offsets.push(at);
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/['\u2018\u2019`]/.test(c)) continue;
    const piece = c === "&" ? " and " : c.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const ch of piece) emit(ch, i);
  }
  if (chars[chars.length - 1] === " ") {
    chars.pop();
    offsets.pop();
  }
  return { norm: chars.join(""), offsets };
}

/** Start offsets (in the original text) of whole-word matches of `phrase` (already normalised). */
export function findPhrase(text: string, phrase: string): number[] {
  if (!phrase) return [];
  const { norm, offsets } = normaliseWithOffsets(text);
  const hits: number[] = [];
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^| )${escaped}(?= |$)`, "g");
  for (let m = re.exec(norm); m; m = re.exec(norm)) {
    hits.push(offsets[m.index + m[1].length]);
    re.lastIndex = m.index + 1;
  }
  return hits;
}

/** Start offsets of a domain such as "ace.com", not inside a longer host like "space.com". */
export function findDomain(text: string, domain: string): number[] {
  const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9.-])(?:www\\.)?${escaped}(?![a-z0-9-]|\\.[a-z0-9])`, "gi");
  const hits: number[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) hits.push(m.index + m[1].length);
  return hits;
}

/** Digits-only comparison so "(512) 555-0100" matches "512.555.0100" and "+1 512 555 0100". */
export function containsPhone(text: string, phone: string | null | undefined): boolean {
  const want = (phone ?? "").replace(/\D/g, "").slice(-10);
  if (want.length < 7) return false;
  return text.replace(/\D/g, "").includes(want);
}
