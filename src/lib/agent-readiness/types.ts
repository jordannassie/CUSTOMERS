/**
 * Shared types for the AI Agent Readiness scanner.
 * These mirror the shape of the agent_readiness_scans and agent_readiness_actions tables.
 */

export type ReadinessStatus = "not_ready" | "needs_work" | "partially_ready" | "agent_ready";
export type VerificationStatus = "pending" | "verified" | "failed";
export type ScanStatus = "pending" | "running" | "completed" | "failed";
export type Confidence = "high" | "medium" | "low";

/**
 * Action types that AI agents might usefully invoke on a business website.
 * We detect these from real page content and recommend them based on business category.
 */
export type ActionType =
  | "contact_business"
  | "request_quote"
  | "book_appointment"
  | "make_reservation"
  | "search_services"
  | "search_products"
  | "check_service_area"
  | "purchase_product"
  | "submit_application"
  | "get_support"
  | "view_menu"
  | "order_food"
  | "find_location"
  | "newsletter_signup"
  | "view_services";

/** Human-readable labels for each action type */
export const ACTION_LABELS: Record<ActionType, string> = {
  contact_business:   "Contact Business",
  request_quote:      "Request a Quote",
  book_appointment:   "Book an Appointment",
  make_reservation:   "Make a Reservation",
  search_services:    "Search Services",
  search_products:    "Search Products",
  check_service_area: "Check Service Area",
  purchase_product:   "Purchase a Product",
  submit_application: "Submit an Application",
  get_support:        "Get Support",
  view_menu:          "View Menu",
  order_food:         "Order Food",
  find_location:      "Find a Location",
  newsletter_signup:  "Newsletter Signup",
  view_services:      "View Services",
};

/** Recommended WebMCP tool names for each action type */
export const WEBMCP_TOOL_NAMES: Record<ActionType, string> = {
  contact_business:   "contact_business",
  request_quote:      "request_quote",
  book_appointment:   "book_appointment",
  make_reservation:   "make_reservation",
  search_services:    "search_services",
  search_products:    "search_products",
  check_service_area: "check_service_area",
  purchase_product:   "purchase_product",
  submit_application: "submit_application",
  get_support:        "get_support",
  view_menu:          "view_menu",
  order_food:         "order_food",
  find_location:      "find_location",
  newsletter_signup:  "newsletter_signup",
  view_services:      "view_services",
};

/** A detected or recommended action on the business's website */
export interface AgentAction {
  action_type: ActionType;
  label: string;
  page_url: string | null;
  detected: boolean;
  webmcp_ready: boolean;
  confidence: Confidence | null;
  evidence: string | null;
  recommendation: string | null;
  recommended_tool_name: string;
  claude_prompt: string;
}

/** WebMCP tool as detected from the page */
export interface WebMCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  hasConfirmation?: boolean;
}

/** Result of WebMCP detection on a page */
export interface WebMCPDetectionResult {
  detected: boolean;
  source: "meta" | "link" | "script" | "well-known" | "js-pattern" | null;
  tools: WebMCPTool[];
  manifestUrl?: string;
  raw?: string;
}

/** Full result from scanning a business's website for agent readiness */
export interface AgentReadinessScanResult {
  domain: string;
  readiness_score: number;
  readiness_status: ReadinessStatus;
  webmcp_detected: boolean;
  webmcp_tool_count: number;
  actions_detected: number;
  actions_ready: number;
  actions: AgentAction[];
  webmcp: WebMCPDetectionResult;
}

/** Stored scan record from the database */
export interface AgentReadinessScan {
  id: string;
  business_id: string;
  domain: string;
  status: ScanStatus;
  readiness_status: ReadinessStatus | null;
  readiness_score: number | null;
  webmcp_detected: boolean;
  webmcp_tool_count: number;
  actions_detected: number;
  actions_ready: number;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

/** Stored action record from the database */
export interface AgentReadinessAction {
  id: string;
  scan_id: string;
  business_id: string;
  action_type: ActionType;
  label: string;
  page_url: string | null;
  detected: boolean;
  webmcp_ready: boolean;
  confidence: Confidence | null;
  evidence: string | null;
  recommendation: string | null;
  recommended_tool_name: string | null;
  claude_prompt: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  created_at: string;
}
