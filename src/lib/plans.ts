/**
 * Centralized plan configuration — single source of truth.
 *
 * Plan IDs must match the `plan` column values in the `subscriptions` table:
 *   none | ai_visibility | growth_agent | autonomous_growth
 *
 * Add the corresponding Stripe Price IDs to your environment:
 *   STRIPE_PRICE_AI_VISIBILITY
 *   STRIPE_PRICE_GROWTH_AGENT
 *
 * autonomous_growth is sold manually ("Talk to us") and has no self-serve Stripe price.
 */

export type PlanId = "none" | "ai_visibility" | "growth_agent" | "autonomous_growth";

export interface PlanConfig {
  id: PlanId;
  name: string;
  /** Human-readable price string for UI display */
  priceLabel: string;
  /** Price in cents (USD) for reference; 0 for free */
  priceMonthly: number;
  /** Stripe Price ID for self-serve checkout; null = manual / talk-to-us */
  stripePriceId: string | null;
  /** Max businesses this plan supports */
  maxBusinesses: number;
  /** Max tracked AI prompts per business */
  maxPromptsPerBusiness: number;
  /** Manual scan triggers allowed per month */
  scansPerMonth: number;
  /** Scheduled monitoring cadence in days */
  scanCadenceDays: number;
  /** Whether this plan includes SEO intelligence (DataForSEO) */
  seoIntelligence: boolean;
  /** Whether the Direct Agent is available */
  directAgent: boolean;
  /** Whether Copy for Claude prompts are generated */
  claudePrompts: boolean;
  /** Feature bullet list for pricing UI */
  features: string[];
  /** Short tagline */
  tagline: string;
  /** UI highlight (most popular) */
  popular?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  none: {
    id: "none",
    name: "Free Trial",
    priceLabel: "Free",
    priceMonthly: 0,
    stripePriceId: null,
    maxBusinesses: 1,
    maxPromptsPerBusiness: 5,
    scansPerMonth: 1,
    scanCadenceDays: 30,
    seoIntelligence: false,
    directAgent: true,
    claudePrompts: true,
    tagline: "Try Customers.Direct with one business.",
    features: [
      "1 business",
      "5 AI prompts monitored",
      "1 scan to get started",
      "AI visibility dashboard",
      "Direct Agent (limited)",
    ],
  },
  ai_visibility: {
    id: "ai_visibility",
    name: "AI Visibility",
    priceLabel: "$497/mo",
    priceMonthly: 49700,
    stripePriceId: process.env.STRIPE_PRICE_AI_VISIBILITY ?? null,
    maxBusinesses: 1,
    maxPromptsPerBusiness: 50,
    scansPerMonth: 4,
    scanCadenceDays: 7,
    seoIntelligence: false,
    directAgent: true,
    claudePrompts: true,
    tagline: "See exactly where you stand.",
    features: [
      "1 business tracked",
      "50 buyer-intent prompts monitored",
      "Weekly AI visibility scans",
      "Direct Score + competitor comparison",
      "Citation & source intelligence",
      "Opportunity recommendations",
      "Direct Agent",
      "Copy for Claude prompts",
    ],
  },
  growth_agent: {
    id: "growth_agent",
    name: "Growth Agent",
    priceLabel: "$997/mo",
    priceMonthly: 99700,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH_AGENT ?? null,
    maxBusinesses: 3,
    maxPromptsPerBusiness: 100,
    scansPerMonth: 8,
    scanCadenceDays: 7,
    seoIntelligence: true,
    directAgent: true,
    claudePrompts: true,
    tagline: "Track it weekly and go deeper.",
    popular: true,
    features: [
      "3 businesses",
      "100 AI prompts per business",
      "Weekly AI + SEO scans",
      "Full SEO intelligence & rankings",
      "Competitor keyword gaps",
      "Backlink analysis",
      "Priority opportunity engine",
      "Direct Agent (full access)",
      "Copy for Claude prompts",
    ],
  },
  autonomous_growth: {
    id: "autonomous_growth",
    name: "Autonomous Growth",
    priceLabel: "From $1,997/mo",
    priceMonthly: 199700,
    stripePriceId: null, // sold manually via /book
    maxBusinesses: 10,
    maxPromptsPerBusiness: 200,
    scansPerMonth: 30,
    scanCadenceDays: 1,
    seoIntelligence: true,
    directAgent: true,
    claudePrompts: true,
    tagline: "We implement the fixes for you.",
    features: [
      "10 businesses",
      "200 AI prompts per business",
      "Daily scans & monitoring",
      "All SEO + AI intelligence",
      "Done-for-you implementation",
      "Human-in-the-loop approvals",
      "Dedicated account manager",
    ],
  },
};

/** Returns the plan config for a given plan ID (defaults to 'none' for unknown). */
export function getPlan(planId: string | null | undefined): PlanConfig {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.none;
}

/** True if the plan allows self-serve Stripe checkout. */
export function hasSelfServeCheckout(plan: PlanConfig): boolean {
  return plan.stripePriceId !== null;
}
