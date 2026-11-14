import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import { allRows } from "../../businesses/dal";
import type { AdminStripeClient } from "../../agencies/stripe";
import { overdueBefore, scheduledTestFlags, type Revenue } from "../service";

// The Overview's side reads (overdue scans, Stripe revenue), split from ../dal.ts to keep both short. loadOverview
// (../dal.ts) runs requireAdmin() before calling any of them.

type Db = ReturnType<typeof createServiceClient>;

export type OverdueScans = { count: number; businesses: { id: string; name: string; dueAt: string }[] };

const OVERDUE_SHOWN = 5;

/**
 * Live businesses of agencies on trial or paying whose next scheduled scan is more than a day past (OVERDUE_HOURS),
 * among the agencies the scheduler includes (test only before the go-live switch). Null when there are none, or when
 * the setting cannot be read: this is a hint on the Overview, never a reason for the page to fail.
 */
export async function loadOverdueScans(db: Db, now: Date, shown: boolean[]): Promise<OverdueScans | null> {
  const settings = await db.rpc("job_settings_status").maybeSingle();
  if (settings.error || !settings.data) return null;
  const flags = scheduledTestFlags(settings.data.scheduled_scans_include_real, shown);
  if (flags.length === 0) return null;
  const { data, count, error } = await db
    .from("businesses")
    .select("id, name, next_scan_at, agencies!inner(is_test, status)", { count: "exact" })
    .is("deleted_at", null)
    .lt("next_scan_at", overdueBefore(now).toISOString())
    .in("agencies.is_test", flags)
    .in("agencies.status", ["active", "trialing"])
    .order("next_scan_at", { ascending: true })
    .limit(OVERDUE_SHOWN);
  if (error) {
    console.error("Admin overview: could not check overdue scans", error);
    return null;
  }
  if (!count) return null;
  return { count, businesses: data.map((b) => ({ id: b.id, name: b.name, dueAt: b.next_scan_at ?? "" })) };
}

/**
 * Stripe customer ids of test agencies, so revenue can leave them out like every other Overview number. An agency
 * already purged is gone from the table, so its old payments still count; that is rare and only ever a test account.
 */
export async function testCustomerIds(db: Db): Promise<string[]> {
  const rows = await allRows("test agencies' Stripe customers", (from, to) =>
    db.from("agencies").select("stripe_customer_id").eq("is_test", true).not("stripe_customer_id", "is", null).order("id").range(from, to),
  );
  return rows.map((r) => r.stripe_customer_id).filter((id): id is string => id !== null);
}

export async function revenueSince(stripe: AdminStripeClient | null, since: Date, excludeCustomers: string[]): Promise<Revenue> {
  if (!stripe) return { state: "not_connected" };
  try {
    return { state: "ok", cents: await stripe.revenueSince(since, undefined, excludeCustomers), mode: stripe.mode };
  } catch (error) {
    console.error("Admin overview: Stripe revenue failed", error);
    return { state: "error" };
  }
}
