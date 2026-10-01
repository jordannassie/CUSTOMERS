export type Period = "24h" | "48h" | "7d";
export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
export type BadgeTone = "tint" | "good" | "mid" | "low" | "secondary" | "outline";

export interface WeekdayDef {
  key: Weekday;
  short: string;
  label: string;
  theme: string;
  desc: string;
}

export const WEEKDAYS: WeekdayDef[] = [
  {
    key: "monday", short: "Mon", label: "Monday",
    theme: "AI search news",
    desc: "Explain a verified AI search development and what it means for agency clients.",
  },
  {
    key: "tuesday", short: "Tue", label: "Tuesday",
    theme: "Client vs. competitors",
    desc: "Explain how agencies can compare client visibility against competitors.",
  },
  {
    key: "wednesday", short: "Wed", label: "Wednesday",
    theme: "Package AEO services",
    desc: "Help agencies explain, scope, and offer AEO services to clients.",
  },
  {
    key: "thursday", short: "Thu", label: "Thursday",
    theme: "Reporting checklist",
    desc: "Share practical AI visibility audit steps and client-reporting advice.",
  },
  {
    key: "friday", short: "Fri", label: "Friday",
    theme: "Agency workflow",
    desc: "Show how agencies can use Customers.Direct features for client comparisons and next steps.",
  },
];

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "48h", label: "Last 48 hours" },
  { value: "7d", label: "Last 7 days" },
];

export const LINKEDIN_LIMIT = 3000;

export const AEO_REPLY = `Thanks for commenting AEO! Here's the link: https://customers.direct/

Enter your client's website and a competitor's website to compare their AI search visibility. Which client are you checking first?`;

// Weekends fall back to Monday's angle.
export function getTodayWeekday(): Weekday {
  const map: Record<number, Weekday> = {
    0: "monday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "monday",
  };
  return map[new Date().getDay()];
}

const CATEGORY_TONES: Record<string, BadgeTone> = {
  "AI Search": "tint",
  "AEO": "tint",
  "Brand Visibility": "good",
  "Competitor Intelligence": "mid",
  "Client Reporting": "mid",
  "Agency Tools": "tint",
  "Platform Update": "low",
  "AI Content": "secondary",
  "AI Tools": "tint",
  "AI Marketing": "tint",
  "New Features": "low",
};

export function categoryTone(cat: string): BadgeTone {
  return CATEGORY_TONES[cat] ?? "secondary";
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
