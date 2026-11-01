// Questions that name a product brand, a chain or another business (2026-10-16): "What toy store in Austin, TX has
// the best deals on LEGO sets?" and "Where can I buy original Nike running shoes in Islamabad?" can only be won by a
// shop that sells that brand, so they score the business on its stock, not on being recommended. Pure.

// Common product brands and chains, lower case, matched as whole words in any case. Brands that are also everyday
// words (Target, Subway, Gap, Apple, Coach, Vans, Chipotle) are left out: written with a capital mid-sentence, the
// capital-letter check below catches them, and in lower case they are the everyday word.
const BRANDS = [
  // toys and games
  "lego", "legos", "duplo", "playmobil", "barbie", "hot wheels", "nerf", "hasbro", "mattel", "fisher-price", "fisher price",
  "melissa & doug", "melissa and doug", "pokemon", "pokémon", "funko", "squishmallows", "crayola", "play-doh", "playdoh",
  "american girl", "magna-tiles", "magna tiles", "vtech", "leapfrog", "nintendo", "playstation", "xbox", "toys r us",
  // sportswear and clothing
  "nike", "adidas", "puma", "reebok", "under armour", "lululemon", "new balance", "asics", "skechers", "north face",
  "patagonia", "hoka", "saucony", "mizuno", "yonex", "gymshark", "timberland", "birkenstock", "dr. martens", "doc martens",
  "crocs", "ugg", "uggs", "levi's", "levis", "uniqlo", "zara", "h&m", "khaadi", "gul ahmed", "air jordan",
  // coffee and doughnut chains
  "starbucks", "dunkin", "dunkin'", "tim hortons", "peet's", "peets", "costa coffee", "caribou coffee", "dutch bros",
  "blue bottle", "philz", "la colombe", "nespresso", "keurig", "krispy kreme", "gloria jean's",
  // fast food and restaurant chains
  "mcdonald's", "mcdonalds", "burger king", "wendy's", "wendys", "kfc", "popeyes", "chick-fil-a", "chick fil a", "taco bell",
  "domino's", "dominos", "pizza hut", "papa john's", "papa johns", "little caesars", "five guys", "in-n-out", "in n out",
  "shake shack", "whataburger", "arby's", "jack in the box", "panda express", "panera", "dairy queen", "raising cane's",
  "wingstop", "jollibee", "nando's", "hardee's", "carl's jr", "del taco", "jimmy john's", "jersey mike's", "qdoba",
  "olive garden", "applebee's", "chili's", "ihop", "denny's", "cheesecake factory", "texas roadhouse", "outback steakhouse",
  "red lobster", "buffalo wild wings", "cheezious", "krispy krunchy",
  // electronics
  "iphone", "iphones", "ipad", "macbook", "airpods", "apple watch", "samsung", "google pixel", "huawei", "xiaomi", "oneplus",
  "motorola", "microsoft", "lenovo", "asus", "dell", "bose", "jbl", "sony", "lg", "nikon", "gopro", "dyson", "roomba",
  "fitbit", "garmin", "kindle",
  // cars
  "tesla", "toyota", "honda", "ford", "chevy", "chevrolet", "bmw", "bmws", "mercedes", "mercedes-benz", "audi", "volkswagen",
  "vw", "lexus", "nissan", "hyundai", "kia", "subaru", "mazda", "jeep", "jeeps", "gmc", "cadillac", "porsche", "ferrari",
  "volvo", "land rover", "range rover", "prius", "camry", "f-150", "suzuki", "mitsubishi", "buick", "chrysler", "acura",
  "infiniti",
  // cosmetics, hair and branded treatments
  "sephora", "ulta", "maybelline", "l'oreal", "l'oréal", "loreal", "clinique", "estee lauder", "estée lauder", "fenty",
  "glossier", "olaplex", "redken", "paul mitchell", "aveda", "invisalign", "coolsculpting", "juvederm", "juvéderm",
  "restylane", "dysport", "xeomin", "kybella", "sculptra", "hydrafacial", "emsculpt", "morpheus8", "ultherapy", "thermage",
  // retail, home and service chains
  "walmart", "costco", "amazon", "ikea", "home depot", "lowe's", "trader joe's", "kroger", "walgreens", "cvs", "h-e-b",
  "barnes & noble", "barnes and noble", "gamestop", "petco", "petsmart", "jiffy lube", "midas", "pep boys", "firestone",
  "valvoline", "meineke", "aamco", "safelite", "roto-rooter", "mr. rooter", "re/max", "remax", "keller williams",
  "coldwell banker", "century 21", "sotheby's", "zillow", "redfin", "great clips", "supercuts", "sport clips", "drybar",
  "european wax center", "massage envy", "aspen dental", "smiledirectclub", "trane", "lennox", "rheem",
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BRAND_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...BRANDS].sort((a, b) => b.length - a.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "iu");

