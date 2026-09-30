export type InterestValue = "ai_visibility" | "agency" | "book_demo" | "other";

// AEO topics only (MVP_SPEC 12.3); the values match what /api/contact stores.
export const INTERESTS: { value: InterestValue; label: string }[] = [
  { value: "ai_visibility", label: "Checking my business in AI answers" },
  { value: "agency", label: "Using it for my agency's clients" },
  { value: "book_demo", label: "Booking a demo call" },
  { value: "other", label: "Something else" },
];

export const MESSAGE_PLACEHOLDERS: Record<InterestValue, string> = {
  ai_visibility: "Tell us about your business and the questions you want to show up for.",
  agency: "Tell us about your agency and how many client businesses you manage.",
  book_demo: "Tell us about your business and what you would like to see in the demo.",
  other: "How can we help?",
};

export type ContactSource = "contact_page" | "chat" | "agency" | "other";

export function interestFromParam(param: string | null): InterestValue {
  if (param === "ai_visibility" || param === "agency" || param === "book_demo" || param === "other") return param;
  // Older links used ?topic=sales or ?topic=enterprise.
  if (param === "sales" || param === "enterprise") return "ai_visibility";
  return "other";
}

export type Required = "name" | "email" | "message";

export function check(name: string, email: string, message: string): Partial<Record<Required, string>> {
  return {
    name: name.trim() ? undefined : "Enter your name.",
    email: !email.trim()
      ? "Enter your email address."
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? undefined
        : "Enter an email address like you@business.com.",
    message: message.trim() ? undefined : "Write a short message so we know how to help.",
  };
}
