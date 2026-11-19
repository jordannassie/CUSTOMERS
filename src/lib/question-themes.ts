// Question themes for the report: what kind of thing each tracked question asks about, by plain keyword rules over
// its wording, so the same question always lands in the same theme. Generic words, so it works for a plumber or a
// dentist as well as a pizza place. Each question gets one theme (the first rule that matches), so theme answer
// counts add up to the total. Pure.

export const THEMES = ["speed", "price", "trust", "quality", "nearby", "other"] as const;
export type ThemeId = (typeof THEMES)[number];

// Checked in this order: "best cheap plumber" is about price, "fastest delivery near me" about speed.
const RULES: [ThemeId, RegExp][] = [
  ["speed", /\b(fast|faster|fastest|quick|quickest|quickly|speed|delivery|deliver|delivers|open now|open late|late night|24\s?\/\s?7|24 hours?|same day|emergency|urgent|asap|tonight|right now|walk[- ]in)\b/],
  ["price", /\b(cheap|cheaper|cheapest|price|prices|priced|pricing|afford\w*|budget|cost|costs|deal|deals|value|discount\w*|inexpensive|low cost|bargain|free estimates?)\b/],
  ["trust", /\b(reviews?|reviewed|rated|ratings?|reliable|trust\w*|reputable|reputation|recommended|licen[cs]ed|certified|insured|honest|safe)\b/],
  ["quality", /\b(best|quality|fresh|freshest|top|finest|authentic|tasty|delicious|good|great|premium|expert|experienced|professional|skilled)\b/],
  ["nearby", /\b(near|nearby|nearest|closest|close to|around|local|in my area|walking distance|neighbou?rhood|downtown)\b/],
];

export type ThemeWords = {
  /** "price", "quality": the theme inside a sentence ("Named in 1 of 18 quality answers"). */
  noun: string;
  /** "Known for" card title. */
  known: string;
  /** "AI sees Cheezious as a value option". */
  as: string;
  /** "What AI does not know" row. */
  gap: string;
};

export const THEME_WORDS: Record<ThemeId, ThemeWords> = {
  speed: { noun: "speed", known: "Fast service", as: "a fast option", gap: "How fast you are" },
  price: { noun: "price", known: "Fair prices and good value", as: "a value option", gap: "Your prices and value" },
  trust: { noun: "trust and reviews", known: "A trusted name", as: "a trusted option", gap: "Your reviews and reputation" },
  quality: { noun: "quality", known: "Quality", as: "a quality option", gap: "How good your work is" },
  nearby: { noun: "near me", known: "Being close by", as: "a nearby option", gap: "Where you are and who you serve" },
  other: { noun: "other", known: "General recommendations", as: "one option among many", gap: "What you offer" },
};

/** The one theme of a question, from its wording. */
export function themeOf(question: string): ThemeId {
  const text = question.toLowerCase();
  return RULES.find(([, rule]) => rule.test(text))?.[0] ?? "other";
}
