import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// Local database set-up for the share link and snapshot tests (B-59, 7. Reports): an is_test agency (D-61) with one
// business, one competitor, one open fix and one scan whose answers name the business in 2 of 3.
export const service = createServiceClient();
const userIds: string[] = [];

export async function deleteTestUsers() {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
}

export const tokenOf = (path: string) => path.replace(/^\/r\//, "");

export async function createOwner() {
  const email = `vitest-reports-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Northside Marketing", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.id,
      name: "Sunrise Coffee Bar",
      status: "active",
      industry: "coffee_shop",
      primary_city: "Springfield",
      primary_region: "IL",
      places_id: "ChIJ-fixture-sunrise-coffee",
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single()
    .throwOnError();
  await service
    .from("business_competitors")
    .insert({ business_id: business.id, name: "Bean House", places_id: "ChIJ-fixture-bean-house", source: "confirmed_place", confirmed: true, created_at: new Date(Date.now() - 2 * 86_400_000).toISOString() })
    .throwOnError();
  await service
    .from("opportunities")
    .insert({ business_id: business.id, title: "Add your opening hours to your website", impact: "high", status: "open", category: "local_presence" })
    .throwOnError();
  const { data: run } = await service
    .from("visibility_runs")
    .insert({ business_id: business.id, provider: "scan", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  // Only answers to suggested questions count in the score (BUG-129).
  const { data: question } = await service
    .from("tracked_prompts")
    .insert({ business_id: business.id, prompt: "Best coffee shop in Springfield, IL?", source: "library" })
    .select("id")
    .single()
    .throwOnError();
  await service
    .from("visibility_results")
    .insert(
      [0, 1, 2].map((i) => ({
        run_id: run.id,
        business_id: business.id,
        tracked_prompt_id: question.id,
        provider: ["openai", "anthropic", "perplexity"][i],
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
        business_mentioned: i !== 1,
        competitors_mentioned: [{ name: "Bean House", position: 1 }],
        cached: false,
        answer_text: `answer ${i}`,
      })),
    )
    .throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { agencyId: agency.id, businessId: business.id, userId: data.user.id, client };
}
