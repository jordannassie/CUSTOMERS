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

export type StatusVariant = "tint" | "mid" | "good" | "secondary";

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
};

export const STATUS_OPTIONS: { value: string; label: string; variant: StatusVariant }[] = [
  { value: "new", label: "New", variant: "tint" },
  { value: "contacted", label: "Contacted", variant: "mid" },
  { value: "qualified", label: "Qualified", variant: "tint" },
  { value: "closed", label: "Closed", variant: "good" },
  { value: "in_progress", label: "In progress", variant: "mid" },
  { value: "resolved", label: "Resolved", variant: "secondary" },
];

export function statusVariant(s: string): StatusVariant {
  return STATUS_OPTIONS.find((o) => o.value === s)?.variant ?? "secondary";
}

export function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
