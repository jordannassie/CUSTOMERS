import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import type { Database } from "@/types/database.types";
import { unsubscribeTokenInput, type EmailPreferences, type EmailType, type UnsubscribeTopic } from "./schema";
import { verifyUnsubscribeToken } from "./service";

type Db = SupabaseClient<Database>;

export type EmailSettings = { from: string; baseUrl: string; unsubscribeSecret: string | null };

export function getEmailSettings(): EmailSettings {
  if (!env.EMAIL_FROM) throw new Error("Email is not configured. Set EMAIL_FROM.");
  // The configured address, the same one Stripe and login links use (BUG-283); throws when none is set.
  return { from: env.EMAIL_FROM, baseUrl: appUrl(), unsubscribeSecret: env.EMAIL_UNSUBSCRIBE_SECRET ?? null };
}

/** The agency and topic behind an unsubscribe link, or null for a bad, forged or unconfigured token. */
export function readUnsubscribeToken(raw: unknown): { agencyId: string; topic: UnsubscribeTopic } | null {
  const token = unsubscribeTokenInput.safeParse(raw);
  if (!token.success || !env.EMAIL_UNSUBSCRIBE_SECRET) return null;
  return verifyUnsubscribeToken(token.data, env.EMAIL_UNSUBSCRIBE_SECRET);
}

export type EmailLogRow = {
  type: EmailType;
  agencyId: string | null;
  to: string;
  status: "sent" | "failed" | "skipped";
  providerId?: string | null;
  error?: string | null;
  idempotencyKey?: string | null;
};

/** email_log reads and writes for send.ts, with the service role (the table has no user policies). */
export type EmailStore = {
  hasSent(idempotencyKey: string): Promise<boolean>;
  record(row: EmailLogRow): Promise<void>;
  wantsEmail(agencyId: string, topic: UnsubscribeTopic): Promise<boolean>;
};

export function createEmailStore(db: Db = createServiceClient()): EmailStore {
  return {
    async hasSent(idempotencyKey) {
      const { count, error } = await db
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("idempotency_key", idempotencyKey)
        .eq("status", "sent");
      if (error) throw new Error(`email_log lookup failed: ${error.message}`);
      return (count ?? 0) > 0;
    },

    async record(row) {
      const { error } = await db.from("email_log").insert({
        type: row.type,
        agency_id: row.agencyId,
        to_email: row.to,
        status: row.status,
        provider_id: row.providerId ?? null,
        error: row.error?.slice(0, 1000) ?? null,
        idempotency_key: row.idempotencyKey ?? null,
      });
      // 23505: a parallel send already logged this key as sent; Resend's idempotency key kept it to one email.
      if (error && error.code !== "23505") throw new Error(`email_log insert failed: ${error.message}`);
    },

    async wantsEmail(agencyId, topic) {
      const { data, error } = await db.from("agencies").select("weekly_report_emails").eq("id", agencyId).maybeSingle();
      if (error) throw new Error(`Could not load email preferences: ${error.message}`);
      return topic === "weekly_report" ? (data?.weekly_report_emails ?? false) : false;
    },
  };
}

/**
 * Where each idempotency key stands, so a cron job can pass over the handled ones before doing any work and leave the
 * ones that failed last time until the end. handled: a sent or skipped row (skipped includes "nothing to report").
 * tried: only failed rows, such as a run that ran out of time on that agency.
 */
export async function findEmailKeyStates(keys: string[], db: Db = createServiceClient()): Promise<{ handled: Set<string>; tried: Set<string> }> {
  const handled = new Set<string>();
  const tried = new Set<string>();
  if (keys.length === 0) return { handled, tried };
  const { data, error } = await db
    .from("email_log")
    .select("idempotency_key, status")
    .in("idempotency_key", keys)
    .in("status", ["sent", "skipped", "failed"]);
  if (error) throw new Error(`email_log lookup failed: ${error.message}`);
  for (const row of data) {
    if (!row.idempotency_key) continue;
    (row.status === "failed" ? tried : handled).add(row.idempotency_key);
  }
  for (const key of handled) tried.delete(key);
  return { handled, tried };
}

/** Which of these idempotency keys already have a sent or skipped email. */
export async function findHandledEmailKeys(keys: string[], db: Db = createServiceClient()): Promise<Set<string>> {
  return (await findEmailKeyStates(keys, db)).handled;
}

/**
 * Logs a cron email that was not sent, under its key: "skipped" (nothing to report) marks the key handled for good;
 * "failed" (out of time) only puts the agency last on the next run.
 */
export async function recordUnsentEmail(
  row: { type: EmailType; agencyId: string; to: string; idempotencyKey: string; status: "skipped" | "failed"; reason: string },
  db: Db = createServiceClient(),
): Promise<void> {
  await createEmailStore(db).record({ type: row.type, agencyId: row.agencyId, to: row.to, status: row.status, error: row.reason, idempotencyKey: row.idempotencyKey });
}

/** Called by the public unsubscribe route after the signed token is checked. False when the agency is gone. */
export async function unsubscribeAgency(agencyId: string, topic: UnsubscribeTopic, db: Db = createServiceClient()): Promise<boolean> {
  const column = { weekly_report: "weekly_report_emails" } as const;
  const { data, error } = await db
    .from("agencies")
    .update({ [column[topic]]: false })
    .eq("id", agencyId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Could not unsubscribe: ${error.message}`);
  return !!data;
}

export async function getMyEmailPreferences(): Promise<EmailPreferences> {
  const { agency } = await requireAgency();
  const { data, error } = await createServiceClient()
    .from("agencies")
    .select("weekly_report_emails")
    .eq("id", agency.id)
    .single();
  if (error) throw new Error(`Could not load email preferences: ${error.message}`);
  return { weeklyReport: data.weekly_report_emails };
}

// Agencies have no update policy for signed-in users, so this writes with the service client
// after requireAgency() has matched the row to the current user.
export async function updateMyEmailPreferences(prefs: EmailPreferences): Promise<void> {
  const { agency } = await requireAgency();
  const { error } = await createServiceClient()
    .from("agencies")
    .update({ weekly_report_emails: prefs.weeklyReport })
    .eq("id", agency.id);
  if (error) throw new Error(`Could not save email preferences: ${error.message}`);
}
