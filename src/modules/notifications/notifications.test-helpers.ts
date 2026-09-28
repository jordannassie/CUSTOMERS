import { randomBytes, randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { captureCredit, grantCredits, holdCredits, releaseHold } from "@/modules/credits";
import { sendEmail, type EmailClient, type SendEmailInput } from "@/modules/email";

// Local database set-up for the B-62 email tests. A fake mail client stands in for Resend.
export const service = createServiceClient();
const userIds: string[] = [];
const DAY = 86_400_000;

export async function deleteTestUsers() {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
}

export async function createAgency(opts: { status?: string; weeklyReport?: boolean } = {}) {
  const email = `vitest-notify-${randomUUID()}@example.test`;
  const { data: user, error } = await service.auth.admin.createUser({ email, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({
      owner_user_id: user.user.id,
      name: "Notify test",
      is_test: true,
      status: opts.status ?? "active",
      weekly_report_emails: opts.weeklyReport ?? true,
    })
    .select("id")
    .single()
    .throwOnError();
  return { agencyId: agency.id, ownerId: user.user.id, email };
}

export async function addBusiness(agency: { agencyId: string; ownerId: string }, name: string, opts: { scored?: boolean } = {}) {
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: agency.ownerId, agency_id: agency.agencyId, name, status: "active", models: ["openai", "anthropic", "perplexity"] })
    .select("id")
    .single()
    .throwOnError();
  if (opts.scored) {
    const { data: run } = await service
      .from("visibility_runs")
      .insert({ business_id: business.id, provider: "scan", status: "completed" })
      .select("id")
      .single()
      .throwOnError();
    await service
      .from("visibility_results")
      .insert(
        ["openai", "anthropic", "perplexity"].map((provider, i) => ({
          run_id: run.id,
          business_id: business.id,
          provider,
          created_at: new Date(Date.now() - 3_600_000).toISOString(),
          business_mentioned: i !== 1,
          competitors_mentioned: [],
          cached: false,
          answer_text: `answer ${i}`,
        })),
      )
      .throwOnError();
    await service
      .from("opportunities")
      .insert({ business_id: business.id, title: "Add your opening hours to your website", impact: "high", status: "open", category: "local_presence" })
      .throwOnError();
  }
  return business.id;
}

export async function grantPlan(agencyId: string, amount: number, expiresAt = new Date(Date.now() + 20 * DAY)) {
  await grantCredits({ agencyId, source: "plan", sourceId: `in_line_${randomUUID()}`, amount, expiresAt });
  return expiresAt;
}

/** Spends credits the way a scan does: hold, capture one per check, then (optionally) release the rest. */
export async function spend(agency: { agencyId: string }, businessId: string, hold: number, capture: number, release = true) {
  const { data: job } = await service
    .from("scan_jobs")
    .insert({ agency_id: agency.agencyId, business_id: businessId })
    .select("id")
    .single()
    .throwOnError();
  const holdId = await holdCredits(agency.agencyId, hold, job.id);
  for (let i = 0; i < capture; i++) await captureCredit(holdId, randomUUID());
  if (release) {
    await releaseHold(holdId);
    // One active job per business, so the next spend can start its own.
    await service.from("scan_jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", job.id).throwOnError();
  }
  return holdId;
}

export function fakeMail() {
  const sent: { to: string; subject: string; html: string; text: string }[] = [];
  const client: EmailClient = {
    send: async (email) => {
      sent.push(email);
      return { id: `re_${sent.length}` };
    },
  };
  const settings = { from: "Customers.Direct <hello@mail.example>", baseUrl: "https://app.example", unsubscribeSecret: randomBytes(32).toString("hex") };
  return { sent, send: (input: SendEmailInput) => sendEmail(input, { client, settings }) };
}
