/**
 * Customers.Direct — CANONICAL Pricing & Billing Configuration.
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL PRICING, LIMITS, AND PLAN LOGIC.
 *
 * Every surface that needs plan data MUST import from this file:
 *   - Public pricing pages
 *   - Checkout flows
 *   - Stripe plan mapping
 *   - User billing page
 *   - Business plan selectors
 *   - Entitlement enforcement (server-side)
 *   - Prompt / competitor / scan limits
 *   - Scheduled scan cadence
 *   - Direct Agent limits
 *   - Search Intelligence access
 *   - Admin revenue calculations
 *
 * DO NOT duplicate pricing values, limits, or plan IDs anywhere else.
 *
 * Pricing version: 2026-08-v1
 * Effective date:  2026-08-01
 */

// ─────────────────────────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const PRICING_VERSION = "2026-08-v1";
export const PRICING_EFFECTIVE_DATE = "2026-08-01";

// ─────────────────────────────────────────────────────────────────────────────
// TRIAL CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const TRIAL_CONFIG = {
  /** Trial length in days. Card required at signup. */
  trialDays: 14,
  /** Max businesses allowed during trial (prevents trial farming). */
  maxBusinessesDuringTrial: 1,
  /** Additional businesses added after account converts are billed immediately. */
  additionalBusinessTrialDays: 0,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// PLAN IDs
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalPlanId = "starter" | "growth" | "pro" | "enterprise";

