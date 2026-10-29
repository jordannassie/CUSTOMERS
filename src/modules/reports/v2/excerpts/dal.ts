import "server-only";
// Picks the two answers the report quotes: the latest one that named the business, and the latest one that named the
// top competitor instead. answer_text is read for these few rows only, never for every answer. Callers check the
// viewer may see this business first.
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { ASSISTANTS, type StandingCheck } from "@/modules/standing";
import type { Excerpt } from "../build";
import { excerptAround } from "../excerpt";

// A few candidates each, in case the newest one never spells the name out.
const CANDIDATES = 5;
const mentions = z.array(z.object({ name: z.string(), mentioned: z.boolean().optional() }));
const key = (name: string) => name.trim().toLowerCase();

type Row = { provider: string | null; tracked_prompt_id: string | null; created_at: string | null; answer_text: string | null; competitors_mentioned: unknown };

export type ExcerptInput = {
  businessId: string;
  since: Date;
  /** The score's answers: only their questions and AI tools are quoted. */
  checks: StandingCheck[];
  questions: Map<string, string>;
  you: string;
  /** The competitor to quote: the name AI uses and the tracked names saved on each answer. */
  rival: { name: string; tracked: string[] } | null;
};

function toExcerpt(rows: Row[], names: string[], name: string, questions: Map<string, string>): Excerpt | null {
  for (const r of rows) {
    const question = r.tracked_prompt_id ? questions.get(r.tracked_prompt_id) : undefined;
    const text = r.answer_text ? excerptAround(r.answer_text, names) : null;
    if (!question || !text || !r.provider || !r.created_at) continue;
    return { engine: ASSISTANTS[r.provider] ?? r.provider, date: r.created_at.slice(0, 10), question, text, name };
  }
  return null;
}

export async function pickExcerpts(input: ExcerptInput): Promise<{ named: Excerpt | null; competitor: Excerpt | null }> {
  const questionIds = [...new Set(input.checks.map((c) => c.questionId))];
  const providers = [...new Set(input.checks.map((c) => c.provider))];
  if (questionIds.length === 0) return { named: null, competitor: null };
  const base = () =>
    createServiceClient()
      .from("visibility_results_counted")
      .select("provider, tracked_prompt_id, created_at, answer_text, competitors_mentioned")
      .eq("business_id", input.businessId)
      .gt("created_at", input.since.toISOString())
      .in("tracked_prompt_id", questionIds)
      .in("provider", providers)
      .order("created_at", { ascending: false })
      .limit(CANDIDATES);
  const rival = input.rival;
  const [named, instead] = await Promise.all([
    base().eq("business_mentioned", true),
    rival ? base().eq("business_mentioned", false).contains("competitors_mentioned", JSON.stringify([{ name: rival.tracked[0] }])) : null,
  ]);
  if (named.error) throw new Error(`Reports: could not read answers to quote: ${named.error.message}`);
  if (instead?.error) throw new Error(`Reports: could not read answers to quote: ${instead.error.message}`);

  // Older rows may save `mentioned: false` for a name the answer did not use (scanning/check.ts).
  const wanted = new Set(rival?.tracked.map(key) ?? []);
  const reallyNamed = (instead?.data ?? []).filter((r) => {
    const list = mentions.safeParse(r.competitors_mentioned);
    return list.success && list.data.some((m) => m.mentioned !== false && wanted.has(key(m.name)));
  });
  return {
    named: toExcerpt(named.data, [input.you], input.you, input.questions),
    competitor: rival ? toExcerpt(reallyNamed, [rival.name, ...rival.tracked], rival.name, input.questions) : null,
  };
}
