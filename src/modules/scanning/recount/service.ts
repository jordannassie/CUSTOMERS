// Checking saved answers again (BUG-122). Mentions are saved with each check, so a competitor added later, or a
// matching rule fixed later (BUG-113), only showed in new scans. The same rules as a scan (check.ts) run on the saved
// answer text and its saved name extraction. Pure, so every case is unit tested.
import type { Json } from "@/types/database.types";
import { branchOf } from "../branch";
import { coreName, domainBrand } from "../mention-text";
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
  /** The neighborhood or area, "Hyde Park": a branch named with it counts as named (step 7). */
  area?: string | null;
};

export type TargetCompetitor = { name: string; domain: string | null; phone: string | null; city: string | null };

/**
 * When the business is itself one branch of a chain, the places that name it: its own ("Congress") and its area.
 * Its score then counts only answers that name the branch, and the chain's mentions are shown apart (step 7).
 */
export function ownBranch(business: Pick<TargetBusiness, "name" | "city" | "domain" | "area">): { places: string[] } | null {
  const branch = branchOf(business.name, business.city, business.domain);
  // Only when its own website spells the chain's brand ("Bennu Coffee" on bennucoffee.com): a name that merely reads
  // like "<brand> <place>" ("Push Pull on Union", "... Full Service AI Agency") must not lose its own mentions.
  const spelled = branch && domainBrand(business.name, business.domain);
  if (!branch || !spelled || coreName(spelled) !== coreName(branch.brand)) return null;
  return { places: [branch.place, business.area ?? ""].filter((p) => p.trim()) };
}

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
      branch: ownBranch(business),
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
    sameJson(next.competitors_mentioned, row.competitors_mentioned ?? []) &&
    sameJson(next.extracted_names, row.extracted_names ?? null);
  return same ? null : next;
}

/** Equal as JSON whatever the key order: jsonb gives keys back sorted, so plain text compare called every row changed. */
function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => [k, sorted(v)]));
  }
  return value;
}
