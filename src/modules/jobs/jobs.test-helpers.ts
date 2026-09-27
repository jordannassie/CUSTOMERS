import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits } from "@/modules/credits";

// Set-up for the worker tests, run against the local database. Every agency is is_test, so scans use
// recorded answers and no test can reach a real AI provider (D-61).
export const service = createServiceClient();
const userIds: string[] = [];

// Above anything other tests or dev data queue, so the worker claims these jobs first.
export const TEST_PRIORITY = 1_000_000;

export type TestJob = { jobId: string; agencyId: string; businessId: string };

export async function createTestAgency(credits = 100) {
  const email = `vitest-jobs-${randomUUID()}@example.test`;
  const { data: user, error } = await service.auth.admin.createUser({ email, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency, error: agencyError } = await service
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Jobs test", is_test: true, status: "active" })
    .select("id")
    .single();
  if (agencyError) throw agencyError;
  await grantCredits({ agencyId: agency.id, source: "topup", sourceId: `cs-${randomUUID()}`, amount: credits, expiresAt: null });
  return { agencyId: agency.id, ownerUserId: user.user.id };
}

/** A business with 12 questions on all three models, and a queued job for it. */
export async function queueTestJob(agency: { agencyId: string; ownerUserId: string }): Promise<TestJob> {
  const city = `Jobville ${randomUUID().slice(0, 8)}`;
  const { data: business, error } = await service
    .from("businesses")
    .insert({
      owner_user_id: agency.ownerUserId,
      agency_id: agency.agencyId,
      name: "Bean There Coffee",
      domain: "beanthere.example",
      primary_city: city,
      primary_region: "CA",
      primary_country: "United States",
      scan_frequency: "weekly",
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single();
  if (error) throw error;
  const prompts = Array.from({ length: 12 }, (_, i) => ({ business_id: business.id, prompt: `Question ${i + 1}: best coffee shop in ${city}?` }));
  const inserted = await service.from("tracked_prompts").insert(prompts);
  if (inserted.error) throw inserted.error;
  const { data: job, error: jobError } = await service
    .from("scan_jobs")
    .insert({ agency_id: agency.agencyId, business_id: business.id, priority: TEST_PRIORITY })
    .select("id")
    .single();
  if (jobError) throw jobError;
  return { jobId: job.id, agencyId: agency.agencyId, businessId: business.id };
}

export async function readJob(jobId: string) {
  const { data, error } = await service
    .from("scan_jobs")
    .select("status, attempts, error, credits_charged, run_after, hold_id, finished_at")
    .eq("id", jobId)
    .single();
  if (error) throw error;
  return data;
}

/** Recorded answers that mention the business, one per model. */
export function recordedDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "jobs-ai-answers-"));
  for (const provider of ["openai", "anthropic", "perplexity"]) {
    const answer = {
      provider,
      question: "best coffee shop in Orange, CA",
      answerText: "Top picks:\n1. Bean There Coffee (beanthere.example)\n2. Daily Grind",
      citations: [],
      names: ["Bean There Coffee", "Daily Grind"],
    };
    writeFileSync(path.join(dir, `${provider}-coffee.json`), JSON.stringify(answer));
  }
  return dir;
}

/** No recorded answers at all, so every check of a test agency fails. */
export function emptyRecordedDir(): string {
  return mkdtempSync(path.join(tmpdir(), "jobs-no-answers-"));
}

export async function deleteTestUsers() {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
}
