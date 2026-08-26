/**
 * Customers.Direct — Centralized pricing configuration.
 *
 * This is the single source of truth for all pricing UI.
 * Stripe will read plan IDs from this file when billing is enabled.
 *
 * DO NOT scatter price values, feature lists, or limits in components.
 * Import from here everywhere.
 */

export type PricingPlanId = "starter" | "growth" | "pro" | "enterprise";

export interface PricingFeatureRow {
  feature: string;
  starter: string | boolean;
  growth: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  /** One-line positioning tagline shown under the plan name */
  positioning: string;
  /** Short description for the pricing card */
  description: string;
  /** Price in USD cents/month. 0 = contact sales. */
  priceMonthly: number;
  /** Human-readable price string */
  priceLabel: string;
  /** Label shown next to the price */
  priceSuffix: string;
  /** Trial details */
  trialDays: number;
  trialLabel: string;
  /** CTA button text */
  cta: string;
  /** CTA href */
  ctaHref: string;
  /** Secondary CTA (e.g. Talk to Sales) */
  secondaryCta?: { label: string; href: string };
  /** Most popular plan — highlighted */
  popular?: boolean;
  /** Feature bullets on the plan card */
  features: string[];
  /** Max businesses per subscription (each business = one plan) */
  maxBusinesses: number;
  /** Max tracked AI searches (prompts) per business */
  maxTrackedSearches: number;
  /** Max competitors per business */
  maxCompetitors: number;
  /** Scan frequency label */
  scanFrequency: string;
  /** History retention label */
  historyLabel: string;
  /** Direct Agent level */
  directAgentLevel: "basic" | "full" | "full_plus" | "custom";
  /** SEO features included */
  seoFeatures: "basic" | "full" | "advanced" | "custom";
  /** Priority support */
  prioritySupport: boolean;
}

export const PRICING_PLANS: Record<PricingPlanId, PricingPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    positioning: "Monitor me",
    description: "See where your business is showing up.",
    priceMonthly: 14900,
    priceLabel: "$149",
    priceSuffix: "/ month",
    trialDays: 0,
    trialLabel: "Free during beta",
    cta: "Join Free Beta",
    ctaHref: "/signup",
    features: [
      "1 business workspace",
      "25 tracked AI searches",
      "3 competitors",
      "AI Visibility Tracking",
      "Direct Score",
      "Share of Voice",
      "Average AI Position",
      "ChatGPT, Claude, Perplexity & more",
      "Citation & source tracking",
      "Google / SEO intelligence",
      "Keyword rankings & search volume",
      "Website optimization opportunities",
      "Basic Direct Agent access",
      "Claude fix prompts",
      "Monthly visibility scans",
      "3 months of history",
    ],
    maxBusinesses: 1,
    maxTrackedSearches: 25,
    maxCompetitors: 3,
    scanFrequency: "Monthly",
    historyLabel: "3 months",
    directAgentLevel: "basic",
    seoFeatures: "basic",
    prioritySupport: false,
  },

  growth: {
    id: "growth",
    name: "Growth",
    positioning: "Help me improve",
    description: "Find out why competitors are beating you — and what to fix.",
    priceMonthly: 29700,
    priceLabel: "$297",
    priceSuffix: "/ month",
    trialDays: 0,
    trialLabel: "Free during beta",
    cta: "Join Free Beta",
    ctaHref: "/signup",
    popular: true,
    features: [
      "Everything in Starter",
      "75 tracked AI searches",
      "5 competitors",
      "Weekly visibility monitoring",
      "Full keyword intelligence",
      "Competitor keyword gaps",
      "SEO competitor analysis",
      "Backlink opportunities",
      "More advanced website recommendations",
      "Full Direct Agent",
      "Copy / Fix with Claude",
      "Advanced opportunity detection",
      "12 months of history",
      "More frequent SEO analysis",
    ],
    maxBusinesses: 1,
    maxTrackedSearches: 75,
    maxCompetitors: 5,
    scanFrequency: "Weekly",
    historyLabel: "12 months",
    directAgentLevel: "full",
    seoFeatures: "full",
    prioritySupport: false,
  },

  pro: {
    id: "pro",
    name: "Pro",
    positioning: "Continuously optimize me",
    description: "Continuously monitor and improve your visibility.",
    priceMonthly: 49700,
    priceLabel: "$497",
    priceSuffix: "/ month",
    trialDays: 0,
    trialLabel: "Free during beta",
    cta: "Join Free Beta",
    ctaHref: "/signup",
    features: [
      "Everything in Growth",
      "200 tracked AI searches",
      "10 competitors",
      "Daily AI visibility monitoring",
      "Higher SEO scan frequency",
      "Advanced competitor intelligence",
      "Advanced backlink analysis",
      "More Direct Agent usage",
      "More Claude implementation prompts",
      "Priority opportunity detection",
      "Full historical reporting",
      "Priority support",
      "Highest self-service usage limits",
    ],
    maxBusinesses: 1,
    maxTrackedSearches: 200,
    maxCompetitors: 10,
    scanFrequency: "Daily",
    historyLabel: "Full history",
    directAgentLevel: "full_plus",
    seoFeatures: "advanced",
    prioritySupport: true,
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    positioning: "Scale it",
    description: "Built for large brands, multi-location companies, and custom requirements.",
    priceMonthly: 0,
    priceLabel: "Custom",
    priceSuffix: "",
    trialDays: 0,
    trialLabel: "Contact sales",
    cta: "Talk to Sales",
    ctaHref: "/contact?topic=enterprise",
    secondaryCta: { label: "Book a call", href: "/book" },
    features: [
      "Custom tracked search volume",
      "Custom competitor limits",
      "Multi-location support",
      "Custom monitoring frequency",
      "Team access",
      "Extended data retention",
      "Custom reporting",
      "Higher API / MCP access",
      "Dedicated onboarding",
      "Priority support",
      "Custom security & procurement",
      "Custom usage limits",
    ],
    maxBusinesses: -1, // unlimited / custom
    maxTrackedSearches: -1,
    maxCompetitors: -1,
    scanFrequency: "Custom",
    historyLabel: "Custom",
    directAgentLevel: "custom",
    seoFeatures: "custom",
    prioritySupport: true,
  },
};

