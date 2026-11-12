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

export interface LeadsQuery {
  page: number;
  search: string;
  interest: string;
  source: string;
  status: string;
  unread: boolean;
}

// The dashboard's two pill colours (src/components/app/pills.ts).
export type StatusVariant = "tint" | "secondary";

export const INTEREST_LABELS: Record<string, string> = {
  ai_visibility: "AI visibility",
  agency: "Join as agency",
  book_demo: "Book demo call",
  other: "Other",
  // Legacy values, kept so old records still show a label
  product: "Product",
  support: "Support",
  sales: "Sales",
  enterprise: "Enterprise",
  chatgpt_ads: "ChatGPT ads",
};

export const SOURCE_LABELS: Record<string, string> = {
  contact_page: "Contact page",
  chat: "Chat widget",
  agency: "Agency page",
  other: "Other",
  ads_page: "Ads page (legacy)",
  video_ad: "AI video ads",
};

// One pipeline (admin review 2026-11-12): only these are offered. Older rows may still say in_progress or resolved,
// which keep their names below so nothing reads as a raw code.
export const STATUS_OPTIONS: { value: string; label: string; variant: StatusVariant }[] = [
  { value: "new", label: "New", variant: "tint" },
  { value: "contacted", label: "Contacted", variant: "secondary" },
  { value: "qualified", label: "Qualified", variant: "secondary" },
  { value: "closed", label: "Closed", variant: "secondary" },
];
const OLD_STATUS_LABELS: Record<string, string> = { in_progress: "In progress", resolved: "Resolved" };

export function statusVariant(s: string): StatusVariant {
  return STATUS_OPTIONS.find((o) => o.value === s)?.variant ?? "secondary";
}

export function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? OLD_STATUS_LABELS[s] ?? s.replace(/_/g, " ");
}

export { formatDate } from "../../_components/format";
