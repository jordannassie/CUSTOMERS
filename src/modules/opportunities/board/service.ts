// The Actions board (dashboard redesign, 2026-10-27): five columns, where each fix is applied, and one fix never added
// twice. Actions are the saved opportunities (migration 078), so the scan's fixes keep arriving as Suggested. Pure.
import { whereOf, type Where } from "@/lib/fix-where";
import { competitorsIn } from "../where";
import { splitSteps } from "../service";

export const ACTION_STATUSES = ["suggested", "todo", "in_progress", "done", "dismissed"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const STATUS_TEXT: Record<ActionStatus, string> = {
  suggested: "Suggested",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  dismissed: "Dismissed",
};

const FROM_DB: Record<string, ActionStatus> = { open: "suggested", todo: "todo", in_progress: "in_progress", resolved: "done", dismissed: "dismissed" };
const TO_DB: Record<ActionStatus, string> = { suggested: "open", todo: "todo", in_progress: "in_progress", done: "resolved", dismissed: "dismissed" };

export const toActionStatus = (status: string): ActionStatus => FROM_DB[status] ?? "suggested";
export const toDbActionStatus = (status: ActionStatus): string => TO_DB[status];

/** The board's "Where" filter: finer than the three Opportunities groups. */
export const PLACES = ["website", "google_listing", "review_sites", "social", "content"] as const;
export type Place = (typeof PLACES)[number];

export const PLACE_TEXT: Record<Place, string> = {
  website: "Website",
  google_listing: "Google listing",
  review_sites: "Review sites",
  social: "Social",
  content: "Content",
};

const SOCIAL = /\b(facebook|instagram|tiktok|youtube|linkedin|twitter|x\.com|pinterest|threads)\b/i;
const CONTENT = new Set(["content"]);
const HOST = /\b((?:[a-z0-9-]+\.)+(?:com|net|org|co|io|pk|uk|ca|au|in|de|fr|es|it|nl|us|biz|info)(?:\.[a-z]{2})?)\b/i;

export function placeOf(where: Where, category: string | null, text: string): Place {
  if (where === "google_listing") return "google_listing";
  if (where === "other_places") return SOCIAL.test(text) ? "social" : "review_sites";
  return CONTENT.has(category ?? "") ? "content" : "website";
}

/** "Google Business Profile", "yelp.com", "Website · /menu": what the owner opens to make the fix. */
export function defaultWhereToApply(place: Place, text: string, affectedUrl: string | null): string {
  if (place === "google_listing") return "Google Business Profile";
  if (place === "review_sites" || place === "social") {
    const host = text.match(HOST)?.[1]?.toLowerCase();
    if (host && !/google\./.test(host)) return host.replace(/^www\./, "");
    return place === "social" ? "Your social profiles" : "Review and listing sites";
  }
  const page = affectedUrl && !affectedUrl.startsWith("checklist:") ? pathOf(affectedUrl) : null;
  return page ? `Website · ${page}` : place === "content" ? "Your website content" : "Your website";
}

function pathOf(url: string): string | null {
  try {
    const u = new URL(url, "https://x.example");
    return u.pathname && u.pathname !== "/" ? u.pathname : "home page";
  } catch {
    return null;
  }
}

export type ActionRow = {
  id: string;
  title: string;
  impact: string;
  status: string;
  category: string | null;
  description: string | null;
  evidence: string | null;
  recommended_action: string | null;
  claude_prompt: string | null;
  affected_url: string | null;
  created_at: string;
  where_to_apply?: string | null;
  source?: string;
  due_date?: string | null;
  completed_at?: string | null;
  assignee_id?: string | null;
  usesGoogle: boolean;
  googleValues?: boolean;
};

export type ActionItem = {
  id: string;
  title: string;
  impact: "high" | "medium" | "low";
  status: ActionStatus;
  place: Place;
  whereToApply: string;
  /** The fact that created it: why this fix. */
  evidence: string | null;
  whyItMatters: string | null;
  steps: string[];
  claudePrompt: string | null;
  usesGoogle: boolean;
  /** Its text has Google values not shown yet: the card offers "Show Google numbers". */
  googleHidden: boolean;
  source: "scan" | "comparison" | "sources" | "manual";
  createdAt: string;
  completedAt: string | null;
  dueDate: string | null;
  assignedToYou: boolean;
  about: { id: string; name: string }[];
};

const IMPACT_ORDER = { high: 0, medium: 1, low: 2 } as const;
const toImpact = (i: string): ActionItem["impact"] => (i === "high" || i === "low" ? i : "medium");
const clean = (t: string | null | undefined) => (t?.trim() ? t.trim() : null);
const SOURCES = new Set(["scan", "comparison", "sources", "manual"]);

/** Most important first, then newest. `you`: the signed-in user, to say which fixes are assigned to them. */
export function toActionItems(rows: ActionRow[], competitors: { id: string; name: string }[], you: string | null): ActionItem[] {
  const names = competitors.map((c) => c.name);
  return rows
    .filter((r) => !r.affected_url?.startsWith("checklist:"))
    .map((r) => {
      const text = [r.title, r.description, r.evidence, r.recommended_action].filter(Boolean).join("\n");
      const place = placeOf(whereOf({ category: r.category, claudePrompt: clean(r.claude_prompt), text }), r.category, text);
      return {
        id: r.id,
        title: r.title,
        impact: toImpact(r.impact),
        status: toActionStatus(r.status),
        place,
        whereToApply: clean(r.where_to_apply) ?? defaultWhereToApply(place, text, r.affected_url),
        evidence: clean(r.evidence),
        whyItMatters: clean(r.description),
        steps: splitSteps(r.recommended_action),
        claudePrompt: clean(r.claude_prompt),
        usesGoogle: r.usesGoogle,
        googleHidden: !!r.googleValues && !r.usesGoogle,
        source: (SOURCES.has(r.source ?? "") ? r.source : "scan") as ActionItem["source"],
        createdAt: r.created_at,
        completedAt: r.completed_at ?? null,
        dueDate: r.due_date ?? null,
        assignedToYou: !!you && r.assignee_id === you,
        about: competitorsIn(text, names).map((n) => competitors.find((c) => c.name === n)!),
      };
    })
    .sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || b.createdAt.localeCompare(a.createdAt));
}

/** "Add to Actions" from Compare or Sources. The key makes a second click find the first one, never a copy. */
export type NewAction = {
  title: string;
  fact: string;
  whatToDo: string;
  whereToApply: string;
  impact: ActionItem["impact"];
  category: string;
  source: "comparison" | "sources" | "manual";
  dedupeKey: string;
  /** Small facts behind it, for later: answer count, domain, competitor id. */
  evidenceData?: { [key: string]: string | number | boolean | null | string[] };
};

/** The row to insert; it starts in To do, since the owner chose it. */
export function actionRow(businessId: string, a: NewAction) {
  return {
    business_id: businessId,
    title: a.title,
    evidence: a.fact,
    recommended_action: a.whatToDo,
    where_to_apply: a.whereToApply,
    impact: a.impact,
    category: a.category,
    status: "todo",
    source: a.source,
    dedupe_key: a.dedupeKey,
    evidence_data: a.evidenceData ?? {},
  };
}

/** A status change, with the date a fix was done (cleared when it moves back). */
export function statusUpdate(status: ActionStatus, now: Date) {
  return { status: toDbActionStatus(status), completed_at: status === "done" ? now.toISOString() : null, updated_at: now.toISOString() };
}

/** What "Add to Actions" shows once added: "In Actions · To do". */
export type ActionState = { id: string; status: ActionStatus };