// Treatments that are fine as generic words. Botox is a trademark, but customers say it for the treatment, and every
// med spa offers it. Other brand names (Invisalign, CoolSculpting, Juvederm) stay out: use "clear aligners",
// "body contouring", "fillers".
export const GENERIC_TREATMENTS = ["botox"];

// Capitalised words that are not a business or brand: "I", days, months and holidays, nationalities, cuisines and
// languages, review sites, programs every provider takes.
const COMMON_CAPITALS = new Set(
  `i i'm i've i'd i'll
  monday mondays tuesday tuesdays wednesday wednesdays thursday thursdays friday fridays saturday saturdays sunday sundays
  january february march april may june july august september october november december
  christmas thanksgiving easter halloween valentine valentine's mother's father's new year year's eve ramadan eid diwali
  hanukkah passover
  american mexican italian chinese japanese korean thai vietnamese indian pakistani french spanish greek mediterranean
  middle eastern lebanese turkish persian ethiopian cuban caribbean jamaican brazilian peruvian argentinian colombian
  salvadoran filipino hawaiian cajun creole southern tex-mex latin latino latina hispanic asian african european german
  british english irish scottish russian polish ukrainian afghan nepali indonesian malaysian taiwanese cantonese szechuan
  sichuan punjabi bengali arab arabic moroccan egyptian israeli swedish scandinavian nordic dutch portuguese mandarin urdu
  hindi jewish muslim
  google yelp medicare medicaid wi-fi wifi saas devops`.split(/\s+/),
);
for (const t of GENERIC_TREATMENTS) COMMON_CAPITALS.add(t);

// A place in the question: "in Central LA, Los Angeles, CA", "moved to New York", "Austin, TX software company".
// Not "from" or "at": "buy from Bata", "a latte at Philz" name a business.
const PLACE_AFTER = /\b(?:in|to|near|around|across|outside|throughout|within)\s+([A-Z][\p{L}'’.-]*(?:,?\s+[A-Z][\p{L}'’.-]*)*)/gu;
const PLACE_WITH_CODE = /((?:[A-Z][\p{L}'’.-]*\s+)*[A-Z][\p{L}'’.-]*),\s*[A-Z]{2,3}\b/gu;

const keyOf = (word: string) => word.toLowerCase().replace(/’/g, "'");

/** Lower-case words of the places in the question, plus the ones the caller knows (city, state, area). */
function placeWords(question: string, place: string[]): Set<string> {
  const out = new Set(place.flatMap((p) => p.split(/[\s,]+/)).filter(Boolean).map(keyOf));
  for (const re of [PLACE_AFTER, PLACE_WITH_CODE]) {
    for (const m of question.matchAll(re)) for (const w of m[0].split(/[\s,]+/)) out.add(keyOf(w));
  }
  return out;
}

/** The capitalised words in the middle of a sentence that are not a place, an acronym or a common capital. */
function properNouns(question: string, place: string[]): string[] {
  const places = placeWords(question, place);
  const found: string[] = [];
  const tokens = question.split(/\s+/).filter(Boolean);
  tokens.forEach((raw, i) => {
    const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’]+$/gu, "").replace(/['’]s$/i, "");
    if (!word || !/^\p{Lu}|^\p{Ll}+\p{Lu}/u.test(word)) return;
    if (i === 0 || /[.?!:;"“(]$/.test(tokens[i - 1])) return;
    // HVAC, AC, IV, DUI, TX: acronyms are not brands (the list above has the ones that are).
    if (/^[\p{Lu}\p{N}&]{2,}$/u.test(word)) return;
    const key = keyOf(word);
    if (COMMON_CAPITALS.has(key) || COMMON_CAPITALS.has(key.split("-")[0]) || places.has(key)) return;
    found.push(word);
  });
  return found;
}

/**
 * True when a question names a product brand, a chain or another business: a word from the brand list in any case, or
 * a capitalised word mid-sentence that is not a place, an acronym, a day or month, a nationality or cuisine, or a
 * generic treatment (GENERIC_TREATMENTS). `place` adds the business's own city, state and area when the question
 * has them filled in. A false match only drops one question; a missed brand scores the business on its stock.
 */
export function namesBrand(question: string, place: string[] = []): boolean {
  const text = question.replace(/’/g, "'");
  const brand = BRAND_RE.exec(text);
  if (brand && !GENERIC_TREATMENTS.includes(brand[0].toLowerCase())) return true;
  return properNouns(question, place).length > 0;
}

/** The listed brands a text names ("Nike store" names "Nike"), as written in it, so they can be taken out. */
export function brandWords(text: string): string[] {
  const all = new RegExp(BRAND_RE.source, "giu");
  return [...text.replace(/’/g, "'").matchAll(all)].map((m) => m[0]).filter((b) => !GENERIC_TREATMENTS.includes(b.toLowerCase()));
}
