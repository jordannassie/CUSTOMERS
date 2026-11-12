import { leadStage, stageStatus, type LeadStage } from "@/modules/feedback/lead-rules";

export { leadStage, stageStatus, type LeadStage };

export interface Lead {
  id: string;
  created_at: string;
  read_at: string | null;
  name: string;
  email: string;
  company: string | null;
  website: string | null;
  phone: string | null;
  topic: string;
  message: string;
  status: string;
  source: string | null;
  page_path: string | null;
  /** Follow-up (admin review 2026-11-12). */
  admin_notes: string | null;
  handled_by: string | null;
  replied_at: string | null;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

/** The older filter values some lead still has (oldLeadValuesInUse), listed after the current ones. */
export type OldValuesInUse = { topics: string[]; sources: string[]; statuses: string[] };

// The dashboard's two pill colours (src/components/app/pills.ts).
export type StatusVariant = "tint" | "secondary";

// What people pick today. "sales" is what a paid AI video ad brief is saved as (video-ads/lead-mirror.ts).
export const INTEREST_LABELS: Record<string, string> = {
  ai_visibility: "AI visibility",
  agency: "Join as agency",
  book_demo: "Book demo call",
  sales: "Video ad order",
  other: "Other",
};
// Only older leads carry these; the filter shows them as "Older: ..." while a lead still uses one.
const OLD_INTEREST_LABELS: Record<string, string> = {
  product: "Product",
  support: "Support",
  enterprise: "Enterprise",
  chatgpt_ads: "ChatGPT ads",
};

export const SOURCE_LABELS: Record<string, string> = {
  contact_page: "Contact page",
  chat: "Chat widget",
  agency: "Agency page",
  video_ad: "AI video ads page",
  other: "Other",
};
const OLD_SOURCE_LABELS: Record<string, string> = { ads_page: "Ads page" };

// One pipeline (admin review 2026-11-12): only these can be set. Older rows may still say in_progress or resolved.
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
];
const OLD_STATUS_LABELS: Record<string, string> = { in_progress: "In progress", resolved: "Resolved" };

// What the list badge and the Status filter say (leadStage): Opened sits between New and Contacted.
const STAGE_LABELS: Record<string, string> = {
  new: "New",
  opened: "Opened",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
  ...OLD_STATUS_LABELS,
};

export function interestLabel(topic: string): string {
  return INTEREST_LABELS[topic] ?? OLD_INTEREST_LABELS[topic] ?? topic.replace(/_/g, " ");
}

export function sourceLabel(source: string | null): string {
  if (!source) return "Not recorded";
  return SOURCE_LABELS[source] ?? OLD_SOURCE_LABELS[source] ?? source.replace(/_/g, " ");
}

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
}

/** Only New stands out: a lead nobody has opened or answered yet. */
export function stageVariant(stage: string): StatusVariant {
  return stage === "new" ? "tint" : "secondary";
}

type Option = [value: string, label: string];

const older = (values: string[], labels: Record<string, string>): Option[] =>
  values.map((v) => [v, `Older: ${labels[v] ?? v.replace(/_/g, " ")}`]);

/** The filter lists: today's values first, then any older value a lead still has, marked "Older". */
export function filterOptions(old: OldValuesInUse): { interest: Option[]; source: Option[]; status: Option[] } {
  return {
    interest: [...Object.entries(INTEREST_LABELS), ...older(old.topics, OLD_INTEREST_LABELS)],
    source: [...Object.entries(SOURCE_LABELS), ...older(old.sources, OLD_SOURCE_LABELS)],
    status: [
      ["new", "New (not opened yet)"],
      ["opened", "Opened, not answered"],
      ["contacted", "Contacted"],
      ["qualified", "Qualified"],
      ["closed", "Closed"],
      ...older(old.statuses, OLD_STATUS_LABELS),
    ],
  };
}

export { formatDate } from "../../_components/format";
