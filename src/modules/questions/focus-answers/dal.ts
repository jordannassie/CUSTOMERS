import "server-only";
import { hostOf } from "@/lib/site-type";
import { createServiceClient } from "@/lib/supabase/service";
import type { ProviderId } from "@/modules/scanning";
import { matchingAnswers, type FocusAnswer } from "../answers";
import { checkMatches, type Focus, type FocusCheck } from "../focus";
import { withFixOptions } from "../fix-options";
import { readFixTexts } from "../reads/dal";

// "See the answers" from Compare (?site=, ?named=): the answers themselves, read only when a link asks for them.
// Callers check the business is the agency's first.

const DAY_MS = 86_400_000;
// The score's window, and enough rows for every answer in it on a busy business: the read is narrowed to the scored
// questions and the chosen AI tools, so 3000 covers 100 questions times 3 tools times 10 scans.
const WINDOW_DAYS = 30;
const MAX_ROWS = 3000;
const PAGE = 1000;

type Row = {
  provider: string;
  created_at: string;
  tracked_prompt_id: string | null;
  business_mentioned: boolean;
  competitors_mentioned: unknown;
  answer_text: string | null;
  cached: boolean | null;
  extracted_names: unknown;
  cited_sources: unknown;
};

/** The same fields the filter on the list uses, so the answers shown are exactly the ones that keep a question. */
function focusCheck(row: Row): FocusCheck {
  const cited = Array.isArray(row.cited_sources) ? row.cited_sources : [];
  const hosts = cited.flatMap((c) => (c && typeof c === "object" && typeof c.url === "string" ? [hostOf(c.url)] : [])).filter((h): h is string => !!h);
  const named = Array.isArray(row.competitors_mentioned) ? row.competitors_mentioned : [];
  return {
    questionId: row.tracked_prompt_id ?? "none",
    provider: row.provider,
    youNamed: row.business_mentioned,
    sites: [...new Set(hosts)],
    competitors: named.flatMap((c) => (c && typeof c === "object" && typeof c.name === "string" && c.mentioned !== false ? [c.name as string] : [])),
    extracted: row.extracted_names,
  };
}

export async function readFocusAnswers(
  businessId: string,
  models: ProviderId[],
  questions: Map<string, string>,
  focus: Focus,
  now: Date,
  /** For "Why you were skipped": your website and place, to offer the right fix for a site. */
  you: { ownDomain: string | null; place: string | null } = { ownDomain: null, place: null },
): Promise<{ answers: FocusAnswer[]; total: number }> {
  if (!focus.site && !focus.named) return { answers: [], total: 0 };
  const questionIds = [...questions.keys()];
  if (questionIds.length === 0 || models.length === 0) return { answers: [], total: 0 };
  const since = new Date(now.getTime() - WINDOW_DAYS * DAY_MS).toISOString();
  const rows: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    // The rows that count: never sample answers once the agency is real (migration 044).
    const { data, error } = await createServiceClient()
      .from("visibility_results_counted")
      .select("provider, created_at, tracked_prompt_id, business_mentioned, competitors_mentioned, answer_text, cached, extracted_names, cited_sources")
      .eq("business_id", businessId)
      .in("tracked_prompt_id", questionIds)
      .in("provider", models)
      .gt("created_at", since)
      // id breaks ties, so pages never skip or repeat rows saved at the same moment.
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Questions: could not load the answers for this link: ${error.message}`);
    rows.push(
      ...data.map((r) => ({
        provider: r.provider ?? "",
        created_at: r.created_at ?? "",
        tracked_prompt_id: r.tracked_prompt_id,
        business_mentioned: r.business_mentioned ?? false,
        competitors_mentioned: r.competitors_mentioned,
        answer_text: r.answer_text,
        cached: r.cached,
        extracted_names: r.extracted_names,
        cited_sources: r.cited_sources,
      })),
    );
    if (data.length < PAGE) break;
  }
  const found = matchingAnswers(rows, models, questions, (row) => checkMatches(focusCheck(row as Row), focus));
  if (found.answers.length === 0) return found;
  // Each answer opens the saved fix for the site the link is about, or offers to add it.
  const fixes = await readFixTexts(businessId);
  const answers = withFixOptions(found.answers, fixes, { ...you, question: (a) => (a as FocusAnswer).question, site: focus.site });
  return { answers, total: found.total };
}
