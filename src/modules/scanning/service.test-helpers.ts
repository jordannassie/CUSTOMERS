import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits } from "@/modules/credits";
import { CHECK_MODELS } from "./providers/models";
import { ProviderError } from "./providers/request";
import type { CheckResult, ProviderId, RunCheck } from "./providers/types";

// Set-up for the scan tests, run against the local database. No test reaches a real AI provider.
export const service = createServiceClient();
const userIds: string[] = [];

export type TestBusiness = { agencyId: string; businessId: string; city: string; questions: string[] };

export async function createScanAgency(opts: { isTest?: boolean; status?: string; credits?: number } = {}) {
  const email = `vitest-scan-${randomUUID()}@example.test`;
  const { data: user, error } = await service.auth.admin.createUser({ email, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency, error: agencyError } = await service
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Scan test", is_test: opts.isTest ?? false, status: opts.status ?? "active" })
    .select("id")
    .single();
  if (agencyError) throw agencyError;
  if (opts.credits !== 0) {
    await grantCredits({ agencyId: agency.id, source: "topup", sourceId: `cs-${randomUUID()}`, amount: opts.credits ?? 100, expiresAt: null });
  }
  return { agencyId: agency.id, ownerUserId: user.user.id };
}

/** A coffee shop with 12 questions on all three models, in a city no other test uses (the cache is shared). */
export async function createScanBusiness(
  agency: { agencyId: string; ownerUserId: string },
  city = `Testville ${randomUUID().slice(0, 8)}`,
): Promise<TestBusiness> {
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
  const questions = Array.from({ length: 12 }, (_, i) => `Question ${i + 1}: best coffee shop in ${city}?`);
  const prompts = await service.from("tracked_prompts").insert(questions.map((prompt) => ({ business_id: business.id, prompt })));
  if (prompts.error) throw prompts.error;
  const rivals = await service.from("business_competitors").insert({ business_id: business.id, name: "Rival Roasters", city });
  if (rivals.error) throw rivals.error;
  return { agencyId: agency.agencyId, businessId: business.id, city, questions };
}

export async function newJob(b: TestBusiness): Promise<string> {
  const { data, error } = await service
    .from("scan_jobs")
    .insert({ agency_id: b.agencyId, business_id: b.businessId, status: "running" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function finishJob(jobId: string) {
  await service.from("scan_jobs").update({ status: "done" }).eq("id", jobId);
}

export const ANSWER = "Top picks:\n1. Bean There Coffee (beanthere.example)\n2. Rival Roasters\n3. Daily Grind";

/** A provider that answers every question, counting its calls. */
export function answeringRunner(provider: ProviderId) {
  const run = vi.fn<RunCheck>(
    async (): Promise<CheckResult> => ({
      answerText: ANSWER,
      citations: [{ url: "https://beanthere.example/", title: "Bean There" }],
      model: CHECK_MODELS[provider],
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, searchCalls: 1 },
      costUsd: 0.01,
      latencyMs: 5,
    }),
  );
  return run;
}

/** A provider that fails every check after its retries. */
export function failingRunner(provider: ProviderId): RunCheck {
  return async () => {
    throw new ProviderError({ provider, kind: "server", status: 503, attempts: 3, message: `${provider} returned 503` });
  };
}

export const extractNames = vi.fn(async () => ({
  promptVersion: "extract-names.v1",
  model: "claude-haiku-4-5",
  names: [
    { name: "Bean There Coffee", position: 1 },
    { name: "Rival Roasters", position: 2 },
    { name: "Daily Grind", position: 3 },
  ],
  usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 10, searchCalls: 0 },
  costUsd: 0.0001,
}));

/** One recorded answer per model, none matching the test questions, so the fallback pick is used. */
export function recordedDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-answers-"));
  for (const provider of ["openai", "anthropic", "perplexity"]) {
    const answer = { provider, question: "best coffee shop in Orange, CA", answerText: ANSWER, citations: [], names: ["Daily Grind"] };
    writeFileSync(path.join(dir, `${provider}-coffee.json`), JSON.stringify(answer));
  }
  return dir;
}

const AI_HOSTS = ["api.openai.com", "api.anthropic.com", "api.perplexity.ai"];

/** Blocks every AI provider host and counts attempts; the database still goes through. */
export function blockAiHosts() {
  const attempts: string[] = [];
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (AI_HOSTS.some((host) => new URL(url).hostname === host)) {
      attempts.push(url);
      throw new Error(`Blocked AI call to ${url}`);
    }
    return realFetch(input, init);
  });
  return attempts;
}

export async function deleteScanUsers() {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
}
