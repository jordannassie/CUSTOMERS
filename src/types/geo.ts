// Domain types for the Customers.Direct AI Search Visibility (GEO/AEO) platform.
// These mirror the schema in supabase/migrations/006_geo_platform_schema.sql.

export type BusinessStatus = "onboarding" | "scanning" | "active" | "paused";

export interface Business {
  id: string;
  owner_user_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  description: string | null;
  reach_type: string | null;
  primary_country: string | null;
  primary_region: string | null;
  primary_city: string | null;
  language: string;
  logo_url: string | null;
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
}

export interface BusinessCompetitor {
  id: string;
  business_id: string;
  name: string;
  domain: string | null;
  source: string | null;
  confirmed: boolean;
  created_at: string;
}

export interface TrackedPrompt {
  id: string;
  business_id: string;
  prompt: string;
  category: string | null;
  buyer_intent: string | null;
  location: string | null;
  active: boolean;
  created_at: string;
}

export type VisibilityRunStatus = "pending" | "running" | "completed" | "failed";

export interface VisibilityRun {
  id: string;
  business_id: string;
  provider: string;
  started_at: string;
  completed_at: string | null;
  status: VisibilityRunStatus;
  error: string | null;
  created_at: string;
}

export interface CitedSource {
  url: string;
  title?: string;
}

export interface VisibilityResult {
  id: string;
  run_id: string;
  business_id: string;
  tracked_prompt_id: string | null;
  provider: string;
  raw_response: unknown;
  business_mentioned: boolean;
  mention_position: number | null;
  competitors_mentioned: Array<{ name: string }>;
  cited_sources: CitedSource[];
  sentiment: string | null;
  methodology: string | null;
  created_at: string;
}

export interface VisibilityScore {
  id: string;
  business_id: string;
  score: number;
  mention_rate: number | null;
  citation_rate: number | null;
  prompts_won: number | null;
  prompts_tested: number | null;
  competitor_share: number | null;
  calculated_at: string;
}

export type OpportunityImpact = "high" | "medium" | "low";
export type OpportunityCategory =
  | "content"
  | "service_page"
  | "technical"
  | "structured_data"
  | "entity_consistency"
  | "citations"
  | "reviews_reputation"
  | "local_presence"
  | "competitor_gap";
export type OpportunityStatus = "open" | "in_progress" | "resolved" | "dismissed";

export interface Opportunity {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  evidence: string | null;
  impact: OpportunityImpact;
  category: OpportunityCategory;
  affected_url: string | null;
  status: OpportunityStatus;
  recommended_action: string | null;
  claude_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceRequestStatus =
  | "requested"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined";

export interface ServiceRequest {
  id: string;
  business_id: string;
  opportunity_id: string | null;
  requested_by: string;
  status: ServiceRequestStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionPlan = "none" | "ai_visibility" | "growth_agent" | "autonomous_growth";
export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

export interface Subscription {
  id: string;
  business_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// --- AI visibility provider adapter ---------------------------------------

export type VisibilityProviderId = "openai" | "anthropic" | "perplexity" | "google_ai_overviews";

export interface VisibilityProviderContext {
  businessName: string;
  domain: string | null;
  city: string | null;
  region: string | null;
  competitorNames: string[];
}

export interface VisibilityProviderResult {
  provider: VisibilityProviderId;
  raw: unknown;
  answerText: string;
  businessMentioned: boolean;
  mentionPosition: number | null;
  competitorsMentioned: Array<{ name: string }>;
  citedSources: CitedSource[];
  methodology: string;
}

// --- Onboarding scanner -----------------------------------------------------

export interface ScanResult {
  name: string | null;
  domain: string;
  description: string | null;
  industry: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  logoUrl: string | null;
  confidence: "deterministic" | "llm_assisted";
}
