import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  blockedPathFor,
  getCurrentAgency,
  isAgencyPaused,
  isCurrentUserAdmin,
  requireUser,
  type GuardOptions,
} from "@/modules/auth";
import { getUsage } from "@/modules/credits";
import type { AccountState, UsageNumbers } from "./service";

export type WorkspaceBusiness = {
  id: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  status: string;
};

export type Workspace = {
  businesses: WorkspaceBusiness[];
  activeBusinessId: string | null;
  isAdmin: boolean;
  /** Null until onboarding creates the agency. */
  account: AccountState | null;
  usage: UsageNumbers | null;
};

// Businesses are matched on owner_user_id, like getPrimaryBusiness, so the frame and the pages agree.
export async function getWorkspace(options: GuardOptions = {}): Promise<Workspace> {
  const user = await requireUser(options);
  const agency = await getCurrentAgency();
  if (agency && isAgencyPaused(agency.status) && options.next !== undefined) redirect(blockedPathFor(agency.status));

  const supabase = await createClient();
  const [businesses, profile, agencyDates, isAdmin, usage] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, domain, logo_url, status")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("active_business_id").eq("id", user.id).maybeSingle(),
    agency
      ? supabase.from("agencies").select("trial_ends_at, current_period_end").eq("id", agency.id).single()
      : null,
    isCurrentUserAdmin(),
    agency ? getUsage(agency.id) : null,
  ]);
  if (businesses.error) throw new Error(`Could not load businesses: ${businesses.error.message}`);
  if (agencyDates?.error) throw new Error(`Could not load agency: ${agencyDates.error.message}`);
  if (profile.error) throw new Error(`Could not load profile: ${profile.error.message}`);

  const list = businesses.data.map((b) => ({
    id: b.id,
    name: b.name,
    domain: b.domain,
    logoUrl: b.logo_url,
    status: b.status,
  }));
  const wanted = profile.data?.active_business_id;
  const active = list.find((b) => b.id === wanted) ?? list[0] ?? null;
  const dates = agencyDates?.data;

  return {
    businesses: list,
    activeBusinessId: active?.id ?? null,
    isAdmin,
    account:
      agency && dates
        ? {
            status: agency.status,
            trialEndsAt: dates.trial_ends_at ? new Date(dates.trial_ends_at) : null,
            periodEndsAt: dates.current_period_end ? new Date(dates.current_period_end) : null,
          }
        : null,
    usage,
  };
}

/** False when the business is not the user's. */
export async function setActiveBusiness(businessId: string): Promise<boolean> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!business) return false;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ active_business_id: businessId })
    .eq("id", user.id);
  if (updateError) throw new Error(`Could not switch business: ${updateError.message}`);
  return true;
}
