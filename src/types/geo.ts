// Domain types for the opportunities (fixes) table.
// These mirror the schema in supabase/migrations/006_geo_platform_schema.sql.

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
export type OpportunityStatus = "open" | "todo" | "in_progress" | "resolved" | "dismissed";

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
  /** Migration 078: the Actions board. */
  where_to_apply?: string | null;
  source?: string;
  evidence_data?: unknown;
  due_date?: string | null;
  completed_at?: string | null;
  assignee_id?: string | null;
}
