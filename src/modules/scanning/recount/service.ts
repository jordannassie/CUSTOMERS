// Checking saved answers again (BUG-122). Mentions are saved with each check, so a competitor added later, or a
// matching rule fixed later (BUG-113), only showed in new scans. The same rules as a scan (check.ts) run on the saved
// answer text and its saved name extraction. Pure, so every case is unit tested.
import type { Json } from "@/types/database.types";
import { matchNames } from "../extract-match";
import { mergeMentions } from "../mention-merge";
import { detectMentions, type MentionTarget } from "../mentions";

export type TargetBusiness = {
  name: string;
  aliases: string[] | null;
  domain: string | null;
  city: string | null;
  phone: string | null;
  hasWebsite: boolean | null;
};

export type TargetCompetitor = { name: string; domain: string | null; phone: string | null; city: string | null };

/** The business and its competitors as mention detection sees them; the scan and the recount share it. */
export function mentionTargets(business: TargetBusiness, competitors: TargetCompetitor[]) {
  return {
    business: {
      name: business.name,
      aliases: business.aliases ?? [],
      website: business.domain,
      city: business.city,
      phone: business.phone,
      hasWebsite: business.hasWebsite ?? Boolean(business.domain),
    } satisfies MentionTarget,
    competitors: competitors.map((c): MentionTarget => ({ name: c.name, website: c.domain, phone: c.phone, city: c.city ?? business.city })),
  };
}

export type SavedCheck = {
  id: string;
  answer_text: string | null;
  extracted_names: unknown;
  business_mentioned: boolean;
  mention_position: number | null;
  competitors_mentioned: unknown;
};

export type RecountedCheck = {
  id: string;
  business_mentioned: boolean;
  mention_position: number | null;
  competitors_mentioned: Json;
  extracted_names: Json | null;
};

type StoredNames = { promptVersion?: unknown; names?: { name?: unknown; position?: unknown }[] };

function savedNames(value: unknown): { promptVersion: string; names: { name: string; position: number }[] } | null {
  if (!value || typeof value !== "object") return null;
  const v = value as StoredNames;
  if (!Array.isArray(v.names)) return null;
  const names = v.names.flatMap((n, i) =>
    typeof n?.name === "string" ? [{ name: n.name, position: typeof n.position === "number" ? n.position : i + 1 }] : [],
  );
  return { promptVersion: typeof v.promptVersion === "string" ? v.promptVersion : "unknown", names };
}

/** The check as a scan would save it today; null when nothing changes or there is no answer text to read. */
export function recountCheck(row: SavedCheck, targets: ReturnType<typeof mentionTargets>): RecountedCheck | null {
  if (!row.answer_text) return null;
  const stored = savedNames(row.extracted_names);
  const matched = stored ? matchNames(stored.names, targets.business, targets.competitors) : null;
  const merged = mergeMentions(row.answer_text, detectMentions(row.answer_text, targets.business, targets.competitors), matched);
  const next: RecountedCheck = {
    id: row.id,
    business_mentioned: merged.business.mentioned,
    mention_position: merged.business.position,
    competitors_mentioned: merged.competitors.filter((c) => c.mentioned).map((c) => ({ name: c.name, position: c.position })),
    extracted_names: stored ? ({ promptVersion: stored.promptVersion, names: matched } as Json) : null,
  };
  const same =
    next.business_mentioned === row.business_mentioned &&
    next.mention_position === row.mention_position &&
    JSON.stringify(next.competitors_mentioned) === JSON.stringify(row.competitors_mentioned ?? []) &&
    JSON.stringify(next.extracted_names) === JSON.stringify(row.extracted_names ?? null);
  return same ? null : next;
}