/** All self-service plan IDs (excludes enterprise which is contact-sales). */
export const SELF_SERVE_PLAN_IDS: CanonicalPlanId[] = ["starter", "growth", "pro"];

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalPlan {
  id: CanonicalPlanId;
  name: string;
  /** Short positioning tagline */
  positioning: string;
  /** Pricing card description */
  description: string;

  // ── Pricing ───────────────────────────────────────────────────────────────
  /** Monthly price in USD cents. 0 = contact sales. */
  priceMonthly: number;
  /** Human-readable price label, e.g. "$297" */
  priceLabel: string;
  /** Price suffix shown in UI, e.g. "/ month / business" */
  priceSuffix: string;

  // ── Stripe mapping ────────────────────────────────────────────────────────
  /** Environment variable name holding the Stripe Monthly Price ID */
  stripeMonthlyPriceEnvKey: string | null;
  /** Resolved Stripe Monthly Price ID (from process.env at runtime) */
  stripePriceMonthly: string | null;

  // ── Core limits ───────────────────────────────────────────────────────────
  /** Max tracked AI prompts per business (-1 = unlimited/custom) */
  maxTrackedPrompts: number;
  /** Max competitors tracked per business (-1 = unlimited/custom) */
  maxCompetitors: number;
  /** Number of AI models/providers included */
  aiModelCount: number;

  // ── Scan cadence ─────────────────────────────────────────────────────────
  /** Full scan cadence in days (30 = monthly, 7 = weekly) */
  scanCadenceDays: number;
  /** Scan frequency label for UI */
  scanFrequencyLabel: string;
  /** Max priority/watchlist prompts that run daily (Pro only) */
  dailyWatchPromptLimit: number;

  // ── Feature entitlements ─────────────────────────────────────────────────
  /** Search Intelligence / DataForSEO access */
  seoIntelligence: "none" | "basic" | "full" | "advanced";
  /** Direct Agent access level */
  directAgentLevel: "none" | "basic" | "full" | "full_plus" | "custom";
  /** History retention in months (-1 = unlimited) */
  historyMonths: number;
  /** Priority support */
  prioritySupport: boolean;
  /** Advanced opportunity detection */
  opportunityDetection: "basic" | "advanced" | "priority";

  // ── Direct Agent limits ───────────────────────────────────────────────────
  /** Max Direct Agent messages per day */
  agentMessagesPerDay: number;
  /** Max Claude fix prompts per month */
  claudeFixesPerMonth: number;

  // ── UI ────────────────────────────────────────────────────────────────────
  popular?: boolean;
  /** Feature bullet list for pricing card */
  features: string[];
  /** Trial CTA text */
  cta: string;
  /** Trial CTA href */
  ctaHref: string;
  secondaryCta?: { label: string; href: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL PLANS
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_PLANS: Record<CanonicalPlanId, CanonicalPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    positioning: "Monitor me",
    description: "See where your business is showing up across AI.",

    priceMonthly: 14900,
    priceLabel: "$149",
    priceSuffix: "/ month / business",

    stripeMonthlyPriceEnvKey: "STRIPE_PRICE_STARTER_MONTHLY",
    get stripePriceMonthly() {
      return process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null;
    },

    maxTrackedPrompts: 25,
    maxCompetitors: 3,
    aiModelCount: 3,

    scanCadenceDays: 30,
    scanFrequencyLabel: "Monthly",
    dailyWatchPromptLimit: 0,

    seoIntelligence: "basic",
    directAgentLevel: "basic",
    historyMonths: 3,
    prioritySupport: false,
    opportunityDetection: "basic",

    agentMessagesPerDay: 20,
    claudeFixesPerMonth: 10,

    features: [
      "25 tracked AI searches",
      "3 competitors",
      "3 core AI models",
      "Monthly full visibility monitoring",
      "AI Visibility & Direct Score",
      "Share of Voice & AI Position",
      "Citations & source tracking",
      "Basic Search Intelligence",
      "Basic Direct Agent",
      "Claude fix prompts (10/mo)",
      "3 months history",
    ],
    cta: "Start 14-day trial",
    ctaHref: "/signup",
  },

  growth: {
    id: "growth",
    name: "Growth",
    positioning: "Help me improve",
    description: "Find out why competitors are beating you — and fix it.",

    priceMonthly: 29700,
    priceLabel: "$297",
    priceSuffix: "/ month / business",

    stripeMonthlyPriceEnvKey: "STRIPE_PRICE_GROWTH_MONTHLY",
    get stripePriceMonthly() {
      return process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? null;
    },

    maxTrackedPrompts: 75,
    maxCompetitors: 5,
    aiModelCount: 3,

    scanCadenceDays: 7,
    scanFrequencyLabel: "Weekly",
    dailyWatchPromptLimit: 0,

    seoIntelligence: "full",
    directAgentLevel: "full",
    historyMonths: 12,
    prioritySupport: false,
    opportunityDetection: "advanced",

    agentMessagesPerDay: 50,
    claudeFixesPerMonth: 30,

    popular: true,
    features: [
      "Everything in Starter",
      "75 tracked AI searches",
      "5 competitors",
      "Weekly visibility monitoring",
      "Full Search Intelligence",
      "Competitor keyword gaps",
      "SEO competitor analysis",
      "Backlink opportunities",
      "Full Direct Agent",
      "Claude fixes (30/mo)",
      "Advanced opportunity detection",
      "12 months history",
    ],
    cta: "Start 14-day trial",
    ctaHref: "/signup",
  },

  pro: {
    id: "pro",
    name: "Pro",
    positioning: "Continuously optimize me",
    description: "High-frequency monitoring and priority optimization.",

    priceMonthly: 49700,
    priceLabel: "$497",
    priceSuffix: "/ month / business",

    stripeMonthlyPriceEnvKey: "STRIPE_PRICE_PRO_MONTHLY",
    get stripePriceMonthly() {
      return process.env.STRIPE_PRICE_PRO_MONTHLY ?? null;
    },

    maxTrackedPrompts: 150,
    maxCompetitors: 10,
    aiModelCount: 3,

    scanCadenceDays: 7,       // Weekly full scan
    scanFrequencyLabel: "Weekly + Daily Priority",
    dailyWatchPromptLimit: 25, // Up to 25 priority prompts run daily

    seoIntelligence: "advanced",
    directAgentLevel: "full_plus",
    historyMonths: -1, // unlimited
    prioritySupport: true,
    opportunityDetection: "priority",

    agentMessagesPerDay: 150,
    claudeFixesPerMonth: 100,

    features: [
      "Everything in Growth",
      "150 tracked AI searches",
      "10 competitors",
      "Weekly full monitoring",
      "Up to 25 priority prompts daily",
      "Advanced Search Intelligence",
      "Advanced competitor intelligence",
      "Advanced backlink analysis",
      "Higher Direct Agent usage",
      "More Claude fix prompts (100/mo)",
      "Priority opportunity detection",
      "Full historical reporting",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    ctaHref: "/signup",
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    positioning: "Scale it",
    description: "For large brands, multi-location businesses, and custom needs.",

    priceMonthly: 0,
    priceLabel: "Custom",
    priceSuffix: "",

    stripeMonthlyPriceEnvKey: null,
    stripePriceMonthly: null,

    maxTrackedPrompts: -1,
    maxCompetitors: -1,
    aiModelCount: -1,

    scanCadenceDays: 1,
    scanFrequencyLabel: "Custom",
    dailyWatchPromptLimit: -1,

    seoIntelligence: "advanced",
    directAgentLevel: "custom",
    historyMonths: -1,
    prioritySupport: true,
    opportunityDetection: "priority",

    agentMessagesPerDay: -1,
    claudeFixesPerMonth: -1,

    features: [
      "Custom tracked search volume",
      "Custom competitor limits",
      "Custom monitoring frequency",
      "Multi-location support",
      "Extended data retention",
      "Custom reporting",
      "Dedicated onboarding",
      "Priority support",
      "Custom security & procurement",
    ],
    cta: "Talk to Sales",
    ctaHref: "/contact?topic=enterprise",
    secondaryCta: { label: "Book a call", href: "/book" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDERED PLANS (for UI display)
// ─────────────────────────────────────────────────────────────────────────────

export const ORDERED_PLANS: CanonicalPlan[] = [
  CANONICAL_PLANS.starter,
  CANONICAL_PLANS.growth,
  CANONICAL_PLANS.pro,
  CANONICAL_PLANS.enterprise,
];

export const ORDERED_SELF_SERVE_PLANS: CanonicalPlan[] = [
  CANONICAL_PLANS.starter,
  CANONICAL_PLANS.growth,
  CANONICAL_PLANS.pro,
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the plan config for a given plan ID. Falls back to starter for unknown. */
export function getPlanConfig(planId: string | null | undefined): CanonicalPlan {
  if (planId && planId in CANONICAL_PLANS) {
    return CANONICAL_PLANS[planId as CanonicalPlanId];
  }
  return CANONICAL_PLANS.starter;
}

/** True if the plan is available for self-serve Stripe checkout. */
export function isSelfServePlan(plan: CanonicalPlan): boolean {
  return plan.stripePriceMonthly !== null;
}

/**
 * Maps a Stripe Price ID back to a canonical plan ID.
 * Used in webhook to determine plan from Stripe's price metadata.
 */
export function getPlanIdFromStripePrice(stripePriceId: string): CanonicalPlanId | null {
  for (const plan of ORDERED_SELF_SERVE_PLANS) {
    if (plan.stripePriceMonthly === stripePriceId) {
      return plan.id;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE COMPARISON TABLE
// ─────────────────────────────────────────────────────────────────────────────

export interface PricingFeatureRow {
  feature: string;
  starter: string | boolean;
  growth: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}

/** Generated from canonical plan values — never manually duplicated. */
export const COMPARISON_TABLE: { section: string; rows: PricingFeatureRow[] }[] = [
  {
    section: "Monitoring",
    rows: [
      {
        feature: "Tracked AI searches",
        starter: `${CANONICAL_PLANS.starter.maxTrackedPrompts}`,
        growth: `${CANONICAL_PLANS.growth.maxTrackedPrompts}`,
        pro: `${CANONICAL_PLANS.pro.maxTrackedPrompts}`,
        enterprise: "Custom",
      },
      {
        feature: "Competitors",
        starter: `${CANONICAL_PLANS.starter.maxCompetitors}`,
        growth: `${CANONICAL_PLANS.growth.maxCompetitors}`,
        pro: `${CANONICAL_PLANS.pro.maxCompetitors}`,
        enterprise: "Custom",
      },
      {
        feature: "AI models",
        starter: `${CANONICAL_PLANS.starter.aiModelCount} core`,
        growth: `${CANONICAL_PLANS.growth.aiModelCount} core`,
        pro: `${CANONICAL_PLANS.pro.aiModelCount} core`,
        enterprise: "Custom",
      },
      {
        feature: "Full scan frequency",
        starter: CANONICAL_PLANS.starter.scanFrequencyLabel,
        growth: CANONICAL_PLANS.growth.scanFrequencyLabel,
        pro: "Weekly",
        enterprise: "Custom",
      },
      {
        feature: "Daily priority prompts",
        starter: false,
        growth: false,
        pro: `${CANONICAL_PLANS.pro.dailyWatchPromptLimit} prompts/day`,
        enterprise: "Custom",
      },
      {
        feature: "History",
        starter: `${CANONICAL_PLANS.starter.historyMonths} months`,
        growth: `${CANONICAL_PLANS.growth.historyMonths} months`,
        pro: "Full history",
        enterprise: "Custom",
      },
    ],
  },
  {
    section: "AI Visibility",
    rows: [
      { feature: "AI Visibility Tracking", starter: true, growth: true, pro: true, enterprise: true },
      { feature: "Direct Score", starter: true, growth: true, pro: true, enterprise: true },
      { feature: "Share of Voice", starter: true, growth: true, pro: true, enterprise: true },
      { feature: "Average AI Position", starter: true, growth: true, pro: true, enterprise: true },
      { feature: "Citation Tracking", starter: true, growth: true, pro: true, enterprise: true },
    ],
  },
  {
    section: "Search Intelligence",
    rows: [
      { feature: "Keyword Rankings", starter: "Basic", growth: "Full", pro: "Advanced", enterprise: "Custom" },
      { feature: "Competitor Keyword Gaps", starter: false, growth: true, pro: true, enterprise: true },
      { feature: "Backlink Opportunities", starter: false, growth: true, pro: true, enterprise: true },
      { feature: "SEO Competitor Analysis", starter: false, growth: true, pro: "Advanced", enterprise: "Custom" },
    ],
  },
  {
    section: "AI Agent",
    rows: [
      { feature: "Direct Agent", starter: "Basic", growth: "Full", pro: "Full + higher usage", enterprise: "Custom" },
      { feature: "Claude fix prompts / month", starter: `${CANONICAL_PLANS.starter.claudeFixesPerMonth}`, growth: `${CANONICAL_PLANS.growth.claudeFixesPerMonth}`, pro: `${CANONICAL_PLANS.pro.claudeFixesPerMonth}`, enterprise: "Custom" },
      { feature: "Opportunity Detection", starter: "Basic", growth: "Advanced", pro: "Priority", enterprise: "Priority" },
    ],
  },
  {
    section: "Support",
    rows: [
      { feature: "Priority Support", starter: false, growth: false, pro: true, enterprise: true },
      { feature: "Dedicated Onboarding", starter: false, growth: false, pro: false, enterprise: true },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL COST / MARGIN CONFIG  (server-side only — never expose to client)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approximate provider cost per 1,000 tokens (USD).
 * Used to estimate variable costs in the usage ledger.
 * These are internal estimates — never expose to customers.
 */
export const PROVIDER_COST_CONFIG = {
  chatgpt: {
    inputPer1kTokens: 0.0025,   // GPT-4o-mini input
    outputPer1kTokens: 0.01,    // GPT-4o-mini output
  },
  claude: {
    inputPer1kTokens: 0.003,    // Claude Haiku
    outputPer1kTokens: 0.015,
  },
  perplexity: {
    inputPer1kTokens: 0.002,
    outputPer1kTokens: 0.008,
  },
  gemini: {
    inputPer1kTokens: 0.001,
    outputPer1kTokens: 0.004,
  },
  deepseek: {
    inputPer1kTokens: 0.00014,
    outputPer1kTokens: 0.00028,
  },
  mistral: {
    inputPer1kTokens: 0.002,
    outputPer1kTokens: 0.006,
  },
  default: {
    inputPer1kTokens: 0.005,
    outputPer1kTokens: 0.015,
  },
  /** DataForSEO: estimated per API call */
  dataforseo: {
    perRequest: 0.002,
  },
  /** Google Places: $17 per 1,000 requests */
  google_places: {
    perRequest: 0.017,
  },
} as const;

/** Margin alert thresholds (gross profit %). Admin-visible only. */
export const MARGIN_THRESHOLDS = {
  warning: 0.80,   // < 80% gross margin → warning
  severe: 0.70,    // < 70% gross margin → severe warning
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY COMPAT — deprecated aliases, remove once all imports updated
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use CANONICAL_PLANS */
export const PRICING_PLANS = CANONICAL_PLANS;

/** @deprecated Use CanonicalPlanId */
export type PricingPlanId = CanonicalPlanId;

/** @deprecated Use CanonicalPlan */
export type PricingPlan = CanonicalPlan;

/** @deprecated Use ORDERED_PLANS */
export const ORDERED_PRICING_PLANS = ORDERED_PLANS;

/** @deprecated Use PRODUCT_ACCESS from @/config/product-access */
export const PRODUCT_ACCESS_CONFIG = {
  billingEnabled: process.env.BILLING_ENABLED === "true",
  betaFreeAccess: process.env.BETA_FREE_ACCESS !== "false",
};
