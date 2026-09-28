import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/types/geo";

/**
 * Returns the business the dashboard should currently show for the signed-in
 * user: their `profiles.active_business_id` if set and still owned by them,
 * otherwise their most recently created business (original V1 behavior, and
 * the fallback for every user who has never switched/added a second
 * business, so this is a no-op change for the common single-business case).
 */
export async function getPrimaryBusiness(): Promise<Business | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Lazy profile upsert: if the auth trigger silently failed (e.g. database
  // quota exhaustion during signup), create the profile row now so the user
  // can proceed normally without needing to re-register.
  let profile: { active_business_id: string | null } | null = null;
  try {
    const upsertResult = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          full_name: (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined,
          avatar_url: user.user_metadata?.avatar_url as string | undefined,
        },
        { onConflict: "id", ignoreDuplicates: true }
      )
      .select("active_business_id")
      .maybeSingle();
    profile = upsertResult.data;
  } catch {
    // Upsert failed (e.g. quota); try a plain read instead
    try {
      const readResult = await supabase
        .from("profiles")
        .select("active_business_id")
        .eq("id", user.id)
        .maybeSingle();
      profile = readResult.data;
    } catch {
      profile = null;
    }
  }

  if (profile?.active_business_id) {
    const { data: active } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.active_business_id)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (active) return active as Business;
    // active_business_id points at a business that's gone or no longer
    // theirs (e.g. deleted); fall through to the most-recent fallback below.
  }

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Business) ?? null;
}
