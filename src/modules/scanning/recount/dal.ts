import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { recountCheck, mentionTargets, type SavedCheck } from "./service";

// Checks saved answers again with today's rules and competitor list (BUG-122). Runs after the competitor list
// changes, and once for answers saved before a rule fix. Reads and writes with the service role; callers check the
// user may change this business first.

// The history chart reaches 90 days back; the score uses 30.
export const RECOUNT_DAYS = 90;
const PAGE = 500;

export type RecountResult = { checked: number; changed: number };

export async function recountSavedAnswers(businessId: string, now = new Date()): Promise<RecountResult> {
  const db = createServiceClient();
  const [business, competitors] = await Promise.all([
    db.from("businesses").select("name, aliases, domain, primary_city, phone, has_website").eq("id", businessId).single(),
    db.from("business_competitors").select("id, name, domain, phone, city").eq("business_id", businessId),
  ]);
  if (business.error) throw new Error(`Recount: could not load the business: ${business.error.message}`);
  if (competitors.error) throw new Error(`Recount: could not load competitors: ${competitors.error.message}`);
  const b = business.data;
  const targets = mentionTargets(
    { name: b.name, aliases: b.aliases, domain: b.domain, city: b.primary_city, phone: b.phone, hasWebsite: b.has_website },
    competitors.data,
  );

  const since = new Date(now.getTime() - RECOUNT_DAYS * 86_400_000).toISOString();
  let checked = 0;
  let changed = 0;
  let earliest: string | null = null;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("visibility_results")
      .select("id, created_at, answer_text, extracted_names, business_mentioned, mention_position, competitors_mentioned")
      .eq("business_id", businessId)
      .gt("created_at", since)
      .not("answer_text", "is", null)
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Recount: could not read saved answers: ${error.message}`);
    for (const row of data) {
      earliest ??= row.created_at;
      checked++;
      const next = recountCheck(row as SavedCheck, targets);
      if (!next) continue;
      const { id, ...fields } = next;
      const update = await db.from("visibility_results").update(fields).eq("id", id);
      if (update.error) throw new Error(`Recount: could not save a check: ${update.error.message}`);
      changed++;
    }
    if (data.length < PAGE) break;
  }

  // Every competitor has now been looked for in every answer from `earliest` on, so none is "still collecting".
  if (earliest) {
    for (const mark of [
      db.from("business_competitors").update({ checked_from: earliest }).eq("business_id", businessId).is("checked_from", null),
      db.from("business_competitors").update({ checked_from: earliest }).eq("business_id", businessId).gt("checked_from", earliest),
    ]) {
      const { error: markError } = await mark;
      if (markError) throw new Error(`Recount: could not mark competitors: ${markError.message}`);
    }
  }
  return { checked, changed };
}

/** After the competitor list changes: never fails the change itself, only logs. */
export async function recountAfterCompetitorChange(businessId: string): Promise<void> {
  try {
    await recountSavedAnswers(businessId);
  } catch (error) {
    console.error("[scanning/recount] could not check saved answers again", error instanceof Error ? error.message : error);
  }
}

