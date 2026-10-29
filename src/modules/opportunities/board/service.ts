// The Actions board (dashboard redesign, 2026-10-27): five columns, where each fix is applied, and one fix never added
// twice. Actions are the saved opportunities (migration 078), so the scan's fixes keep arriving as Suggested. Pure.
import { byImpactThenRank, rankOf } from "@/lib/fix-order";
import { WHERE_LABEL, whereOf, type Where } from "@/lib/fix-where";
import { WHERE_ORDER, competitorsIn } from "../where";
import { splitSteps } from "../service";

export const ACTION_STATUSES = ["suggested", "todo", "in_progress", "done", "dismissed"] as const;
/** Board statuses still to do; the database side is OPEN_FIX_STATUSES in src/lib/fix-status.ts. */
export const OPEN_ACTION_STATUSES: readonly string[] = ["suggested", "todo", "in_progress"];
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

/** Where a fix is made, finer than the three groups (PLACE_GROUP). */
export const PLACES = ["website", "google_listing", "review_sites", "social", "content"] as const;
export type Place = (typeof PLACES)[number];

export const PLACE_TEXT: Record<Place, string> = {
  website: "Website",
  google_listing: "Google Business Profile",
  review_sites: "Review sites",
  social: "Social",
  content: "Content",
};

/** The three groups every screen uses (WHERE_LABEL): content is on your website, review sites and social are other places. */
export const PLACE_GROUP: Record<Place, Where> = {
  website: "website",
  content: "website",
  google_listing: "google_listing",
  review_sites: "other_places",
  social: "other_places",
};

/** The board's "Where" filter: the three groups, then the narrower places inside them. */
export const WHERE_FILTERS = ["website", "google_listing", "other_places", "content", "review_sites", "social"] as const;
export type WhereFilter = (typeof WHERE_FILTERS)[number];

export const WHERE_FILTER_TEXT: Record<WhereFilter, string> = {
  ...WHERE_LABEL,
  content: PLACE_TEXT.content,
  review_sites: PLACE_TEXT.review_sites,
  social: PLACE_TEXT.social,
};

const GROUPS = new Set<string>(WHERE_ORDER);

/** A group filter takes every place in it; a narrower one takes only its own place. */
export const inWhere = (place: Place, filter: WhereFilter): boolean =>
  GROUPS.has(filter) ? PLACE_GROUP[place] === filter : place === filter;

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
  /** Holds the AI's rank for a scan fix (lib/fix-order.ts). */
  evidence_data?: unknown;
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
  source: "scan" | "comparison" | "sources" | "manual" | "report";
  createdAt: string;
  completedAt: string | null;
  dueDate: string | null;
  assignedToYou: boolean;
  about: { id: string; name: string }[];
};

const toImpact = (i: string): ActionItem["impact"] => (i === "high" || i === "low" ? i : "medium");
const clean = (t: string | null | undefined) => (t?.trim() ? t.trim() : null);

export type FixPlaceInput = {
  title: string;
  description: string | null;
  evidence: string | null;
  recommended_action?: string | null;
  category: string | null;
  claude_prompt: string | null;
  where_to_apply?: string | null;
  affected_url: string | null;
  evidence_data?: unknown;
};

/** Where a saved fix is made, and the place it is grouped under: one rule for the Actions board and the report. */
export function fixPlace(r: FixPlaceInput): { place: Place; whereToApply: string } {
  const text = [r.title, r.description, r.evidence, r.recommended_action].filter(Boolean).join("\n");
  const place = savedPlace(r.evidence_data) ?? placeOf(whereOf({ category: r.category, claudePrompt: clean(r.claude_prompt), text }), r.category, text);
  return { place, whereToApply: clean(r.where_to_apply) ?? defaultWhereToApply(place, text, r.affected_url) };
}
const SOURCES = new Set(["scan", "comparison", "sources", "manual", "report"]);

/** Most important first, then in the AI's order, then newest (lib/fix-order.ts). `you`: the signed-in user, to say which fixes are assigned to them. */
export function toActionItems(rows: ActionRow[], competitors: { id: string; name: string }[], you: string | null): ActionItem[] {
  const names = competitors.map((c) => c.name);
  return rows
    .filter((r) => !r.affected_url?.startsWith("checklist:"))
    .sort((a, b) => byImpactThenRank(orderKey(a), orderKey(b)))
    .map((r) => {
      const text = [r.title, r.description, r.evidence, r.recommended_action].filter(Boolean).join("\n");
      const { place, whereToApply } = fixPlace(r);
      return {
        id: r.id,
        title: r.title,
        impact: toImpact(r.impact),
        status: toActionStatus(r.status),
        place,
        whereToApply,
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
    });
}

/** The place the owner picked for a fix they added by hand (evidence_data.place); no category says "Social". */
function savedPlace(evidenceData: unknown): Place | null {
  if (!evidenceData || typeof evidenceData !== "object" || Array.isArray(evidenceData)) return null;
  const place = (evidenceData as Record<string, unknown>).place;
  return typeof place === "string" && (PLACES as readonly string[]).includes(place) ? (place as Place) : null;
}

const orderKey = (r: ActionRow) => ({ impact: r.impact, rank: rankOf(r.evidence_data), createdAt: r.created_at });

/** Where the fixes the owner added come from; the cap on open ones counts these (schema.ts). */
export const ADDED_SOURCES = ["comparison", "sources", "manual"] as const;

/** "Add to Actions" from Compare or Sources. The key makes a second click find the first one, never a copy. */
export type NewAction = {
  title: string;
  fact: string;
  whatToDo: string;
  whereToApply: string;
  impact: ActionItem["impact"];
  category: string;
  source: (typeof ADDED_SOURCES)[number];
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
