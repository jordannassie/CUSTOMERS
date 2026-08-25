/**
 * Deterministic buyer-intent prompt generator. Template-based rather than
 * LLM-generated so every prompt is predictable, reviewable, and free to
 * produce — the user sees and can edit the full list before anything is
 * saved, per the "nothing auto-confirmed" onboarding requirement.
 */

export interface GeneratedPrompt {
  prompt: string;
  category: string;
  buyer_intent: string;
  location: string | null;
}

interface PromptEngineInput {
  industry: string;
  city: string | null;
  region: string | null;
}

function loc(city: string | null, region: string | null): string {
  if (city && region) return `${city}, ${region}`;
  return city || region || "";
}

export function generateBuyerIntentPrompts(input: PromptEngineInput): GeneratedPrompt[] {
  const { industry, city, region } = input;
  const location = loc(city, region);
  const locSuffix = location ? ` in ${location}` : " near me";
  const prompts: GeneratedPrompt[] = [];

  const push = (prompt: string, category: string, buyer_intent: string, locationTag: string | null = location || null) => {
    prompts.push({ prompt, category, buyer_intent, location: locationTag });
  };

  // Discovery — "who should I use"
  push(`What is the best ${industry}${locSuffix}?`, "discovery", "high");
  push(`Who are the top-rated ${industry} companies${locSuffix}?`, "discovery", "high");
  push(`Can you recommend a good ${industry}${locSuffix}?`, "discovery", "high");
  push(`What are the most trusted ${industry} businesses${locSuffix}?`, "discovery", "high");
  push(`I need a ${industry}${locSuffix} — who do you suggest?`, "discovery", "high");

  // Comparison
  push(`What's the difference between the top ${industry} options${locSuffix}?`, "comparison", "medium");
  push(`Compare the best ${industry} companies${locSuffix}.`, "comparison", "medium");
  push(`Which ${industry}${locSuffix} has the best reviews?`, "comparison", "medium");
  push(`Which ${industry}${locSuffix} offers the best value for the price?`, "comparison", "medium");

  // Urgency / transactional
  push(`I need a ${industry} right away${locSuffix} — who's available?`, "transactional", "high");
  push(`What ${industry}${locSuffix} offers same-day or emergency service?`, "transactional", "high");
  push(`How do I book an appointment with a ${industry}${locSuffix}?`, "transactional", "high");

  // Pricing
  push(`How much does a ${industry} typically cost${locSuffix}?`, "pricing", "medium");
  push(`What's a fair price for ${industry} services${locSuffix}?`, "pricing", "medium");

  // Trust / research
  push(`Is it worth hiring a professional ${industry}${locSuffix}, or DIY?`, "research", "low");
  push(`What should I look for when choosing a ${industry}${locSuffix}?`, "research", "medium");
  push(`What questions should I ask a ${industry} before hiring them${locSuffix}?`, "research", "medium");
  push(`Are there any red flags to watch for when hiring a ${industry}${locSuffix}?`, "research", "low");

  // Local specificity (only if we actually have a location — never invented)
  if (location) {
    push(`What are the best-reviewed ${industry} businesses in ${location}?`, "local_presence", "high", location);
    push(`Who is the most popular ${industry} in ${location}?`, "local_presence", "high", location);
    push(`What ${industry} companies operate in the ${location} area?`, "local_presence", "medium", location);
  }

  // Category-specific follow-ups
  push(`What services does a typical ${industry} offer?`, "category", "low");
  push(`How do I know if I actually need a ${industry}?`, "category", "low");
  push(`What's the process like when working with a ${industry}${locSuffix}?`, "category", "medium");
  push(`How long does it usually take to get results from a ${industry}${locSuffix}?`, "category", "low");
  push(`What makes one ${industry} better than another${locSuffix}?`, "category", "medium");

  return prompts.slice(0, 25);
}
