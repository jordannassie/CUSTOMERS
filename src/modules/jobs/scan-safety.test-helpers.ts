import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { getBalance } from "@/modules/credits";
import { runScan } from "@/modules/scanning";
import { finishJob, type ClaimedJob } from "./dal";
import { createTestAgency, recordedDir, service } from "./jobs.test-helpers";
import { jobUpdateFor } from "./worker";

// Shared set-up for the Step 2 safety tests (migration 050). Test agencies and recorded answers only (D-61).
export const DAY = 86_400_000;
export const days = (n: number) => new Date(Date.now() + n * DAY).toISOString();
export type Agency = Awaited<ReturnType<typeof createTestAgency>>;

export const balanceOf = async (agencyId: string) => (await getBalance(agencyId)).balance;
export const hold = async (id: string) => (await service.from("credit_holds").select("status, amount, captured, released").eq("id", id).single().throwOnError()).data;
export const jobsOf = async (businessId: string) => (await service.from("scan_jobs").select("id, status").eq("business_id", businessId)).data ?? [];

export async function business(agency: Agency, fields: Record<string, unknown> = {}, questions = 3) {
  const city = `Safetyville ${randomUUID().slice(0, 6)}`;
  const { data } = await service
    .from("businesses")
    .insert({
      owner_user_id: agency.ownerUserId, agency_id: agency.agencyId, name: "Bean There Coffee",
      // Its own website: migration 067 refuses two live businesses with one website in an agency.
      domain: `beanthere-${randomUUID().slice(0, 8)}.example`,
      primary_city: city, primary_region: "CA", primary_country: "United States", status: "active", scan_frequency: "weekly",
      models: ["openai", "anthropic", "perplexity"], ...fields,
    })
    .select("id")
    .single()
    .throwOnError();
  if (questions > 0) {
    await service.from("tracked_prompts").insert(Array.from({ length: questions }, (_, i) => ({ business_id: data.id, prompt: `Q${i} best coffee in ${city}?` }))).throwOnError();
  }
  return data.id as string;
}

/** A job the worker holds: running on its first attempt. */
export async function runningJob(agency: Agency, businessId: string, attempts = 1) {
  const { data } = await service
    .from("scan_jobs")
    .insert({ agency_id: agency.agencyId, business_id: businessId, status: "running", attempts, locked_at: new Date().toISOString() })
    .select("id")
    .single()
    .throwOnError();
  return { id: data.id as string, attempts, creditsCharged: 0 } satisfies ClaimedJob;
}

/** What the worker does with one claimed job. */
export async function runLikeWorker(job: ClaimedJob, dir = recordedDir()) {
  const outcome = await runScan(job.id, { recordedDir: dir });
  const update = jobUpdateFor(outcome, job, new Date());
  expect(await finishJob(job, update, new Date())).toBe(true);
  return { outcome, update };
}

