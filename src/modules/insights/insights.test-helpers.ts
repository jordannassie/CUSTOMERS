import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Signals } from "./facts";
import { COFFEE_CHECKS, COFFEE_SIGNALS, COFFEE_SOURCES } from "./fixtures";

// Local database set-up for the "why competitors win" tests (B-51): a business with the coffee fixtures, and a
// completed scan run with saved answers.
export const service = createServiceClient();
const userIds: string[] = [];

export async function deleteTestUsers() {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
}

export const fixtureSignals = async (placeId: string): Promise<Signals | null> => COFFEE_SIGNALS.get(placeId) ?? null;
const TEXT = "title, description, evidence, recommended_action, claude_prompt, status";

export async function seed(isTest: boolean) {
  const email = `vitest-insights-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Insights test", is_test: isTest })
    .select("id")
    .single()
    .throwOnError();
  const b = COFFEE_SOURCES.business;
  const { data: business } = await service
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.id,
      name: b.name,
      status: "active",
      industry: b.industry,
      domain: b.domain,
      has_website: true,
      primary_city: b.city,
      primary_region: b.region,
      places_id: b.placesId,
      services: b.services,
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single()
    .throwOnError();
  const { data: competitors } = await service
    .from("business_competitors")
    .insert(
      COFFEE_SOURCES.competitors.map((c) => ({ business_id: business.id, name: c.name, places_id: c.placesId, source: "confirmed_place", confirmed: true })),
    )
    .select("id, name")
    .throwOnError();
  await service.from("business_site_facts").insert({ business_id: business.id, data: COFFEE_SOURCES.siteFacts as never }).throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { userId: data.user.id, businessId: business.id, competitors, client };
}

export async function addRun(businessId: string): Promise<string> {
  const { data: run } = await service
    .from("visibility_runs")
    .insert({ business_id: businessId, provider: "openai,anthropic,perplexity", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  // Reasons use only the answers the score counts: suggested questions that are active now (BUG-129).
  const asked = [...new Set(COFFEE_CHECKS.map((c) => c.question))];
  const { data: questions } = await service
    .from("tracked_prompts")
    .insert(asked.map((prompt) => ({ business_id: businessId, prompt, source: "library" })))
    .select("id, prompt")
    .throwOnError();
  const questionId = new Map(questions!.map((q) => [q.prompt, q.id]));
  await service
    .from("visibility_results")
    .insert(
      COFFEE_CHECKS.map((c, i) => ({
        run_id: run.id,
        business_id: businessId,
        tracked_prompt_id: questionId.get(c.question),
        provider: c.provider,
        question: c.question,
        answer_text: `answer ${i}`,
        business_mentioned: c.businessMentioned,
        competitors_mentioned: c.competitorsMentioned as never,
        cited_sources: c.citations as never,
      })),
    )
    .throwOnError();
  return run.id;
}

export const opportunities = async (businessId: string) =>
  (await service.from("opportunities").select(TEXT).eq("business_id", businessId).order("created_at").throwOnError()).data!;
