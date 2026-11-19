// Cuisines, products and services only some businesses of a kind offer. A library template that names one must
// say so in its tags, and onboarding only gives it to a business that lists it: a fried chicken restaurant got
// "best sushi", "best steak" and "wine list" questions it could never win. Pure, so the validator, the tag-fixing
// script and question picking share one list.

const TERMS = [
  // Restaurants: cuisines and dishes.
  "sushi", "steak", "steakhouse", "seafood", "oyster", "italian", "mexican", "chinese", "japanese", "thai", "indian",
  "korean", "vietnamese", "greek", "mediterranean", "french", "lebanese", "turkish", "pakistani", "middle eastern",
  "pizza", "pasta", "burger", "bbq", "barbecue", "ramen", "taco", "dim sum", "pho", "curry", "biryani", "karahi",
  "shawarma", "kebab", "noodle", "dumpling", "wing", "fried chicken", "chicken", "salad", "sandwich", "dessert",
  "ice cream", "donut", "bagel", "bakery", "buffet", "brunch", "breakfast",
  // Broad cuisines a written question can name too ("I'm craving Asian cuisine...", 2026-10-13 review).
  "asian", "continental", "desi", "arabic", "persian", "afghan", "spanish", "caribbean", "ethiopian", "filipino", "cajun",
  // Restaurants: diets and drinks.
  "vegan", "vegetarian", "gluten-free", "gluten free", "halal", "kosher", "wine", "beer", "cocktail", "brewery",
  // Restaurants: services and settings.
  "delivery", "takeout", "catering", "private dining", "fine dining", "rooftop", "live music", "outdoor seating",
  // Coffee shops.
  "espresso", "latte", "cappuccino", "cold brew", "pour-over", "pour over", "matcha", "tea", "chai", "pastry",
  "croissant", "oat milk", "decaf", "roastery", "roasted", "bean", "smoothie", "drive-thru", "drive thru", "wifi",
  "laptop", "study", "work from",
] as const;

const normalise = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
// Singular and plural count as one: "lattes" names "latte", "pastries" names "pastry".
const singular = (w: string) => w.replace(/ies$/, "y").replace(/(?<=[^s])s$/, "");
const plain = (s: string) => normalise(s).split(" ").map(singular).join(" ");

/** The specific terms a text names, "Which spot in {city} has the best sushi and wine?" gives ["sushi", "wine"]. */
export function specificTermsIn(text: string): string[] {
  const hay = plain(text);
  return [...new Set(TERMS.filter((t) => hay.includes(plain(t))).map((t) => plain(t).trim()))];
}

/** True when the business lists the term among its services or in its description. */
export function offersTerm(term: string, offered: string): boolean {
  return plain(offered).includes(plain(term));
}

/** Terms the template names that its tags do not: each one is a tag to add (B-32 review rule). */
export function missingTermTags(template: string, tags: readonly string[]): string[] {
  const tagged = plain(tags.join(" | "));
  return specificTermsIn(template).filter((t) => !tagged.includes(` ${t} `) && !tagged.includes(plain(t)));
}