export const ORDERED_PRICING_PLANS: PricingPlan[] = [
  PRICING_PLANS.starter,
  PRICING_PLANS.growth,
  PRICING_PLANS.pro,
  PRICING_PLANS.enterprise,
];

/**
 * Comparison table data. Each row is a feature with values per plan.
 * true = checkmark, false = dash, string = custom label.
 */
export const COMPARISON_TABLE: { section: string; rows: PricingFeatureRow[] }[] = [
  {
    section: "Core",
    rows: [
      { feature: "Businesses",            starter: "1",      growth: "1",      pro: "1",       enterprise: "Custom" },
      { feature: "Tracked AI searches",   starter: "25",     growth: "75",     pro: "200",     enterprise: "Custom" },
      { feature: "Competitors",           starter: "3",      growth: "5",      pro: "10",      enterprise: "Custom" },
      { feature: "Free during beta",      starter: true,     growth: true,     pro: true,      enterprise: "Contact sales" },
    ],
  },
  {
    section: "AI Visibility",
    rows: [
      { feature: "AI Visibility Tracking",  starter: true,       growth: true,        pro: true,          enterprise: true },
      { feature: "Direct Score",            starter: true,       growth: true,        pro: true,          enterprise: true },
      { feature: "Share of Voice",          starter: true,       growth: true,        pro: true,          enterprise: true },
      { feature: "Average AI Position",     starter: true,       growth: true,        pro: true,          enterprise: true },
      { feature: "Citation Tracking",       starter: true,       growth: true,        pro: true,          enterprise: true },
      { feature: "Model-by-model visibility", starter: true,     growth: true,        pro: true,          enterprise: true },
      { feature: "Historical AI visibility", starter: "3 months", growth: "12 months", pro: "Full",       enterprise: "Custom" },
      { feature: "AI Scan Frequency",       starter: "Monthly",  growth: "Weekly",    pro: "Daily",       enterprise: "Custom" },
    ],
  },
  {
    section: "Search Intelligence",
    rows: [
      { feature: "Keyword Rankings",          starter: true,    growth: true,    pro: true,       enterprise: true },
      { feature: "Search Volume",             starter: true,    growth: true,    pro: true,       enterprise: true },
      { feature: "Website Optimization",      starter: true,    growth: true,    pro: true,       enterprise: true },
      { feature: "Competitor Keyword Gaps",   starter: false,   growth: true,    pro: true,       enterprise: true },
      { feature: "Backlink Opportunities",    starter: false,   growth: true,    pro: true,       enterprise: true },
      { feature: "Advanced Competitor Analysis", starter: "Basic", growth: "Full", pro: "Advanced", enterprise: "Custom" },
      { feature: "SEO Refresh Frequency",     starter: "Monthly", growth: "Weekly", pro: "Frequent", enterprise: "Custom" },
    ],
  },
  {
    section: "AI Agent",
    rows: [
      { feature: "Direct Agent",              starter: "Basic",  growth: "Full",  pro: "Full + higher usage", enterprise: "Custom" },
      { feature: "Copy for Claude",           starter: true,     growth: true,    pro: true,                  enterprise: true },
      { feature: "Advanced Opportunity Detection", starter: "Basic", growth: true, pro: "Priority",           enterprise: "Custom" },
    ],
  },
  {
    section: "Support",
    rows: [
      { feature: "Priority Support",      starter: false, growth: false, pro: true, enterprise: true },
      { feature: "Dedicated Onboarding",  starter: false, growth: false, pro: false, enterprise: true },
      { feature: "Custom Reporting",      starter: false, growth: false, pro: false, enterprise: true },
    ],
  },
];
